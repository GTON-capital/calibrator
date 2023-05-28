// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/math/Math.sol";

/// @title Calculates steps required for pool ratio calibration
/// @author Anton Davydov
library Calculate {
    /// @notice Calculate amount of liquidity tokens that should be
    /// removed from the pool to reach minimum reserve value
    /// @param reserve The size of token reserve in the pool
    /// @param minimum The size of token reserve after liquidity removal
    /// @param availableLiquidity The amount of owned liquidity provider tokens
    /// @param totalSupply Total amount of liquidity provider tokens
    /// @return leftoverLiquidity Amount of liquidity tokens left after removal
    /// @return removedLiquidity Amount of liquidity tokens to remove
    function removeLiquidity(
        uint256 reserve,
        uint256 minimum,
        uint256 availableLiquidity,
        uint256 totalSupply
    )
        internal
        pure
        returns (uint256 leftoverLiquidity, uint256 removedLiquidity)
    {
        leftoverLiquidity = Math.mulDiv(totalSupply, minimum, reserve);

        require(
            availableLiquidity >= leftoverLiquidity,
            "removeLiquidity: INSUFFICIENT_LIQUIDITY"
        );

        removedLiquidity = availableLiquidity - leftoverLiquidity;
    }

    /// @notice Calculate amount of tokens that will be swapped
    /// @param reserveBase The size of base token reserve in the pool
    /// @param reserveQuote The size of quote token reserve in the pool
    /// @param targetBase The number of base parts in target ratio
    /// @param targetQuote The number of quote parts in target ratio
    /// @param feeNumerator The top of a fraction that represents swap size minus fees
    /// @param feeDenominator The bottom of a fraction that represents swap size minus fees
    /// @return baseToQuote Whether to sell base and buy quote, or vice versa, trading direction
    /// @return amountIn The amount of tokens that will be sold
    /// @return amountOut The amount of tokens that will be bought
    function swapToRatio(
        uint256 reserveBase,
        uint256 reserveQuote,
        uint256 targetBase,
        uint256 targetQuote,
        uint256 feeNumerator,
        uint256 feeDenominator
    )
        internal
        pure
        returns (bool baseToQuote, uint256 amountIn, uint256 amountOut)
    {
        // estimate base reserve after ratio change
        // multiply by 1000 for more precise division
        // for cases when target ratio would round to the same quotient as reserve ratio
        uint256 reserveBaseDesired = Math.mulDiv(
            targetBase * 1000,
            reserveQuote,
            targetQuote
        );

        // if base reserve is estimated to remain unchanged, cancel the swap
        if (reserveBaseDesired == reserveBase * 1000) {
            return (false, 0, 0);
        }

        // if base reserve is estimated to grow, sell base
        // otherwise, sell quote
        baseToQuote = reserveBaseDesired > reserveBase * 1000;

        (uint256 targetIn, uint256 targetOut) = baseToQuote
            ? (targetBase, targetQuote)
            : (targetQuote, targetBase);

        // Future reserve `Ra` of token `a` required to move the market to desired price P
        // can be found using future reserve `Rb` of token `b` and constant product `k`
        // P=Rb/Ra; Rb=Ra*P
        // k=Ra*Rb; Rb=k/Ra
        // Ra*P=k/Ra
        // Ra^2=k*(1/P)
        // Ra=(k*(1/P))^1/2
        uint256 reserveInOptimal = Math.sqrt(
            Math.mulDiv(
                reserveBase * reserveQuote, // invariant, k
                targetIn, // target ratio is reversed here because of 1/P
                targetOut
            )
        );

        (uint256 reserveIn, uint256 reserveOut) = baseToQuote
            ? (reserveBase, reserveQuote)
            : (reserveQuote, reserveBase);

        // if base reserve remains unchanged, cancel the swap
        if (reserveInOptimal == reserveIn) {
            return (false, 0, 0);
        }

        // happens when target ratio rounds
        // to a larger quotient than reserve ratio
        // likely due to precision errors in division and sqrt
        require(reserveInOptimal > reserveIn, "swapToRatio: rounding error");

        amountIn = reserveInOptimal - reserveIn;

        amountOut = getAmountOut(
            amountIn,
            reserveIn,
            reserveOut,
            feeNumerator,
            feeDenominator
        );
    }

    /// @notice Calculate the size of token liquidity required to reach invariant base reserve
    /// @param reserveBase The size of base token reserve in the pool
    /// @param reserveQuote The size of quote token reserve in the pool
    /// @param reserveBaseInvariant The target size of base reserve
    /// @return amountBaseDesired Required amount of base tokens
    /// @return amountQuoteOptimal Required amount of quote tokens
    function addLiquidity(
        uint256 reserveBase,
        uint256 reserveQuote,
        uint256 reserveBaseInvariant
    )
        internal
        pure
        returns (uint256 amountBaseDesired, uint256 amountQuoteOptimal)
    {
        // assume that reserveBase is always smaller than invariant after removeLiqudity
        amountBaseDesired = reserveBaseInvariant - reserveBase;

        amountQuoteOptimal = Math.mulDiv(
            amountBaseDesired,
            reserveQuote,
            reserveBase
        );
    }

    /// @notice Check if the difference between pool and target ratios
    /// is smaller than acceptable margin of error
    /// @param reserveBase The size of base token reserve in the pool
    /// @param reserveQuote The size of quote token reserve in the pool
    /// @param targetBase The number of base parts in target ratio
    /// @param targetQuote The number of quote parts in target ratio
    /// @param precisionNumerator The top of a fraction that represents the acceptable margin of error
    /// @param precisionDenominator The bottom of a fraction that represents the acceptable margin of error
    /// @return isPrecise Difference between ratios is smaller than the acceptable margin of error
    function checkPrecision(
        uint256 reserveBase,
        uint256 reserveQuote,
        uint256 targetBase,
        uint256 targetQuote,
        uint256 precisionNumerator,
        uint256 precisionDenominator
    ) internal pure returns (bool) {
        (
            uint256 reserveA,
            uint256 reserveB,
            uint256 targetA,
            uint256 targetB
        ) = reserveBase > reserveQuote
                ? (reserveBase, reserveQuote, targetBase, targetQuote)
                : (reserveQuote, reserveBase, targetQuote, targetBase);

        // if target ratio is reverse, not precise
        if (targetB > targetA) return false;

        // reserve ratio parts to number of decimal places specified in precisionDenominator
        uint256 reserveRatioDP = Math.mulDiv(
            reserveA,
            precisionDenominator,
            reserveB
        );

        // target ratio parts to number of decimal places specified in precisionDenominator
        uint256 targetRatioDP = Math.mulDiv(
            targetA,
            precisionDenominator,
            targetB
        );

        uint256 lowerBound = targetRatioDP > precisionNumerator
            ? targetRatioDP - precisionNumerator
            : 0;

        uint256 upperBound = targetRatioDP + precisionNumerator;

        // if precision is 1/1000, then reserveRatioDP==targetRatioDP+-0.001
        return lowerBound <= reserveRatioDP && reserveRatioDP <= upperBound;
    }

    /// @notice Calculate the maximum output amount of the asset being bought
    /// @param amountIn The amount of tokens sold
    /// @param reserveIn The reserve size of the token being sold
    /// @param reserveOut The reserve size of the token being bought
    /// @param feeNumerator The top of a fraction that represents swap size minus fees
    /// @param feeDenominator The bottom of a fraction that represents swap size minus fees
    /// @return amountOut The amount of tokens bought
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut,
        uint256 feeNumerator,
        uint256 feeDenominator
    ) internal pure returns (uint256 amountOut) {
        require(amountIn > 0, "getAmountOut: INSUFFICIENT_INPUT_AMOUNT");

        require(
            reserveIn > 0 && reserveOut > 0,
            "getAmountOut: INSUFFICIENT_LIQUIDITY"
        );

        uint256 amountInWithFee = amountIn * feeNumerator;

        uint256 numerator = amountInWithFee * reserveOut;

        uint256 denominator = (reserveIn * feeDenominator) + amountInWithFee;

        amountOut = numerator / denominator;
    }
}

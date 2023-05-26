// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/math/Math.sol";

library Calculate {
    function removeLiquidity(
        uint256 reserveBaseInvariant,
        uint256 minimumBase,
        uint256 availableLiquidity,
        uint256 totalSupply
    )
        internal
        pure
        returns (uint256 minimumLiquidity, uint256 removedLiquidity)
    {
        minimumLiquidity = Math.mulDiv(
            totalSupply,
            minimumBase,
            reserveBaseInvariant
        );

        require(
            availableLiquidity >= minimumLiquidity,
            "removeLiquidity: INSUFFICIENT_LIQUIDITY"
        );

        removedLiquidity = availableLiquidity - minimumLiquidity;
    }

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
        // multiply by 1000 so that targetRatio doesn't round the same as reserveRatio
        uint256 reserveBaseDesired = Math.mulDiv(targetBase * 1000, reserveQuote, targetQuote);

        if (reserveBaseDesired == reserveBase * 1000) {
            return (false, 0, 0);
        }

        baseToQuote = reserveBaseDesired > reserveBase * 1000;

        (uint256 targetIn, uint256 targetOut) = baseToQuote
            ? (targetBase, targetQuote)
            : (targetQuote, targetBase);

        uint256 reserveInOptimal = Math.sqrt(
            Math.mulDiv(
                reserveBase * reserveQuote, // invariant, K
                targetIn,
                targetOut
            )
        );

        (uint256 reserveIn, uint256 reserveOut) = baseToQuote
            ? (reserveBase, reserveQuote)
            : (reserveQuote, reserveBase);

        if (reserveInOptimal == reserveIn) {
            return (false, 0, 0);
        }

        // happens when reverse target ratio rounds
        // to a larger quotient than reverse reserve ratio
        // due to precision errors in division and sqrt
        require(reserveInOptimal > reserveIn, "swapToRatio: reserveInOptimal<reserveIn");

        amountIn = reserveInOptimal - reserveIn;

        amountOut = getAmountOut(
            amountIn,
            reserveIn,
            reserveOut,
            feeNumerator,
            feeDenominator
        );
    }

    function addLiquidity(
        uint256 reserveBase,
        uint256 reserveQuote,
        uint256 reserveBaseInvariant
    )
        internal
        pure
        returns (uint256 amountBaseDesired, uint256 amountQuoteOptimal)
    {
        amountBaseDesired = reserveBaseInvariant - reserveBase;

        amountQuoteOptimal = Math.mulDiv(
            amountBaseDesired,
            reserveQuote,
            reserveBase
        );
    }

    function checkPrecision(
        uint256 reserveBase,
        uint256 reserveQuote,
        uint256 targetBase,
        uint256 targetQuote,
        uint256 precisionNumerator,
        uint256 precisionDenominator
    ) internal pure returns (bool) {
        // base ratio to number of decimal places specified in precisionDenominator
        uint256 ratioBaseDP = Math.mulDiv(
            reserveBase,
            targetQuote * precisionDenominator,
            reserveQuote
        );

        uint256 targetBaseDP = targetBase * precisionDenominator;

        uint256 lowerBound = targetBaseDP > precisionNumerator
            ? targetBaseDP - precisionNumerator
            : 0;

        uint256 upperBound = targetBaseDP + precisionNumerator;

        return lowerBound <= ratioBaseDP && ratioBaseDP <= upperBound;
    }

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

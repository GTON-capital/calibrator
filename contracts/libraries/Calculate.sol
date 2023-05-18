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
        uint256 targetRatioBase,
        uint256 targetRatioQuote,
        uint256 feeNumerator,
        uint256 feeDenominator
    )
        internal
        pure
        returns (bool baseToQuote, uint256 amountIn, uint256 amountOut)
    {
        baseToQuote =
            Math.mulDiv(reserveBase, targetRatioQuote, reserveQuote) <
            targetRatioBase;

        uint256 invariant = reserveBase * reserveQuote;

        uint256 leftSide = Math.sqrt(
            Math.mulDiv(
                invariant,
                baseToQuote ? targetRatioBase : targetRatioQuote,
                (baseToQuote ? targetRatioQuote : targetRatioBase)
            )
        );

        uint256 rightSide = baseToQuote ? reserveBase : reserveQuote;

        require(leftSide != rightSide, "swapToRatio: leftSide==rightSide");

        amountIn = leftSide < rightSide
            ? rightSide - leftSide
            : leftSide - rightSide;

        (uint256 reserveIn, uint256 reserveOut) = baseToQuote
            ? (reserveBase, reserveQuote)
            : (reserveQuote, reserveBase);

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
        uint256 targetRatioBase,
        uint256 targetRatioQuote,
        uint256 precisionNumerator,
        uint256 precisionDenominator
    ) internal pure returns (bool) {
        // base ratio to number of decimal places specified in precisionDenominator
        uint256 ratioBaseDP = Math.mulDiv(
            reserveBase,
            targetRatioQuote * precisionDenominator,
            reserveQuote
        );

        uint256 targetRatioBaseDP = targetRatioBase * precisionDenominator;

        uint256 lowerBound = targetRatioBaseDP > precisionNumerator
            ? targetRatioBaseDP - precisionNumerator
            : 0;

        uint256 upperBound = targetRatioBaseDP + precisionNumerator;

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

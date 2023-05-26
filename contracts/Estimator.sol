// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "./libraries/Calculate.sol";
import "./Base.sol";

abstract contract Estimator is Base {
    struct Estimation {
        bool baseToQuote;
        uint256 requiredQuote;
        uint256 leftoverQuote;
        uint256 leftoverLiquidity;
        uint256 reserveBase;
        uint256 reserveQuote;
    }

    struct EstimationContext {
        uint256 availableQuote;
        uint256 availableBase;
        uint256 minimumLiquidity;
        uint256 totalSupply;
        uint256 vaultLiquidity;
    }

    function estimate(
        uint256 targetBase,
        uint256 targetQuote
    ) external view returns (Estimation memory estimation) {
        EstimationContext memory context;

        (estimation.reserveBase, estimation.reserveQuote) = getRatio();

        uint256 reserveBaseInvariant = estimation.reserveBase;

        context.totalSupply = pair.totalSupply();

        context.vaultLiquidity = pair.balanceOf(getVault());

        (estimation, context) = removeLiquidityDryrun(estimation, context, minimumBase);

        while (
            !Calculate.checkPrecision(
                estimation.reserveBase,
                estimation.reserveQuote,
                targetBase,
                targetQuote,
                precisionNumerator,
                precisionDenominator
            )
        ) {
            (estimation, context) = swapToRatioDryrun(
                estimation,
                context,
                targetBase,
                targetQuote,
                feeNumerator,
                feeDenominator
            );
        }

        estimation = addLiquidityDryrun(
            estimation,
            context,
            reserveBaseInvariant
        );
    }

    function removeLiquidityDryrun(
        Estimation memory estimation,
        EstimationContext memory context,
        uint256 minimumBase
    ) internal pure returns (Estimation memory, EstimationContext memory) {
        uint256 removedLiquidity;

        (context.minimumLiquidity, removedLiquidity) = Calculate
            .removeLiquidity(
                estimation.reserveBase,
                minimumBase,
                context.vaultLiquidity,
                context.totalSupply
            );

        context.availableBase =
            (removedLiquidity * estimation.reserveBase) /
            context.totalSupply;

        context.availableQuote =
            (removedLiquidity * estimation.reserveQuote) /
            context.totalSupply;

        context.totalSupply -= removedLiquidity;

        estimation.reserveBase = estimation.reserveBase - context.availableBase;

        estimation.reserveQuote =
            estimation.reserveQuote -
            context.availableQuote;

        return (estimation, context);
    }

    function swapToRatioDryrun(
        Estimation memory estimation,
        EstimationContext memory context,
        uint256 targetBase,
        uint256 targetQuote,
        uint256 feeNumerator,
        uint256 feeDenominator
    ) internal pure returns (Estimation memory, EstimationContext memory) {
        (bool baseToQuote, uint256 amountIn, uint256 amountOut) = Calculate
            .swapToRatio(
                estimation.reserveBase,
                estimation.reserveQuote,
                targetBase,
                targetQuote,
                feeNumerator,
                feeDenominator
            );

        if (baseToQuote) {
            require(
                context.availableBase > amountIn,
                "swapToRatioDryrun: not enough base for swap"
            );
            context.availableBase = context.availableBase - amountIn;
            estimation.reserveBase = estimation.reserveBase + amountIn;
            estimation.reserveQuote = estimation.reserveQuote - amountOut;
            context.availableQuote = context.availableQuote + amountOut;
        } else {
            require(
                context.availableQuote > amountIn,
                "swapToRatioDryrun: not enough quote for swap"
            );
            context.availableQuote = context.availableQuote - amountIn;
            estimation.reserveQuote = estimation.reserveQuote + amountIn;
            estimation.reserveBase = estimation.reserveBase - amountOut;
            context.availableBase = context.availableBase + amountOut;
        }

        return (estimation, context);
    }

    function addLiquidityDryrun(
        Estimation memory estimation,
        EstimationContext memory context,
        uint256 reserveBaseInvariant
    ) internal pure returns (Estimation memory) {
        (uint256 addedBase, uint256 addedQuote) = Calculate.addLiquidity(
            estimation.reserveBase,
            estimation.reserveQuote,
            reserveBaseInvariant
        );

        if (context.availableQuote < addedQuote) {
            estimation.leftoverQuote = 0;
            estimation.requiredQuote = addedQuote - context.availableQuote;
        } else {
            estimation.leftoverQuote = context.availableQuote - addedQuote;
            estimation.requiredQuote = 0;
        }

        uint256 mintedLiquidity = Math.min(
            (addedBase * context.totalSupply) / estimation.reserveBase,
            (addedQuote * context.totalSupply) / estimation.reserveQuote
        );

        estimation.reserveBase = estimation.reserveBase + addedBase;

        estimation.reserveQuote = estimation.reserveQuote + addedQuote;

        estimation.leftoverLiquidity =
            context.minimumLiquidity +
            mintedLiquidity;

        return estimation;
    }
}

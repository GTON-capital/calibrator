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

    struct Context {
        uint256 availableQuote;
        uint256 availableBase;
        uint256 minimumLiquidity;
        uint256 totalSupply;
    }

    function estimate(
        uint256 targetRatioBase,
        uint256 targetRatioQuote
    ) external view returns (Estimation memory estimation) {
        Context memory context;

        (estimation.reserveBase, estimation.reserveQuote) = getRatio();

        uint256 reserveBaseInvariant = estimation.reserveBase;

        (estimation, context) = removeLiquidityDryrun(estimation);

        while (
            !Calculate.checkPrecision(
                estimation.reserveBase,
                estimation.reserveQuote,
                targetRatioBase,
                targetRatioQuote,
                precisionNumerator,
                precisionDenominator
            )
        ) {
            (estimation, context) = swapToRatioDryrun(
                estimation,
                context,
                targetRatioBase,
                targetRatioQuote
            );
        }

        estimation = addLiquidityDryrun(
            estimation,
            context,
            reserveBaseInvariant
        );
    }

    function removeLiquidityDryrun(
        Estimation memory estimation
    ) public view returns (Estimation memory, Context memory context) {
        context.totalSupply = pair.totalSupply();

        uint256 vaultLiquidity = pair.balanceOf(getVault());

        uint256 removedLiquidity;
        (context.minimumLiquidity, removedLiquidity) = Calculate
            .removeLiquidity(
                estimation.reserveBase,
                minimumBase,
                vaultLiquidity,
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
        Context memory context,
        uint256 targetRatioBase,
        uint256 targetRatioQuote
    ) public view returns (Estimation memory, Context memory) {
        (bool baseToQuote, uint256 amountIn, uint256 amountOut) = Calculate
            .swapToRatio(
                estimation.reserveBase,
                estimation.reserveQuote,
                targetRatioBase,
                targetRatioQuote,
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
        Context memory context,
        uint256 reserveBaseInvariant
    ) public pure returns (Estimation memory) {
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

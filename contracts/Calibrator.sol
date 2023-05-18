// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IPair.sol";
import "./libraries/Calculate.sol";
import "./Base.sol";
import "./Estimator.sol";

contract Calibrator is Base, Estimator {
    constructor(
        address _pair,
        address _tokenBase,
        address _tokenQuote
    ) Base(_pair, _tokenBase, _tokenQuote) {}

    function setRatio(
        uint256 targetRatioBase,
        uint256 targetRatioQuote
    ) external onlyOwner {
        (uint256 reserveBaseInvariant, ) = getRatio();

        removeLiquidity(reserveBaseInvariant);

        (uint256 reserveBase, uint256 reserveQuote) = getRatio();

        while (
            !Calculate.checkPrecision(
                reserveBase,
                reserveQuote,
                targetRatioBase,
                targetRatioQuote,
                precisionNumerator,
                precisionDenominator
            )
        ) {
            swapToRatio(targetRatioBase, targetRatioQuote);

            (reserveBase, reserveQuote) = getRatio();
        }

        addLiquidity(reserveBaseInvariant);

        reclaim();
    }

    function removeLiquidity(uint256 reserveBaseInvariant) public onlyOwner {
        (, uint256 removedLiquidity) = Calculate.removeLiquidity(
            reserveBaseInvariant,
            minimumBase,
            pair.balanceOf(getVault()),
            pair.totalSupply()
        );

        pair.transferFrom(getVault(), address(pair), removedLiquidity);

        pair.burn(address(this));
    }

    function swapToRatio(
        uint256 targetRatioBase,
        uint256 targetRatioQuote
    ) public onlyOwner {
        (uint256 reserveBase, uint256 reserveQuote) = getRatio();

        (bool baseToQuote, uint256 amountIn, uint256 amountOut) = Calculate
            .swapToRatio(
                reserveBase,
                reserveQuote,
                targetRatioBase,
                targetRatioQuote,
                feeNumerator,
                feeDenominator
            );

        IERC20 tokenIn = baseToQuote ? tokenBase : tokenQuote;

        if (tokenIn.balanceOf(address(this)) < amountIn) {
            uint256 missingTokenIn = amountIn -
                tokenIn.balanceOf(address(this));

            tokenIn.transferFrom(getVault(), address(pair), missingTokenIn);

            tokenIn.transfer(address(pair), tokenIn.balanceOf(address(this)));
        } else {
            tokenIn.transfer(address(pair), amountIn);
        }

        (address token0, ) = sortTokens(
            address(tokenBase),
            address(tokenQuote)
        );

        (uint amount0Out, uint amount1Out) = address(tokenIn) == token0
            ? (uint(0), amountOut)
            : (amountOut, uint(0));

        pair.swap(amount0Out, amount1Out, address(this), new bytes(0));
    }

    function addLiquidity(uint256 reserveBaseInvariant) public onlyOwner {
        (uint256 reserveBase, uint256 reserveQuote) = getRatio();

        (uint256 addedBase, uint256 addedQuote) = Calculate.addLiquidity(
            reserveBase,
            reserveQuote,
            reserveBaseInvariant
        );

        tokenBase.transfer(address(pair), addedBase);

        uint256 availableQuote = tokenQuote.balanceOf(address(this));

        if (addedQuote > availableQuote) {
            tokenQuote.transfer(address(pair), availableQuote);

            tokenQuote.transferFrom(
                getVault(),
                address(pair),
                addedQuote - availableQuote
            );
        } else {
            tokenQuote.transfer(address(pair), addedQuote);
        }

        pair.mint(address(this));
    }

    function reclaim() public onlyOwner {
        pair.transfer(getVault(), pair.balanceOf(address(this)));

        tokenBase.transfer(getVault(), tokenBase.balanceOf(address(this)));

        tokenQuote.transfer(getVault(), tokenQuote.balanceOf(address(this)));
    }
}

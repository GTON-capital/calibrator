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
    constructor(address _pair, address _tokenBase, address _tokenQuote) Base(_pair, _tokenBase, _tokenQuote) {}

    function setRatio(uint256 targetBase, uint256 targetQuote) external onlyOwner {
        (uint256 reserveBaseInvariant,) = getRatio();

        removeLiquidity(reserveBaseInvariant);

        (uint256 reserveBase, uint256 reserveQuote) = getRatio();

        bool isIdle;
        bool isPrecise;

        while (!isIdle && !isPrecise) {

            isIdle = swapToRatio(targetBase, targetQuote);

            (reserveBase, reserveQuote) = getRatio();

            isPrecise = Calculate.checkPrecision(
                reserveBase, reserveQuote, targetBase, targetQuote, precisionNumerator, precisionDenominator
            );
        }

        addLiquidity(reserveBaseInvariant);

        reclaim();
    }

    function removeLiquidity(uint256 reserveBaseInvariant) internal onlyOwner {
        (, uint256 removedLiquidity) =
            Calculate.removeLiquidity(reserveBaseInvariant, minimumBase, pair.balanceOf(getVault()), pair.totalSupply());

        pair.transferFrom(getVault(), address(pair), removedLiquidity);

        pair.burn(address(this));
    }

    function swapToRatio(uint256 targetBase, uint256 targetQuote) internal onlyOwner returns (bool) {
        (uint256 reserveBase, uint256 reserveQuote) = getRatio();

        (bool baseToQuote, uint256 amountIn, uint256 amountOut) =
            Calculate.swapToRatio(reserveBase, reserveQuote, targetBase, targetQuote, feeNumerator, feeDenominator);

        // when reserves are small and desired ratio change is small, no swap is possible
        if (amountIn == 0 || amountOut == 0) {
            return true;
        }

        IERC20 tokenIn = baseToQuote ? tokenBase : tokenQuote;

        if (tokenIn.balanceOf(address(this)) < amountIn) {
            uint256 missingTokenIn = amountIn - tokenIn.balanceOf(address(this));

            tokenIn.transferFrom(getVault(), address(pair), missingTokenIn);

            tokenIn.transfer(address(pair), tokenIn.balanceOf(address(this)));
        } else {
            tokenIn.transfer(address(pair), amountIn);
        }

        (address token0,) = sortTokens(address(tokenBase), address(tokenQuote));

        (uint256 amount0Out, uint256 amount1Out) =
            address(tokenIn) == token0 ? (uint256(0), amountOut) : (amountOut, uint256(0));

        pair.swap(amount0Out, amount1Out, address(this), new bytes(0));

        return false;
    }

    function addLiquidity(uint256 reserveBaseInvariant) internal onlyOwner {
        (uint256 reserveBase, uint256 reserveQuote) = getRatio();

        if (reserveBase == reserveBaseInvariant) return;

        (uint256 addedBase, uint256 addedQuote) =
            Calculate.addLiquidity(reserveBase, reserveQuote, reserveBaseInvariant);

        tokenBase.transfer(address(pair), addedBase);

        uint256 availableQuote = tokenQuote.balanceOf(address(this));

        if (addedQuote > availableQuote) {
            tokenQuote.transfer(address(pair), availableQuote);

            tokenQuote.transferFrom(getVault(), address(pair), addedQuote - availableQuote);
        } else {
            tokenQuote.transfer(address(pair), addedQuote);
        }

        pair.mint(address(this));
    }

    function reclaim() internal onlyOwner {
        pair.transfer(getVault(), pair.balanceOf(address(this)));

        tokenBase.transfer(getVault(), tokenBase.balanceOf(address(this)));

        tokenQuote.transfer(getVault(), tokenQuote.balanceOf(address(this)));
    }
}

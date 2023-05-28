// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.19;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IERC20} from "./interfaces/IERC20.sol";
import {IPair} from "./interfaces/IPair.sol";
import {Calculate} from "./libraries/Calculate.sol";
import {Settings} from "./Settings.sol";
import {Estimator} from "./Estimator.sol";

/// @title Changes ratio of pool reserves
/// @author Anton Davydov
contract Calibrator is Settings, Estimator {
    constructor(address _pair, address _tokenBase, address _tokenQuote) Settings(_pair, _tokenBase, _tokenQuote) {}

    /// @notice Change pool reserves to match target ratio
    /// @param targetBase The number of base parts in target ratio
    /// @param targetQuote The number of quote parts in target ratio
    function setRatio(uint256 targetBase, uint256 targetQuote) external onlyOwner {
        (uint256 reserveBaseInvariant,) = getReserves();

        removeLiquidity();

        (uint256 reserveBase, uint256 reserveQuote) = getReserves();

        bool isIdle;
        bool isPrecise = Calculate.checkPrecision(
                reserveBase, reserveQuote, targetBase, targetQuote, precisionNumerator, precisionDenominator
            );

        while (!isIdle && !isPrecise) {

            isIdle = swapToRatio(targetBase, targetQuote);

            (reserveBase, reserveQuote) = getReserves();

            isPrecise = Calculate.checkPrecision(
                reserveBase, reserveQuote, targetBase, targetQuote, precisionNumerator, precisionDenominator
            );
        }

        addLiquidity(reserveBaseInvariant);

        reclaim();
    }

    /// @notice Remove liquidity from the pool for smaller swaps
    function removeLiquidity() internal onlyOwner {
        (uint256 reserveBase,) = getReserves();

        (, uint256 removedLiquidity) =
            Calculate.removeLiquidity(reserveBase, minimumBase, pair.balanceOf(getVault()), pair.totalSupply());

        pair.transferFrom(getVault(), address(pair), removedLiquidity);

        pair.burn(address(this));
    }

    /// @notice Swap to move reserves in the direction of target ratio
    /// @param targetBase The number of base parts in target ratio
    /// @param targetQuote The number of quote parts in target ratio
    /// @return isIdle Did not swap
    function swapToRatio(uint256 targetBase, uint256 targetQuote) internal onlyOwner returns (bool) {
        (uint256 reserveBase, uint256 reserveQuote) = getReserves();

        (bool baseToQuote, uint256 amountIn, uint256 amountOut) =
            Calculate.swapToRatio(reserveBase, reserveQuote, targetBase, targetQuote, feeNumerator, feeDenominator);

        // when reserves are small and desired ratio change is small, no swap is possible
        if (amountIn == 0 || amountOut == 0) {
            return true;
        }

        IERC20 tokenIn = baseToQuote ? tokenBase : tokenQuote;

        uint256 availableIn = tokenIn.balanceOf(address(this));

        uint256 sentIn = Math.min(availableIn, amountIn);

        tokenIn.transfer(address(pair), sentIn);

        uint256 missingIn = amountIn - sentIn;

        tokenIn.transferFrom(getVault(), address(pair), missingIn);

        (address token0,) = sortTokens(address(tokenBase), address(tokenQuote));

        (uint256 amount0Out, uint256 amount1Out) =
            address(tokenIn) == token0 ? (uint256(0), amountOut) : (amountOut, uint256(0));

        pair.swap(amount0Out, amount1Out, address(this), new bytes(0));

        return false;
    }

    /// @notice Add liquidity to reach invariant base reserve
    /// @param reserveBaseInvariant The target size of base reserve
    function addLiquidity(uint256 reserveBaseInvariant) internal onlyOwner {
        (uint256 reserveBase, uint256 reserveQuote) = getReserves();

        (uint256 addedBase, uint256 addedQuote) =
            Calculate.addLiquidity(reserveBase, reserveQuote, reserveBaseInvariant);

        // when addedBase is very small, addedQuote is 0,
        // which is not enough to mint liquidity and change reserves
        // OGX: INSUFFICIENT_LIQUIDITY_MINTED
        if (addedQuote == 0) return;

        tokenBase.transfer(address(pair), addedBase);

        uint256 availableQuote = tokenQuote.balanceOf(address(this));

        uint256 sentQuote = Math.min(availableQuote, addedQuote);

        tokenQuote.transfer(address(pair), sentQuote);

        uint256 missingQuote = addedQuote - sentQuote;

        tokenQuote.transferFrom(getVault(), address(pair), missingQuote);

        pair.mint(address(this));
    }

    /// @notice Transfer all tokens to the vault
    function reclaim() internal onlyOwner {
        pair.transfer(getVault(), pair.balanceOf(address(this)));

        tokenBase.transfer(getVault(), tokenBase.balanceOf(address(this)));

        tokenQuote.transfer(getVault(), tokenQuote.balanceOf(address(this)));
    }
}

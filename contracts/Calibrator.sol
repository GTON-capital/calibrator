// SPDX-License-Identifier: AGPL-3.0
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
    /// @notice Emits at the start of calibration
    /// @param targetBase The number of base parts in target ratio
    /// @param targetQuote The number of quote parts in target ratio
    /// @param The address of the vault that holds pair and ERC20 tokens
    event SetRatio(uint256 indexed targetBase, uint256 indexed targetQuote, address indexed vault);

    /// @notice Emits after liquidity removal
    /// @param minimumBase The target size of the base reserve
    /// @param reserveBase The size of base token reserve after removal
    /// @param reserveQuote The size of quote token reserve after removal
    /// @param removedLiquidity Amount of burned liquidity tokens
    event RemoveLiquidity(uint256 indexed minimumBase, uint256 reserveBase, uint256 reserveQuote, uint256 removedLiquidity);

    /// @notice Emits after a ratio change
    /// @param isIdle Did not swap
    /// @param reserveBase The size of base token reserve after ratio change
    /// @param reserveQuote The size of quote token reserve after ratio change
    /// @param missingIn Amount of tokens transfered from vault
    event SwapToRatio(bool indexed isIdle, uint256 reserveBase, uint256 reserveQuote, uint256 missingIn);

    /// @notice Emits after liquidity provision
    /// @param reserveBase The size of base token reserve after provision
    /// @param reserveQuote The size of quote token reserve after provision
    /// @param missingQuote Amount of quote tokens transfered from vault
    /// @param mintedLiquidity Amount of liquidity tokens minted
    event AddLiquidity(uint256 reserveBase, uint256 reserveQuote, uint256 missingQuote, uint256 mintedLiquidity);

    constructor(address _pair, address _tokenBase, address _tokenQuote) Settings(_pair, _tokenBase, _tokenQuote) {}

    /// @notice Change pool reserves to match target ratio
    /// @param targetBase The number of base parts in target ratio
    /// @param targetQuote The number of quote parts in target ratio
    function setRatio(uint256 targetBase, uint256 targetQuote) external onlyOwner {
        emit SetRatio(targetBase, targetQuote, getVault());

        (uint256 reserveBaseInvariant,) = getReserves();

        removeLiquidity();

        (uint256 reserveBase, uint256 reserveQuote) = getReserves();

        bool isIdle;
        bool isPrecise = Calculate.checkPrecision(
                reserveBase, reserveQuote, targetBase, targetQuote, precisionNumerator, precisionDenominator
            );

        while (!isIdle && !isPrecise) {

            // returns `isIdle=true` if swap doesn't change state, avoiding infinite while loop
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
        (uint256 reserve,) = getReserves();

        (, uint256 removedLiquidity) =
            Calculate.removeLiquidity(reserve, minimumBase, pair.balanceOf(getVault()), pair.totalSupply());

        pair.transferFrom(getVault(), address(pair), removedLiquidity);

        pair.burn(address(this));

        (uint256 reserveBase, uint256 reserveQuote) = getReserves();

        emit RemoveLiquidity(minimumBase, reserveBase, reserveQuote, removedLiquidity);
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
            emit SwapToRatio(true, reserveBase, reserveQuote, 0);

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

        (reserveBase, reserveQuote) = getReserves();

        emit SwapToRatio(false, reserveBase, reserveQuote, missingIn);

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

        uint256 mintedLiquidity = pair.mint(address(this));

        (reserveBase, reserveQuote) = getReserves();

        emit AddLiquidity(reserveBase, reserveQuote, missingQuote, mintedLiquidity);
    }

    /// @notice Transfer all tokens to the vault
    function reclaim() internal onlyOwner {
        pair.transfer(getVault(), pair.balanceOf(address(this)));

        tokenBase.transfer(getVault(), tokenBase.balanceOf(address(this)));

        tokenQuote.transfer(getVault(), tokenQuote.balanceOf(address(this)));
    }
}

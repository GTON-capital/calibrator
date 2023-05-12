// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IPair.sol";

contract Calibrator is Ownable {
    IPair public pair;
    IERC20 public tokenBase;
    IERC20 public tokenQuote;
    address public vault;

    constructor(address _pair, address _tokenBase, address _tokenQuote, address _vault) {
        pair = IPair(_pair);
        tokenBase = IERC20(_tokenBase);
        tokenQuote = IERC20(_tokenQuote);
        vault = _vault;
    }

    function setVault(address _vault) external onlyOwner {
        vault = _vault;
    }

    function setRatio(
        uint256 targetRatioBase,
        uint256 targetRatioQuote
    ) external onlyOwner {
        (uint256 reserveBaseInvariant, , ) = pair.getReserves();

        _removeLiquidity(reserveBaseInvariant);

        _swapToPrice(targetRatioBase, targetRatioQuote);

        // validate price calibration
        (uint256 reserveBase, uint256 reserveQuote, ) = pair.getReserves();

        _validatePrice(
            reserveBase,
            reserveQuote,
            targetRatioBase,
            targetRatioQuote
        );

        _addLiquidity(reserveBaseInvariant);

        _transfer();
    }

    // retrieve current pool ratio
    function getRatio()
        external
        view
        returns (uint256 ratioBase, uint256 ratioQuote)
    {
        (ratioBase, ratioQuote, ) = pair.getReserves();
    }

    // calculate amount of quote tokens needed to set price
    // amount of quote tokens left over after price change
    // amount of base tokens left over after price change
    // amount of liquidity after price change
    function estimate(
        uint256 targetRatioBase,
        uint256 targetRatioQuote
    )
        external
        view
        returns (
            bool baseToQuote,
            uint256 requiredBase,
            uint256 requiredQuote,
            uint256 leftoverBase,
            uint256 leftoverQuote,
            uint256 leftoverLiquidity,
            uint256 reserveBase,
            uint256 reserveQuote
        )
    {
        (reserveBase, reserveQuote, ) = pair.getReserves();

        uint256 reserveBaseInvariant = reserveBase;

        (
            uint256 minimumLiquidity,
            uint256 removedLiquidity
        ) = _calculateRemoveLiquidity(reserveBaseInvariant);

        uint256 totalSupply = pair.totalSupply();

        uint256 availableBase = (removedLiquidity * reserveBase) / totalSupply;

        uint256 availableQuote = (removedLiquidity * reserveQuote) /
            totalSupply;

        totalSupply -= removedLiquidity;

        reserveBase -= availableBase;

        reserveQuote -= availableQuote;

        uint256 amountIn;
        uint256 amountOut;

        (baseToQuote, amountIn, amountOut) = _calculateSwapToPrice(
            reserveBase,
            reserveQuote,
            targetRatioBase,
            targetRatioQuote
        );

        if (baseToQuote) {
            availableBase -= amountIn;
            reserveBase += amountIn;
            reserveQuote -= amountOut;
            availableQuote += amountOut;
        } else {
            availableQuote -= amountIn;
            reserveQuote += amountIn;
            reserveBase -= amountOut;
            availableBase += amountOut;
        }

        _validatePrice(
            reserveBase,
            reserveQuote,
            targetRatioBase,
            targetRatioQuote
        );

        (uint256 addedBase, uint256 addedQuote) = _calculateAddLiquidity(
            reserveBase,
            reserveQuote,
            reserveBaseInvariant
        );

        if (availableBase < addedBase) {
            leftoverBase = 0;
            requiredBase = addedBase - availableBase;
        } else {
            leftoverBase = availableBase - addedBase;
            requiredBase = 0;
        }

        if (availableQuote < addedQuote) {
            leftoverQuote = 0;
            requiredQuote = addedQuote - availableQuote;
        } else {
            leftoverQuote = availableQuote - addedQuote;
            requiredQuote = 0;
        }

        uint256 mintedLiquidity = Math.min(
            (addedBase * totalSupply) / reserveBase,
            (addedQuote * totalSupply) / reserveQuote
        );

        reserveBase += addedBase;

        reserveQuote += addedQuote;

        leftoverLiquidity = minimumLiquidity + mintedLiquidity;
    }

    function _getVault() internal view returns (address) {
        return vault != address(0) ? vault : msg.sender;
    }

    function _removeLiquidity(uint256 reserveBaseInvariant) internal {
        (, uint256 removedLiquidity) = _calculateRemoveLiquidity(
            reserveBaseInvariant
        );

        pair.transferFrom(_getVault(), address(pair), removedLiquidity);

        pair.burn(address(this));
    }

    function _swapToPrice(
        uint256 targetRatioBase,
        uint256 targetRatioQuote
    ) internal {
        (uint256 reserveBase, uint256 reserveQuote, ) = pair.getReserves();

        (
            bool baseToQuote,
            uint256 amountIn,
            uint256 amountOut
        ) = _calculateSwapToPrice(
                reserveBase,
                reserveQuote,
                targetRatioBase,
                targetRatioQuote
            );

        IERC20 tokenIn = baseToQuote ? tokenBase : tokenQuote;

        tokenIn.transfer(address(pair), amountIn);

        (address token0, ) = _sortTokens(
            address(tokenBase),
            address(tokenQuote)
        );

        (uint amount0Out, uint amount1Out) = address(tokenIn) == token0
            ? (uint(0), amountOut)
            : (amountOut, uint(0));

        pair.swap(amount0Out, amount1Out, address(this), new bytes(0));
    }

    function _addLiquidity(uint256 reserveBaseInvariant) internal {
        (uint256 reserveBase, uint256 reserveQuote, ) = pair.getReserves();

        (uint256 addedBase, uint256 addedQuote) = _calculateAddLiquidity(
            reserveBase,
            reserveQuote,
            reserveBaseInvariant
        );

        tokenBase.transfer(address(pair), addedBase);

        uint256 availableQuote = tokenQuote.balanceOf(address(this));

        if (addedQuote > availableQuote) {
            tokenQuote.transfer(address(pair), availableQuote);

            tokenQuote.transferFrom(
                _getVault(),
                address(pair),
                addedQuote - availableQuote
            );
        } else {
            tokenQuote.transfer(address(pair), addedQuote);
        }

        pair.mint(address(this));
    }

    function _transfer() internal {
        pair.transfer(_getVault(), pair.balanceOf(address(this)));

        tokenBase.transfer(_getVault(), tokenBase.balanceOf(address(this)));

        tokenQuote.transfer(_getVault(), tokenQuote.balanceOf(address(this)));
    }

    function _calculateRemoveLiquidity(
        uint256 reserveBaseInvariant
    )
        internal
        view
        returns (uint256 minimumLiquidity, uint256 removedliquidity)
    {
        uint256 availableLiquidity = pair.allowance(_getVault(), address(this));

        uint256 totalSupply = pair.totalSupply();

        minimumLiquidity = Math.mulDiv(
            totalSupply,
            100000,
            reserveBaseInvariant
        );

        require(
            availableLiquidity >= minimumLiquidity,
            "_calculateRemoveLiquidity: INSUFFICIENT_LIQUIDITY"
        );

        removedliquidity = availableLiquidity - minimumLiquidity;
    }

    function _validatePrice(
        uint256 reserveBase,
        uint256 reserveQuote,
        uint256 targetRatioBase,
        uint256 targetRatioQuote
    ) internal pure {
        // base ratio with precision to three decimal places
        uint256 ratioBase3DP = Math.mulDiv(
            reserveBase,
            targetRatioQuote * 1000,
            reserveQuote
        );

        uint256 targetRatioBase3DP = targetRatioBase * 1000;

        require(
            targetRatioBase3DP - 20 <= ratioBase3DP,
            "_validatePrice: too low"
        );

        require(
            ratioBase3DP <= targetRatioBase3DP + 20,
            "_validatePrice: too high"
        );
    }

    function _getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256 amountOut) {
        require(amountIn > 0, "_getAmountOut: INSUFFICIENT_INPUT_AMOUNT");

        require(
            reserveIn > 0 && reserveOut > 0,
            "_getAmountOut: INSUFFICIENT_LIQUIDITY"
        );

        uint256 amountInWithFee = amountIn * 997;

        uint256 numerator = amountInWithFee * reserveOut;

        uint256 denominator = (reserveIn * 1000) + amountInWithFee;

        amountOut = numerator / denominator;
    }

    function _calculateSwapToPrice(
        uint256 reserveBase,
        uint256 reserveQuote,
        uint256 targetRatioBase,
        uint256 targetRatioQuote
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
                invariant * 1000,
                baseToQuote ? targetRatioBase : targetRatioQuote,
                (baseToQuote ? targetRatioQuote : targetRatioBase) * 997
            )
        );

        uint256 rightSide = (
            baseToQuote ? reserveBase * 1000 : reserveQuote * 1000
        ) / 997;

        require(leftSide > rightSide, "_calculateSwapToPrice");

        amountIn = leftSide - rightSide;

        amountOut = baseToQuote
            ? _getAmountOut(amountIn, reserveBase, reserveQuote)
            : _getAmountOut(amountIn, reserveQuote, reserveBase);
    }

    function _sortTokens(
        address tokenA,
        address tokenB
    ) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, "_sortTokens: IDENTICAL_ADDRESSES");
        (token0, token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        require(token0 != address(0), "_sortTokens: ZERO_ADDRESS");
    }

    function _calculateAddLiquidity(
        uint256 reserveBase,
        uint256 reserveQuote,
        uint256 reserveBaseInvariant
    ) internal pure returns (uint256 addedBase, uint256 addedQuote) {
        uint256 amountBaseDesired = reserveBaseInvariant - reserveBase;

        // Library.quote()
        uint256 amountQuoteDesired = Math.mulDiv(
            amountBaseDesired,
            reserveQuote,
            reserveBase
        );

        // calculate added tokens
        uint256 amountQuoteOptimal = Math.mulDiv(
            amountBaseDesired,
            reserveQuote,
            reserveBase
        );

        if (amountQuoteOptimal <= amountQuoteDesired) {
            require(
                amountQuoteOptimal >= 0,
                "_calculateAddLiquidity: INSUFFICIENT_QUOTE_AMOUNT"
            );
            (addedBase, addedQuote) = (amountBaseDesired, amountQuoteOptimal);
        } else {
            uint256 amountBaseOptimal = Math.mulDiv(
                amountQuoteDesired,
                reserveBase,
                reserveQuote
            );

            assert(amountBaseOptimal <= amountBaseDesired);

            require(
                amountBaseOptimal >= 0,
                "_calculateAddLiquidity: INSUFFICIENT_BASE_AMOUNT"
            );

            // TODO: fail if required is over a variable percent of quote balance
            (addedBase, addedQuote) = (amountBaseOptimal, amountQuoteDesired);
        }
    }
}

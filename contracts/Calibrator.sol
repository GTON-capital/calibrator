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
    address public vault = address(0);
    string public constant VERSION = "0.0.1";

    uint256 public feeNumerator = 997;
    uint256 public feeDenominator = 1000;

    uint256 public precisionNumerator = 1;
    uint256 public precisionDenominator = 1000;

    uint256 public minimumBase = 10000000;

    constructor(address _pair, address _tokenBase, address _tokenQuote) {
        pair = IPair(_pair);
        tokenBase = IERC20(_tokenBase);
        tokenQuote = IERC20(_tokenQuote);
    }

    function setVault(address _vault) external onlyOwner {
        vault = _vault;
    }

    function setFee(
        uint256 _feeNumerator,
        uint256 _feeDenominator
    ) external onlyOwner {
        feeNumerator = _feeNumerator;
        feeDenominator = _feeDenominator;
    }

    function setPrecision(
        uint256 _precisionNumerator,
        uint256 _precisionDenominator
    ) external onlyOwner {
        precisionNumerator = _precisionNumerator;
        precisionDenominator = _precisionDenominator;
    }

    function setMinimumBase(uint256 _minimumBase) external onlyOwner {
        minimumBase = _minimumBase;
    }

    function setRatio(
        uint256 targetRatioBase,
        uint256 targetRatioQuote
    ) external onlyOwner {
        (uint256 reserveBaseInvariant, ) = getRatio();

        _removeLiquidity(reserveBaseInvariant);

        (uint256 reserveBase, uint256 reserveQuote) = getRatio();

        while (
            !_checkPrecision(
                reserveBase,
                reserveQuote,
                targetRatioBase,
                targetRatioQuote
            )
        ) {
            _swapToRatio(targetRatioBase, targetRatioQuote);

            (reserveBase, reserveQuote) = getRatio();
        }

        _addLiquidity(reserveBaseInvariant);

        _transfer();
    }

    // retrieve current pool ratio
    function getRatio()
        public
        view
        returns (uint256 ratioBase, uint256 ratioQuote)
    {
        (uint256 reserve0, uint256 reserve1, ) = pair.getReserves();

        (address token0, ) = _sortTokens(
            address(tokenBase),
            address(tokenQuote)
        );

        (ratioBase, ratioQuote) = address(tokenBase) == token0
            ? (reserve0, reserve1)
            : (reserve1, reserve0);
    }

    // calculate amount of quote tokens needed to set ratio
    // amount of quote tokens left over after ratio change
    // amount of base tokens left over after ratio change
    // amount of liquidity after ratio change
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
        (reserveBase, reserveQuote) = getRatio();

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

        while (
            !_checkPrecision(
                reserveBase,
                reserveQuote,
                targetRatioBase,
                targetRatioQuote
            )
        ) {
            (baseToQuote, amountIn, amountOut) = _calculateSwapToRatio(
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
        }

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

    function _swapToRatio(
        uint256 targetRatioBase,
        uint256 targetRatioQuote
    ) internal {
        (uint256 reserveBase, uint256 reserveQuote) = getRatio();

        (
            bool baseToQuote,
            uint256 amountIn,
            uint256 amountOut
        ) = _calculateSwapToRatio(
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
        (uint256 reserveBase, uint256 reserveQuote) = getRatio();

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
        returns (uint256 minimumLiquidity, uint256 removedLiquidity)
    {
        uint256 availableLiquidity = pair.allowance(_getVault(), address(this));

        uint256 totalSupply = pair.totalSupply();

        minimumLiquidity = Math.mulDiv(
            totalSupply,
            minimumBase,
            reserveBaseInvariant
        );

        require(
            availableLiquidity >= minimumLiquidity,
            "_calculateRemoveLiquidity: INSUFFICIENT_LIQUIDITY"
        );

        removedLiquidity = availableLiquidity - minimumLiquidity;
    }

    function _checkPrecision(
        uint256 reserveBase,
        uint256 reserveQuote,
        uint256 targetRatioBase,
        uint256 targetRatioQuote
    ) internal view returns (bool) {
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

    function _getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal view returns (uint256 amountOut) {
        require(amountIn > 0, "_getAmountOut: INSUFFICIENT_INPUT_AMOUNT");

        require(
            reserveIn > 0 && reserveOut > 0,
            "_getAmountOut: INSUFFICIENT_LIQUIDITY"
        );

        uint256 amountInWithFee = amountIn * feeNumerator;

        uint256 numerator = amountInWithFee * reserveOut;

        uint256 denominator = (reserveIn * feeDenominator) + amountInWithFee;

        amountOut = numerator / denominator;
    }

    function _calculateSwapToRatio(
        uint256 reserveBase,
        uint256 reserveQuote,
        uint256 targetRatioBase,
        uint256 targetRatioQuote
    )
        internal
        view
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

        if (leftSide == rightSide) {
            amountIn = 0;

            amountOut = 0;
        } else if (leftSide < rightSide) {
            amountIn = rightSide - leftSide;

            amountOut = baseToQuote
                ? _getAmountOut(amountIn, reserveBase, reserveQuote)
                : _getAmountOut(amountIn, reserveQuote, reserveBase);
        } else {
            amountIn = leftSide - rightSide;

            amountOut = baseToQuote
                ? _getAmountOut(amountIn, reserveBase, reserveQuote)
                : _getAmountOut(amountIn, reserveQuote, reserveBase);
        }
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

            (addedBase, addedQuote) = (amountBaseOptimal, amountQuoteDesired);
        }
    }
}

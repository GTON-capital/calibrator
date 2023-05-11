// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IPair.sol";
import "./interfaces/IRouter02.sol";

contract Calibrator {
    IRouter02 public router;
    IPair public pair;
    IERC20 public tokenBase;
    IERC20 public tokenQuote;

    constructor(
        address _router,
        address _pair,
        address _tokenBase,
        address _tokenQuote
    ) {
        router = IRouter02(_router);
        pair = IPair(_pair);
        tokenBase = IERC20(_tokenBase);
        tokenQuote = IERC20(_tokenQuote);
    }
    // retrieve current pool ratio
    function getRatio() view external returns (uint256 ratioBase, uint256 ratioQuote) {
        (ratioBase, ratioQuote,) = pair
            .getReserves();
    }

    function setRatio(
        uint256 targetRatioBase,
        uint256 targetRatioQuote
    ) external {
        (uint256 reserveBaseInvariant, ,) = pair
            .getReserves();

        _removeLiquidity(reserveBaseInvariant);

        _swapToPrice(targetRatioBase, targetRatioQuote);

        _addLiquidity(reserveBaseInvariant);

        _transfer();
    }

    // calculate amount of quote tokens needed to set price
    // amount of quote tokens left over after price change
    // amount of base tokens left over after price change
    // amount of liquidity after price change
    function estimate(
        uint256 targetRatioBase,
        uint256 targetRatioQuote
    ) view external returns (
        bool baseToQuote,
        uint256 requiredBase,
        uint256 requiredQuote,
        uint256 leftoverBase,
        uint256 leftoverQuote,
        uint256 leftoverLiquidity,
        uint256 reserveBase,
        uint256 reserveQuote
    ) {
        (reserveBase, reserveQuote,) = pair
            .getReserves();

        uint256 reserveBaseInvariant = reserveBase;

        (uint256 minimumLiquidity,
         uint256 removedLiquidity
        ) = _calculateRemoveLiquidity(reserveBaseInvariant);

        uint256 totalSupply = pair.totalSupply();

        uint256 availableBase = removedLiquidity * reserveBase / totalSupply;

        uint256 availableQuote = removedLiquidity * reserveQuote / totalSupply;

        totalSupply -= removedLiquidity;

        reserveBase -= availableBase;

        reserveQuote -= availableQuote;

        uint256 amountIn;
        uint256 amountOut;

        (baseToQuote,
         amountIn,
         amountOut) = _calculateSwapToPrice(
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

        (uint256 amountBaseAdded,
         uint256 amountQuoteAdded
        ) = _calculateAddLiquidity(
            reserveBase,
            reserveQuote,
            reserveBaseInvariant
         );

        // TODO: fail if required is over a variable percent of quote balance
        if (availableBase < amountBaseAdded) {
            leftoverBase = 0;
            requiredBase = amountBaseAdded - availableBase;
        } else {
            leftoverBase = availableBase - amountBaseAdded;
            requiredBase = 0;
        }

        if (availableQuote < amountQuoteAdded) {
            leftoverQuote = 0;
            requiredQuote = amountQuoteAdded - availableQuote;
        } else {
            leftoverQuote = availableQuote - amountQuoteAdded;
            requiredQuote = 0;
        }

        uint256 mintedLiquidity = Math.min(
            amountBaseAdded * totalSupply / reserveBase,
            amountQuoteAdded * totalSupply / reserveQuote
        );

        reserveBase += amountBaseAdded;
        reserveQuote += amountQuoteAdded;
        leftoverLiquidity = minimumLiquidity + mintedLiquidity;
    }


    function _removeLiquidity(uint256 reserveBaseInvariant) internal {
        (,uint256 removedLiquidity) = _calculateRemoveLiquidity(reserveBaseInvariant);

        pair.transferFrom(msg.sender, address(this), removedLiquidity);

        pair.approve(address(router), removedLiquidity);

        router.removeLiquidity(
            address(tokenBase),
            address(tokenQuote),
            removedLiquidity,
            0,
            0,
            address(this),
            block.timestamp + 3600
        );
    }

    function _swapToPrice(
        uint256 targetRatioBase,
        uint256 targetRatioQuote
    ) internal {
        (uint256 reserveBase, uint256 reserveQuote,) =
            pair.getReserves();

        (bool baseToQuote,
         uint256 amountIn,
         uint256 amountOut) = _calculateSwapToPrice(
            reserveBase,
            reserveQuote,
            targetRatioBase,
            targetRatioQuote
         );

        if (baseToQuote) {
            tokenBase.approve(address(router), amountIn);
        } else {
            tokenQuote.approve(address(router), amountIn);
        }

        address[] memory path = new address[](2);
        path[0] = baseToQuote ? address(tokenBase) : address(tokenQuote);
        path[1] = baseToQuote ? address(tokenQuote) : address(tokenBase);

        router.swapExactTokensForTokens(
            amountIn,
            amountOut,
            path,
            address(this),
            block.timestamp + 3600
        );

        // validate price calibration
        (uint256 reserveBaseAfter, uint256 reserveQuoteAfter,) = pair
            .getReserves();

        // new base ratio with precision to three decimal places
        uint256 newRatioBase3DP = Math.mulDiv(
            reserveBaseAfter,
            targetRatioQuote * 1000,
            reserveQuoteAfter
        );

        uint256 targetRatioBase3DP = targetRatioBase * 1000;

        require(targetRatioBase3DP - 20 <= newRatioBase3DP, "E3");

        require(newRatioBase3DP <= targetRatioBase3DP + 20, "E4");
    }

    function _addLiquidity(uint256 reserveBaseInvariant) internal {
        (uint256 reserveBase, uint256 reserveQuote,) = pair
            .getReserves();

        (uint256 amountBaseAdded,
         uint256 amountQuoteAdded
        ) = _calculateAddLiquidity(
            reserveBase,
            reserveQuote,
            reserveBaseInvariant
         );

        tokenBase.approve(address(router), amountBaseAdded);

        // TODO: allow to transfer a variable percent from the quote balance
        // TODO: transfer only missing portion of tokens
        tokenQuote.transferFrom(msg.sender, address(this), amountQuoteAdded);

        tokenQuote.approve(address(router), amountQuoteAdded);

        router.addLiquidity(
            address(tokenBase),
            address(tokenQuote),
            amountBaseAdded,
            amountQuoteAdded,
            amountBaseAdded,
            amountQuoteAdded,
            address(this),
            block.timestamp + 3600
        );
    }

    function _transfer() internal {
        pair.transfer(msg.sender, pair.balanceOf(address(this)));

        tokenBase.transfer(msg.sender, tokenBase.balanceOf(address(this)));

        tokenQuote.transfer(msg.sender, tokenQuote.balanceOf(address(this)));

    }

    function _calculateRemoveLiquidity(
        uint256 reserveBaseInvariant
    ) view internal returns (
        uint256 minimumLiquidity,
        uint256 removedliquidity
    ) {
        // TODO: bring liquidity owner to variable instead of msg.sender
        uint256 availableLiquidity = pair.allowance(msg.sender, address(this));

        uint256 totalSupply = pair.totalSupply();

        minimumLiquidity = Math.mulDiv(
            totalSupply,
            100000,
            reserveBaseInvariant
        );

        require(availableLiquidity >= minimumLiquidity, "E1");

        removedliquidity = availableLiquidity - minimumLiquidity;
    }

    function _calculateSwapToPrice(
        uint256 reserveBase,
        uint256 reserveQuote,
        uint256 targetRatioBase,
        uint256 targetRatioQuote
    ) view internal returns (
        bool baseToQuote,
        uint256 amountIn,
        uint256 amountOut
    ) {
        baseToQuote = Math.mulDiv(
            reserveBase,
            targetRatioQuote,
            reserveQuote
        ) < targetRatioBase;

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

        require(leftSide > rightSide, "E2");

        amountIn = leftSide - rightSide;

        amountOut = baseToQuote
            ? router.getAmountOut(amountIn, reserveBase, reserveQuote)
            : router.getAmountOut(amountIn, reserveQuote, reserveBase);
    }

    function _calculateAddLiquidity(
        uint256 reserveBase,
        uint256 reserveQuote,
        uint256 reserveBaseInvariant
    ) pure internal returns (
        uint256 amountBaseAdded,
        uint256 amountQuoteAdded
    ) {
        uint256 amountBaseDesired = reserveBaseInvariant - reserveBase;

        // Library.quote()
        uint256 amountQuoteDesired = Math.mulDiv(
            amountBaseDesired,
            reserveQuote,
            reserveBase
        );

        // calculate added tokens
        uint256 amountQuoteOptimal = Math.mulDiv(amountBaseDesired, reserveQuote, reserveBase);
        if (amountQuoteOptimal <= amountQuoteDesired) {
            require(amountQuoteOptimal >= 0, '_calculateAddLiquidity: INSUFFICIENT_QUOTE_AMOUNT');
            (amountBaseAdded, amountQuoteAdded) = (amountBaseDesired, amountQuoteOptimal);
        } else {
            uint256 amountBaseOptimal = Math.mulDiv(amountQuoteDesired, reserveBase, reserveQuote);
            assert(amountBaseOptimal <= amountBaseDesired);
            require(amountBaseOptimal >= 0, '_calculateAddLiquidity: INSUFFICIENT_BASE_AMOUNT');
            (amountBaseAdded, amountQuoteAdded) = (amountBaseOptimal, amountQuoteDesired);
        }
    }
}

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

    function setRatio(uint256 targetRatioBase, uint256 targetRatioQuote) external {
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

        uint256 availableQuote = (removedLiquidity * reserveQuote) / totalSupply;

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

        // TODO: fail if required is over a variable percent of quote balance
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

    function _removeLiquidity(uint256 reserveBaseInvariant) internal {
        (, uint256 removedLiquidity) = _calculateRemoveLiquidity(
            reserveBaseInvariant
        );

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
    }

    function _addLiquidity(uint256 reserveBaseInvariant) internal {
        (uint256 reserveBase, uint256 reserveQuote, ) = pair.getReserves();

        (uint256 addedBase, uint256 addedQuote) = _calculateAddLiquidity(
            reserveBase,
            reserveQuote,
            reserveBaseInvariant
        );

        tokenBase.approve(address(router), addedBase);

        // TODO: allow to transfer a variable percent from the quote balance
        tokenQuote.transferFrom(msg.sender, address(this), addedQuote);

        tokenQuote.approve(address(router), addedQuote);

        router.addLiquidity(
            address(tokenBase),
            address(tokenQuote),
            addedBase,
            addedQuote,
            addedBase,
            addedQuote,
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
    ) internal view returns (uint256 minimumLiquidity, uint256 removedliquidity) {
        // TODO: liquidity owner from global variable instead of msg.sender
        uint256 availableLiquidity = pair.allowance(msg.sender, address(this));

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
        // new base ratio with precision to three decimal places
        uint256 newRatioBase3DP = Math.mulDiv(
            reserveBase,
            targetRatioQuote * 1000,
            reserveQuote
        );

        uint256 targetRatioBase3DP = targetRatioBase * 1000;

        require(
            targetRatioBase3DP - 20 <= newRatioBase3DP,
            "_validatePrice: too low"
        );

        require(
            newRatioBase3DP <= targetRatioBase3DP + 20,
            "_validatePrice: too high"
        );
    }

    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256 amountOut) {
        require(amountIn > 0, "getAmountOut: INSUFFICIENT_INPUT_AMOUNT");

        require(
            reserveIn > 0 && reserveOut > 0,
            "getAmountOut: INSUFFICIENT_LIQUIDITY"
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
    ) internal pure returns (bool baseToQuote, uint256 amountIn, uint256 amountOut) {
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
            ? getAmountOut(amountIn, reserveBase, reserveQuote)
            : getAmountOut(amountIn, reserveQuote, reserveBase);
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

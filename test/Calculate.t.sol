pragma solidity 0.8.19;

import "forge-std/Test.sol";
import {ERC20PresetFixedSupply} from "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetFixedSupply.sol";
import {Calculate} from "contracts/libraries/Calculate.sol";
// prettier-ignore
import {
    assume_removeLiquidity,
    assume_swapToRatio,
    assume_addLiquidity,
    assume_checkPrecision,
    assume_getAmountOut
} from "test/shared/Assume.sol";

contract CalculateTest is Test {
    function testFuzz_removeLiquidity(
        uint256 reserveBaseInvariant,
        uint256 minimumBase,
        uint256 availableLiquidity,
        uint256 totalSupply
    ) public {
        assume_removeLiquidity(
            reserveBaseInvariant,
            minimumBase,
            availableLiquidity,
            totalSupply,
            vm.assume
        );

        Calculate.removeLiquidity(
            reserveBaseInvariant,
            minimumBase,
            availableLiquidity,
            totalSupply
        );
    }

    function testFuzz_swapToRatio_movesPrice(
        uint96 reserveBase,
        uint96 reserveQuote,
        uint96 targetBase,
        uint96 targetQuote
    ) public {
        // realistic fees
        uint256 feeNumerator = 997;
        uint256 feeDenominator = 1000;

        assume_swapToRatio(
            reserveBase,
            reserveQuote,
            targetBase,
            targetQuote,
            vm.assume
        );

        (bool baseToQuote, uint256 amountIn, uint256 amountOut) = Calculate
            .swapToRatio(
                reserveBase,
                reserveQuote,
                targetBase,
                targetQuote,
                feeNumerator,
                feeDenominator
            );

        (uint256 targetIn, uint256 targetOut) = baseToQuote
            ? (targetBase, targetQuote)
            : (targetQuote, targetBase);

        (uint256 reserveIn, uint256 reserveOut) = baseToQuote
            ? (reserveBase, reserveQuote)
            : (reserveQuote, reserveBase);

        // can't guarantee ratioNew==targetRatio
        // because of sqrt precision errors
        // and ignoring the swap fee

        // moves price in the direction of target
        uint256 ratioNew = (reserveIn + amountIn) / (reserveOut - amountOut);
        uint256 ratioTarget = targetIn / targetOut;
        assertLe(reserveIn / reserveOut, ratioNew);
        assertLe(ratioNew, ratioTarget != 0 ? ratioTarget : 1);
    }

    function testFuzz_addLiquidity(
        uint256 reserveBase,
        uint256 reserveQuote,
        uint256 reserveBaseInvariant
    ) public {
        assume_addLiquidity(
            reserveBase,
            reserveQuote,
            reserveBaseInvariant,
            vm.assume
        );

        Calculate.addLiquidity(reserveBase, reserveQuote, reserveBaseInvariant);
    }

    function testFuzz_checkPrecision(
        uint256 reserveBase,
        uint256 reserveQuote,
        uint256 targetBase,
        uint256 targetQuote,
        uint256 precisionNumerator,
        uint256 precisionDenominator
    ) public {
        assume_checkPrecision(
            reserveBase,
            reserveQuote,
            targetBase,
            targetQuote,
            precisionNumerator,
            precisionDenominator,
            vm.assume
        );

        Calculate.checkPrecision(
            reserveBase,
            reserveQuote,
            targetBase,
            targetQuote,
            precisionNumerator,
            precisionDenominator
        );
    }

    function testFuzz_getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut,
        uint256 feeNumerator,
        uint256 feeDenominator
    ) public {
        assume_getAmountOut(
            amountIn,
            reserveIn,
            reserveOut,
            feeNumerator,
            feeDenominator,
            vm.assume
        );

        Calculate.getAmountOut(
            amountIn,
            reserveIn,
            reserveOut,
            feeNumerator,
            feeDenominator
        );
    }
}

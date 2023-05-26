pragma solidity 0.8.19;

import "forge-std/Test.sol";
import {ERC20PresetFixedSupply} from "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetFixedSupply.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Calculate} from "contracts/libraries/Calculate.sol";

contract CalibratorTest is Test {
    // @openzeppelin/test/utils/math/Math.t.sol
    function _mulHighLow(
        uint256 x,
        uint256 y
    ) private pure returns (uint256 high, uint256 low) {
        (uint256 x0, uint256 x1) = (x & type(uint128).max, x >> 128);
        (uint256 y0, uint256 y1) = (y & type(uint128).max, y >> 128);

        // Karatsuba algorithm
        // https://en.wikipedia.org/wiki/Karatsuba_algorithm
        uint256 z2 = x1 * y1;
        uint256 z1a = x1 * y0;
        uint256 z1b = x0 * y1;
        uint256 z0 = x0 * y0;

        uint256 carry = ((z1a & type(uint128).max) +
            (z1b & type(uint128).max) +
            (z0 >> 128)) >> 128;

        high = z2 + (z1a >> 128) + (z1b >> 128) + carry;

        unchecked {
            low = x * y;
        }
    }

    function mulDivValid(
        uint256 x,
        uint256 y,
        uint256 z
    ) private pure returns (bool) {
        // Full precision for x * y
        (uint256 xyHi, ) = _mulHighLow(x, y);

        // Assume result won't overflow
        // This also checks that `d` is positive
        return xyHi < z;
    }

    function mulValid(uint256 x, uint256 y) private pure returns (bool) {
        if (x == 0 || y == 0) return true;

        return type(uint256).max / x > y && type(uint256).max / y > x;
    }

    function addValid(uint256 x, uint256 y) private pure returns (bool) {
        return type(uint256).max - x > y && type(uint256).max - y > x;
    }

    function testFuzz_removeLiquidity(
        uint256 reserveBaseInvariant,
        uint256 minimumBase,
        uint256 availableLiquidity,
        uint256 totalSupply
    ) public pure {
        vm.assume(mulDivValid(totalSupply, minimumBase, reserveBaseInvariant));

        uint256 minimumLiquidityExpected = Math.mulDiv(
            totalSupply,
            minimumBase,
            reserveBaseInvariant
        );

        // no "removeLiquidity: INSUFFICIENT_LIQUIDITY"
        vm.assume(availableLiquidity >= minimumLiquidityExpected);

        Calculate.removeLiquidity(
            reserveBaseInvariant,
            minimumBase,
            availableLiquidity,
            totalSupply
        );
    }

    function test_swapToRatio_movesPrice(
        uint96 reserveBase,
        uint96 reserveQuote,
        uint96 targetBase,
        uint96 targetQuote
    ) public {
        // reserves are full enough for precise division
        vm.assume(reserveBase > 100 && reserveQuote > 100);
        // parts of target ratio are between 0 and 10^10
        vm.assume(0 < targetBase);
        vm.assume(0 < targetQuote);
        // realistic fees
        uint256 feeNumerator = 997;
        uint256 feeDenominator = 1000;

        // reserveBaseDesired won't fail
        vm.assume(mulDivValid(targetBase, reserveQuote, targetQuote));

        // invariant, K won't fail
        vm.assume(mulValid(reserveBase, reserveQuote));

        // reserveInOptimal won't fail
        uint256 invariant = uint256(reserveBase) * uint256(reserveQuote);
        vm.assume(mulDivValid(invariant, targetBase, targetQuote));
        vm.assume(mulDivValid(invariant, targetQuote, targetBase));

        // getAmountOut will overflow with parameters > uint96
        // can't write vm.assume without copying implementation

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

    function test_addLiquidity(
        uint256 reserveBase,
        uint256 reserveQuote,
        uint256 reserveBaseInvariant
    ) public pure {
        vm.assume(reserveBaseInvariant >= reserveBase);

        vm.assume(
            mulDivValid(
                reserveBaseInvariant - reserveBase,
                reserveQuote,
                reserveBase
            )
        );

        Calculate.addLiquidity(reserveBase, reserveQuote, reserveBaseInvariant);
    }

    function test_checkPrecision(
        uint256 reserveBase,
        uint256 reserveQuote,
        uint256 targetBase,
        uint256 targetQuote,
        uint256 precisionNumerator,
        uint256 precisionDenominator
    ) public pure {
        vm.assume(mulValid(targetQuote, precisionDenominator));

        vm.assume(
            mulDivValid(
                reserveBase,
                targetQuote * precisionDenominator,
                reserveQuote
            )
        );

        vm.assume(mulValid(targetBase, precisionDenominator));

        vm.assume(
            addValid(targetBase * precisionDenominator, precisionNumerator)
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

    function test_getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut,
        uint256 feeNumerator,
        uint256 feeDenominator
    ) public pure {
        vm.assume(amountIn > 0);

        vm.assume(reserveIn > 0 && reserveOut > 0);

        vm.assume(mulValid(amountIn, feeNumerator));

        vm.assume(mulValid(amountIn * feeNumerator, reserveOut));

        vm.assume(mulValid(reserveIn, feeDenominator));

        vm.assume(
            addValid(reserveIn * feeDenominator, amountIn * feeNumerator)
        );

        vm.assume(feeDenominator > 0);

        Calculate.getAmountOut(
            amountIn,
            reserveIn,
            reserveOut,
            feeNumerator,
            feeDenominator
        );
    }
}

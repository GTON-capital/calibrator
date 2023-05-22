pragma solidity 0.8.19;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import {ERC20PresetFixedSupply} from "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetFixedSupply.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Calculate} from "contracts/libraries/Calculate.sol";

contract CalibratorTest is Test {
    // @openzeppelin/test/utils/math/Math.t.sol
    function _mulHighLow(uint256 x, uint256 y) private pure returns (uint256 high, uint256 low) {
        (uint256 x0, uint256 x1) = (x & type(uint128).max, x >> 128);
        (uint256 y0, uint256 y1) = (y & type(uint128).max, y >> 128);

        // Karatsuba algorithm
        // https://en.wikipedia.org/wiki/Karatsuba_algorithm
        uint256 z2 = x1 * y1;
        uint256 z1a = x1 * y0;
        uint256 z1b = x0 * y1;
        uint256 z0 = x0 * y0;

        uint256 carry = ((z1a & type(uint128).max) + (z1b & type(uint128).max) + (z0 >> 128)) >> 128;

        high = z2 + (z1a >> 128) + (z1b >> 128) + carry;

        unchecked {
            low = x * y;
        }
    }

    function testFuzz_removeLiquidity(
        uint256 reserveBaseInvariant,
        uint256 minimumBase,
        uint256 availableLiquidity,
        uint256 totalSupply
    ) public {
        vm.assume(reserveBaseInvariant > 0);

        // Full precision for x * y
        (uint256 xyHi, ) = _mulHighLow(totalSupply, minimumBase);

        // Assume result won't overflow
        // This also checks that `d` is positive
        vm.assume(xyHi < reserveBaseInvariant);

        uint256 minimumLiquidityExpected = Math.mulDiv(
            totalSupply,
            minimumBase,
            reserveBaseInvariant
        );

        vm.assume(availableLiquidity >= minimumLiquidityExpected);

        (uint256 minimumLiquidity,
         uint256 removedLiquidity) = Calculate.removeLiquidity(
            reserveBaseInvariant,
            minimumBase,
            availableLiquidity,
            totalSupply
         );

        assertTrue(minimumLiquidity == minimumLiquidityExpected);

        assertTrue(availableLiquidity == minimumLiquidity + removedLiquidity);
    }

    function testFail_removeLiquidity() public pure {
        Calculate.removeLiquidity(1,1,0,1);

        //"removeLiquidity: INSUFFICIENT_LIQUIDITY"
    }

    function test_swapToRatio_true() public {
        (bool baseToQuote,
         uint256 amountIn,
         uint256 amountOut) = Calculate.swapToRatio(10,10,10,5,1,1);

        assertEq(baseToQuote, true);
        assertEq(amountIn, 4);
        assertEq(amountOut, 2);
    }

    function test_swapToRatio_false() public {
        (bool baseToQuote,
         uint256 amountIn,
         uint256 amountOut) = Calculate.swapToRatio(10,10,5,10,1,1);

        assertEq(baseToQuote, false);
        assertEq(amountIn, 4);
        assertEq(amountOut, 2);
    }

    // function testFail_swapToRatio() public pure {
    //     (bool baseToQuote,
    //      uint256 amountIn,
    //      uint256 amountOut) = Calculate.swapToRatio(1,1,1,1,1,1);

    //     //"swapToRatio: leftSide==rightSide"
    // }

    function test_addLiquidity() public {
        (uint256 amountBaseDesired,
         uint256 amountQuoteOptimal) = Calculate.addLiquidity(1,1,1);

        assertEq(amountBaseDesired, 0);
        assertEq(amountQuoteOptimal, 0);
    }

    function test_checkPrecision_True() public {
        (bool isPrecise) = Calculate.checkPrecision(1,1,1,1,1,1);

        assertEq(isPrecise, true);
    }

    function test_checkPrecision_False() public {
        (bool isPrecise) = Calculate.checkPrecision(10,10,1,5,1,1);

        assertEq(isPrecise, false);
    }

    function test_getAmountOut() public {
        (uint256 amountOut) = Calculate.getAmountOut(1,1,1,1,1);

        assertEq(amountOut, 0);
    }

    // function testFail_getAmountOut_input() public pure {
    //     (uint256 amountOut) = Calculate.getAmountOut(0,1,1,1,1);

    //     //"getAmountOut: INSUFFICIENT_INPUT_AMOUNT"
    // }

    // function testFail_getAmountOut_liquidity() public {
    //     (uint256 amountOut) = Calculate.getAmountOut(1,0,1,1,1);

    //     //"getAmountOut: INSUFFICIENT_LIQUIDITY"
    // }
}

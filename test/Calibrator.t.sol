pragma solidity 0.8.19;

import "forge-std/Test.sol";
import {ERC20PresetFixedSupply} from "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetFixedSupply.sol";
import {Calibrator} from "contracts/Calibrator.sol";
import {Estimator} from "contracts/Estimator.sol";
import {Calculate} from "contracts/libraries/Calculate.sol";
import {IFactory} from "contracts/interfaces/IFactory.sol";
import {IPair} from "contracts/interfaces/IPair.sol";
// prettier-ignore
import {
    assume_removeLiquidity,
    assume_swapToRatio,
    assume_addLiquidity,
    assume_estimate
} from "test/shared/Assume.sol";

contract CalibratorTestHarness is Calibrator {
    constructor(
        address _pair,
        address _tokenBase,
        address _tokenQuote
    ) Calibrator(_pair, _tokenBase, _tokenQuote) {}

    function exposed_removeLiquidity() external {
        return removeLiquidity();
    }

    function exposed_swapToRatio(
        uint256 targetBase,
        uint256 targetQuote
    ) external returns (bool) {
        return swapToRatio(targetBase, targetQuote);
    }

    function exposed_addLiquidity(uint256 reserveBaseInvariant) external {
        return addLiquidity(reserveBaseInvariant);
    }
}

contract CalibratorTest is Test {
    CalibratorTestHarness calibrator;
    ERC20PresetFixedSupply tokenBase;
    ERC20PresetFixedSupply tokenQuote;
    IFactory factory;
    IPair pair;

    function deployFactory() public returns (IFactory) {
        bytes memory args = abi.encode(address(this));
        bytes memory bytecode = abi.encodePacked(
            vm.getCode("../node_modules/@gton/ogs-core/build:OGXFactory"),
            args
        );
        address factoryAddress;
        assembly {
            factoryAddress := create(0, add(bytecode, 0x20), mload(bytecode))
        }
        return IFactory(factoryAddress);
    }

    function setUp() public {
        tokenBase = new ERC20PresetFixedSupply(
            "Base",
            "BASE",
            10000000 * (10 ** 18),
            address(this)
        );

        tokenQuote = new ERC20PresetFixedSupply(
            "Base",
            "BASE",
            10000000 * (10 ** 18),
            address(this)
        );

        factory = deployFactory();

        address pairAddress = factory.createPair(
            address(tokenBase),
            address(tokenQuote)
        );

        pair = IPair(pairAddress);

        tokenBase.transfer(address(pair), 2474195218611459158903569);
        tokenQuote.transfer(address(pair), 1000002480398709503374);
        pair.mint(address(this));

        calibrator = new CalibratorTestHarness(
            address(pair),
            address(tokenBase),
            address(tokenQuote)
        );

        calibrator.setVault(address(this));

        pair.approve(address(calibrator), pair.balanceOf(address(this)));

        tokenQuote.approve(
            address(calibrator),
            tokenQuote.balanceOf(address(this))
        );
    }

    function test_setRatio() public {
        pair.approve(address(calibrator), pair.balanceOf(address(this)));
        tokenQuote.approve(address(calibrator), pair.balanceOf(address(this)));

        calibrator.setRatio(167, 1);

        (uint256 reserveBase, ) = calibrator.getReserves();

        assertEq(reserveBase, 2474195218611459158903569);
    }

    function testFuzz_removeLiquidity() public {
        (uint256 reserveBase, ) = calibrator.getReserves();

        assume_removeLiquidity(
            reserveBase,
            calibrator.minimumBase(),
            pair.balanceOf(address(this)),
            pair.totalSupply(),
            vm.assume
        );

        calibrator.exposed_removeLiquidity();
    }

    function test_swapToRatio(uint256 targetBase, uint256 targetQuote) public {
        (uint256 reserveBase, uint256 reserveQuote) = calibrator.getReserves();

        assume_swapToRatio(
            reserveBase,
            reserveQuote,
            targetBase,
            targetQuote,
            calibrator.feeNumerator(),
            calibrator.feeDenominator(),
            vm.assume
        );

        (bool baseToQuote, uint256 amountIn, ) = Calculate.swapToRatio(
            reserveBase,
            reserveQuote,
            targetBase,
            targetQuote,
            calibrator.feeNumerator(),
            calibrator.feeDenominator()
        );

        uint256 availableIn = baseToQuote
            ? tokenBase.balanceOf(address(calibrator))
            : tokenQuote.balanceOf(address(calibrator)) +
                tokenQuote.balanceOf(address(this));

        vm.assume(availableIn > amountIn);

        calibrator.exposed_swapToRatio(targetBase, targetQuote);
    }

    function test_addLiquidity_idleEqual() public {
        (uint256 reserveBase, ) = calibrator.getReserves();

        calibrator.exposed_addLiquidity(reserveBase);

        (uint256 reserveBaseNew, ) = calibrator.getReserves();

        assertEq(reserveBase, reserveBaseNew);
    }

    function test_addLiquidity_idleSmall() public {
        (uint256 reserveBase, ) = calibrator.getReserves();

        calibrator.exposed_addLiquidity(reserveBase + 1);

        (uint256 reserveBaseNew, ) = calibrator.getReserves();

        assertEq(reserveBase, reserveBaseNew);
    }

    function testFuzz_addLiquidity(uint256 reserveBaseInvariant) public {
        (uint256 reserveBase, uint256 reserveQuote) = calibrator.getReserves();

        assume_addLiquidity(
            reserveBase,
            reserveQuote,
            reserveBaseInvariant,
            vm.assume
        );

        vm.assume(reserveBaseInvariant != reserveBase);

        (uint256 addedBase, uint256 addedQuote) = Calculate.addLiquidity(
            reserveBase,
            reserveQuote,
            reserveBaseInvariant
        );

        vm.assume(addedQuote > 0);

        vm.assume(addedBase <= tokenBase.balanceOf(address(this)));

        vm.assume(addedQuote <= tokenQuote.balanceOf(address(this)));

        tokenBase.transfer(address(calibrator), addedBase);

        // transfer a bit so some cases pass without taking quote from vault
        tokenQuote.transfer(address(calibrator), 10 ** 21);

        calibrator.exposed_addLiquidity(reserveBaseInvariant);
    }

    function testFuzz_setRatio(uint256 targetBase, uint256 targetQuote) public {
        (uint256 reserveBase, ) = calibrator.getReserves();

        uint256 availableQuote = tokenQuote.balanceOf(address(this)) +
            tokenQuote.balanceOf(address(pair));

        // ERC20: insufficient allowance
        assume_estimate(
            reserveBase,
            availableQuote,
            targetBase,
            targetQuote,
            vm.assume
        );

        calibrator.setRatio(targetBase, targetQuote);
    }
}

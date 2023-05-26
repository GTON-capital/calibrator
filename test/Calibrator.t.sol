pragma solidity 0.8.19;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import {ERC20PresetFixedSupply} from "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetFixedSupply.sol";
import {Calibrator} from "../contracts/Calibrator.sol";
import {IFactory} from "../contracts/interfaces/IFactory.sol";
import {IPair} from "../contracts/interfaces/IPair.sol";

contract CalibratorTestHarness is Calibrator {
    constructor(
        address _pair,
        address _tokenBase,
        address _tokenQuote
    ) Calibrator(_pair, _tokenBase, _tokenQuote) {}

    function exposed_removeLiquidity(uint256 reserveBaseInvariant) external {
        return removeLiquidity(reserveBaseInvariant);
    }

    function exposed_swapToRatio(
        uint256 targetBase,
        uint256 targetQuote
    ) external {
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
    }

    function test_setRatio() public {
        pair.approve(address(calibrator), pair.balanceOf(address(this)));
        tokenQuote.approve(address(calibrator), pair.balanceOf(address(this)));

        calibrator.setRatio(167, 1);

        (uint256 reserveBase, ) = calibrator.getRatio();

        assertEq(reserveBase, 2474195218611459158903569);
    }
    // TODO: negative test, liquidity not approved
    // [FAIL. Reason: ds-math-sub-underflow] test_setRatio()

    // TODO: negative test, quote not approved
    // [FAIL. Reason: ERC20: insufficient allowance] test_setRatio()

    // function test_removeLiquidity() public {
    // }

    // function test_swapToRatio() public {
    // }

    // function test_addLiquidity() public {
    // }
}

pragma solidity 0.8.19;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import {ERC20PresetFixedSupply} from "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetFixedSupply.sol";
import {Calibrator} from "../contracts/Calibrator.sol";
import {Estimator} from "../contracts/Estimator.sol";
import {IFactory} from "../contracts/interfaces/IFactory.sol";
import {IPair} from "../contracts/interfaces/IPair.sol";

contract CalibratorTest is Test {
    Calibrator calibrator;
    ERC20PresetFixedSupply tokenBase;
    ERC20PresetFixedSupply tokenQuote;
    IFactory factory;
    IPair pair;

    function deployFactory() public returns (IFactory) {
        bytes memory args = abi.encode(address(this));
        bytes memory bytecode = abi.encodePacked(vm.getCode("../node_modules/@gton/ogs-core/build:OGXFactory"), args);
        address factoryAddress;
        assembly {
              factoryAddress := create(0, add(bytecode, 0x20), mload(bytecode))
                }
        return IFactory(factoryAddress);
    }

    function setUp() public {
        tokenBase = new ERC20PresetFixedSupply("Base", "BASE", 10000000*(10**18), address(this));

        tokenQuote = new ERC20PresetFixedSupply("Base", "BASE", 10000000*(10**18), address(this));

        factory = deployFactory();

        address pairAddress = factory.createPair(address(tokenBase), address(tokenQuote));

        pair = IPair(pairAddress);

        tokenBase.transfer(address(pair), 2474195218611459158903569);
        tokenQuote.transfer(address(pair), 1000002480398709503374);
        pair.mint(address(this));

        calibrator = new Calibrator(address(pair), address(tokenBase), address(tokenQuote));
    }

    function test_estimate() public {
        Estimator.Estimation memory estimation = calibrator.estimate(167,1);
        assertEq(estimation.reserveBase, 2474195218611459158903569);
    }
}

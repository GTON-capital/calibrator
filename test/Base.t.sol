pragma solidity 0.8.19;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import {ERC20PresetFixedSupply} from "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetFixedSupply.sol";
import {Base} from "../contracts/Base.sol";
import {IFactory} from "../contracts/interfaces/IFactory.sol";
import {IPair} from "../contracts/interfaces/IPair.sol";

contract BaseTestHarness is Base {
    constructor(
        address _pair,
        address _tokenBase,
        address _tokenQuote
    ) Base(_pair, _tokenBase, _tokenQuote) {}

    function exposed_sortTokens(
        address tokenA,
        address tokenB
    ) external pure returns (address token0, address token1) {
        return sortTokens(tokenA, tokenB);
    }
}

contract CalibratorTest is Test {
    BaseTestHarness base;
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

        base = new BaseTestHarness(address(pair), address(tokenBase), address(tokenQuote));
    }

    function test_constructor() public {
        assertTrue(address(base.pair()) == address(pair));
    }

    // function test_setFee() public {
    // }

    // function test_setPrecision() public {
    // }

    // function test_setMinimumBase() public {
    // }

    // function test_setVault() public {
    // }

    // function test_getVault() public {
    // }

    // function test_getRatio() public {
    // }

    // function test_sortTokens() public {
    // }
}

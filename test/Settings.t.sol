pragma solidity 0.8.19;

import "forge-std/Test.sol";
import {ERC20PresetFixedSupply} from "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetFixedSupply.sol";
import {Settings} from "contracts/Settings.sol";
import {IFactory} from "contracts/interfaces/IFactory.sol";
import {IPair} from "contracts/interfaces/IPair.sol";

contract SettingsTestHarness is Settings {
    constructor(
        address _pair,
        address _tokenBase,
        address _tokenQuote
    ) Settings(_pair, _tokenBase, _tokenQuote) {}

    function exposed_getVault() external view returns (address) {
        return getVault();
    }

    function exposed_sortTokens(
        address tokenA,
        address tokenB
    ) external pure returns (address token0, address token1) {
        return sortTokens(tokenA, tokenB);
    }
}

contract CalibratorTest is Test {
    SettingsTestHarness settings;
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

        settings = new SettingsTestHarness(
            address(pair),
            address(tokenBase),
            address(tokenQuote)
        );
    }

    function test_constructor() public {
        assertEq(address(settings.pair()), address(pair));
        assertEq(address(settings.tokenBase()), address(tokenBase));
        assertEq(address(settings.tokenQuote()), address(tokenQuote));
        assertEq(settings.vault(), address(0));
    }

    function testFuzz_setFee(
        uint256 feeNumerator,
        uint256 feeDenominator
    ) public {
        vm.assume(feeDenominator > 0);

        vm.assume(feeNumerator <= feeDenominator);

        settings.setFee(feeNumerator, feeDenominator);

        assertEq(settings.feeNumerator(), feeNumerator);
        assertEq(settings.feeDenominator(), feeDenominator);
    }

    function testFuzz_setFee_revertZero(uint256 feeNumerator) public {
        uint256 feeDenominator = 0;

        vm.expectRevert("setFee: division by 0");

        settings.setFee(feeNumerator, feeDenominator);
    }

    function testFuzz_setFee_revertImproper(uint256 feeNumerator, uint256 feeDenominator) public {
        vm.assume(feeDenominator > 0);

        vm.assume(feeNumerator > feeDenominator);

        vm.expectRevert("setFee: improper fraction");

        settings.setFee(feeNumerator, feeDenominator);
    }

    function testFuzz_setPrecision(
        uint256 precisionNumerator,
        uint256 precisionDenominator
    ) public {
        vm.assume(precisionDenominator > 0);

        vm.assume(precisionNumerator <= precisionDenominator);

        settings.setPrecision(precisionNumerator, precisionDenominator);

        assertEq(settings.precisionNumerator(), precisionNumerator);
        assertEq(settings.precisionDenominator(), precisionDenominator);
    }

    function testFuzz_setPrecision_revertZero(uint256 precisionNumerator) public {
        uint256 precisionDenominator = 0;

        vm.expectRevert("setPrecision: division by 0");

        settings.setPrecision(precisionNumerator, precisionDenominator);
    }

    function testFuzz_setPrecision_revertImproper(uint256 precisionNumerator, uint256 precisionDenominator) public {
        vm.assume(precisionDenominator > 0);

        vm.assume(precisionNumerator > precisionDenominator);

        vm.expectRevert("setPrecision: improper fraction");

        settings.setPrecision(precisionNumerator, precisionDenominator);
    }

    function testFuzz_setMinimumBase(uint256 minimumBase) public {
        settings.setMinimumBase(minimumBase);

        assertEq(settings.minimumBase(), minimumBase);
    }

    function testFuzz_setVault(address vault) public {
        settings.setVault(vault);

        assertEq(settings.vault(), vault);
    }

    function test_getVault_unset() public {
        assertEq(settings.exposed_getVault(), address(this));
    }

    function test_getVault_set(address vault) public {
        vm.assume(vault != address(0));

        settings.setVault(vault);

        assertEq(settings.exposed_getVault(), vault);
    }

    function test_getReserves() public {
        (uint256 reserveBase, uint256 reserveQuote) = settings.getReserves();

        assertEq(reserveBase, tokenBase.balanceOf(address(pair)));
        assertEq(reserveQuote, tokenQuote.balanceOf(address(pair)));
    }

    function testFuzz_sortTokens(address tokenA, address tokenB) public {
        vm.assume(tokenA != tokenB);

        vm.assume(tokenA != address(0) && tokenB != address(0));

        (address token0a, address token1a) = settings.exposed_sortTokens(
            tokenA,
            tokenB
        );

        (address token0b, address token1b) = settings.exposed_sortTokens(
            tokenB,
            tokenA
        );

        assertEq(token0a, token0b);
        assertEq(token1a, token1b);

        (address token0c, address token1c) = settings.exposed_sortTokens(
            token0a,
            token1a
        );

        assertEq(token0a, token0c);
        assertEq(token1a, token1c);
    }

    function testFuzz_sortTokens_revertIdentical(address token) public {
        vm.expectRevert("sortTokens: IDENTICAL_ADDRESSES");

        settings.exposed_sortTokens(token, token);
    }

    function testFuzz_sortTokens_revertZeroA(address token) public {
        vm.assume(token != address(0));

        vm.expectRevert("sortTokens: ZERO_ADDRESS");

        settings.exposed_sortTokens(address(0), token);
    }

    function testFuzz_sortTokens_revertZeroB(address token) public {
        vm.assume(token != address(0));

        vm.expectRevert("sortTokens: ZERO_ADDRESS");

        settings.exposed_sortTokens(token, address(0));
    }
}

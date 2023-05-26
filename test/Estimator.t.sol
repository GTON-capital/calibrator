pragma solidity 0.8.19;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import {ERC20PresetFixedSupply} from "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetFixedSupply.sol";
import {Calibrator} from "../contracts/Calibrator.sol";
import {Estimator} from "../contracts/Estimator.sol";
import {IFactory} from "../contracts/interfaces/IFactory.sol";
import {IPair} from "../contracts/interfaces/IPair.sol";

contract EstimatorTestHarness is Calibrator {
    constructor(
        address _pair,
        address _tokenBase,
        address _tokenQuote
    ) Calibrator(_pair, _tokenBase, _tokenQuote) {}

    function exposed_removeLiquidityDryrun(
        Estimation memory estimation,
        EstimationContext memory context,
        uint256 minimumBase
    ) external pure returns (Estimation memory, EstimationContext memory) {
        return removeLiquidityDryrun(estimation, context, minimumBase);
    }

    function exposed_swapToRatioDryrun(
        Estimation memory estimation,
        EstimationContext memory context,
        uint256 targetBase,
        uint256 targetQuote,
        uint256 feeNumerator,
        uint256 feeDenominator
    ) external pure returns (Estimation memory, EstimationContext memory) {
        return
            swapToRatioDryrun(
                estimation,
                context,
                targetBase,
                targetQuote,
                feeNumerator,
                feeDenominator
            );
    }

    function exposed_addLiquidityDryrun(
        Estimation memory estimation,
        EstimationContext memory context,
        uint256 reserveBaseInvariant
    ) external pure returns (Estimation memory) {
        return addLiquidityDryrun(estimation, context, reserveBaseInvariant);
    }
}

contract CalibratorTest is Test {
    EstimatorTestHarness estimator;
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

        estimator = new EstimatorTestHarness(
            address(pair),
            address(tokenBase),
            address(tokenQuote)
        );
    }

    function test_estimate() public {
        Estimator.Estimation memory estimation = estimator.estimate(167, 1);

        assertEq(estimation.reserveBase, 2474195218611459158903569);
    }

    function test_removeLiquidityDryrun() public {
        Estimator.Estimation memory estimation;
        estimation.reserveBase = 10;
        estimation.reserveQuote = 10;
        Estimator.EstimationContext memory context;
        context.vaultLiquidity = 10;
        context.totalSupply = 10;
        uint256 minimumBase = 1;

        (estimation, context) = estimator.exposed_removeLiquidityDryrun(
            estimation,
            context,
            minimumBase
        );

        assertTrue(estimation.reserveQuote == 1);
    }

    function test_swapToRatioDryrun() public {
        Estimator.Estimation memory estimation;
        estimation.reserveBase = 10;
        estimation.reserveQuote = 10;
        Estimator.EstimationContext memory context;
        context.availableQuote = 10;
        uint256 targetBase = 5;
        uint256 targetQuote = 10;
        uint256 feeNumerator = 1;
        uint256 feeDenominator = 1;

        (estimation, context) = estimator.exposed_swapToRatioDryrun(
            estimation,
            context,
            targetBase,
            targetQuote,
            feeNumerator,
            feeDenominator
        );

        assertTrue(estimation.baseToQuote == false);
    }

    // function test_addLiquidityDryrun() public {
    // }
}

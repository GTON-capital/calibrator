import { BigNumber as BN } from "bignumber.js";
import { ethers } from "hardhat";
import { BigNumber, utils, constants } from "ethers"
import {
    abi as FactoryABI,
    bytecode as FactoryBytecode
} from "@gton/ogs-core/build/OGXFactory.json"
import {
    abi as PairABI,
    bytecode as PairBytecode
} from "@gton/ogs-core/build/OGXPair.json"
import {
    abi as ERC20ABI,
    bytecode as ERC20Bytecode
} from "@openzeppelin/contracts/build/contracts/ERC20PresetFixedSupply.json"

import { IERC20, IFactory, IPair } from "~/typechain-types"

// Note: OGXT
const BASE_TOTAL_LIQUIDITY = BigNumber.from('6003000200000000000000000');

// Note: simTSLA
const QUOTE_TOTAL_LIQUIDITY = BigNumber.from('1000000000000000000000000');

async function main() {
    const [wallet, other, vault] = await ethers.getSigners()

    const tokenFactory = await ethers.getContractFactory(
        ERC20ABI,
        ERC20Bytecode
    )

    const tokenBase = (await tokenFactory.deploy(
        "Base",
        "BASE",
        BASE_TOTAL_LIQUIDITY,
        wallet.address
    )) as IERC20

    const tokenQuote = (await tokenFactory.deploy(
        "Quote",
        "QUOT",
        QUOTE_TOTAL_LIQUIDITY,
        wallet.address
    )) as IERC20

    const factory = await ethers.getContractFactory(
        FactoryABI,
        FactoryBytecode
    ).then((contract) => contract.deploy(wallet.address)) as IFactory

    await factory.createPair(tokenQuote.address, tokenBase.address)

    let pairAddress = await factory.getPair(
        tokenQuote.address,
        tokenBase.address
    )

    const pair = (await ethers.getContractFactory(
        PairABI,
        PairBytecode
    )).attach(pairAddress) as IPair

    const calibrator = await ethers.getContractFactory(
        "Calibrator"
    ).then((contract) => contract.deploy(
        pair.address,
        tokenBase.address,
        tokenQuote.address
    ));

    await calibrator.setMinimumBase(100000000000000)

    // Note: OGXT
    const startingReserveBase = BigNumber.from("2474195218611459158903569");

    // Note: simTSLA
    const startingReserveQuote = BigNumber.from("1000002480398709503374");

    await tokenBase.transfer(pair.address, startingReserveBase);

    await tokenQuote.transfer(pair.address, startingReserveQuote);

    await pair.mint(wallet.address);

    await pair.connect(vault).transfer(
        "0x0000000000000000000000000000000000000000",
        await pair.balanceOf(vault.address))

    await calibrator.setVault(vault.address)

    await pair.transfer(vault.address, await pair.balanceOf(wallet.address));

    await tokenQuote.transfer(vault.address, await tokenQuote.balanceOf(wallet.address));

    await tokenBase.transfer(vault.address, await tokenBase.balanceOf(wallet.address));

    await pair.connect(vault).approve(calibrator.address, constants.MaxUint256);

    await tokenQuote.connect(vault).approve(calibrator.address, constants.MaxUint256);

    const testCasesUSD = [
        187.04,
        184.31,
        180.59,
        162.99,
        162.55,
        160.67,
        153.75,
        160.19,
        164.31,
        164.31,
        161.83,
        160.31,
        160.61,
        160.61,
        161.20,
        170.06,
        171.79,
        169.15,
        168.54,
        172.08,
        169.05,
    ];

    const ogxtRate = 0.0674206;

    function tslaRate(reserveBase, reserveQuote) {
        const ogxtToTsla = (new BN(reserveBase.toString())).div(new BN(reserveQuote.toString()))

        const tslaToUsd = ogxtToTsla.times(new BN(ogxtRate))

        return tslaToUsd.toString()
    }

    for (let i = 0; i < testCasesUSD.length; i++) {
        const testCase = testCasesUSD[i];

        const liquidityBalanceBefore = await pair.balanceOf(vault.address);

        await pair.approve(calibrator.address, liquidityBalanceBefore);

        const quoteBalance = await tokenQuote.balanceOf(vault.address);
        
        await tokenQuote.approve(calibrator.address, quoteBalance);

        const [reserveBaseBefore, reserveQuoteBefore] = await calibrator.getReserves();

        console.log(`\n\nCalibrator - Test ${i + 1} (${testCase}):`);
        console.log({
            ratio: tslaRate(reserveBaseBefore, reserveQuoteBefore),
            reserveBase: utils.formatEther(reserveBaseBefore),
            reserveQuote: utils.formatEther(reserveQuoteBefore),
            liquidity: utils.formatEther(liquidityBalanceBefore)
        });

        const ratePrecision = 1000;

        const targetBase = (new BN(testCase)).div(new BN(ogxtRate)).times(ratePrecision).integerValue().toString();

        const targetQuote = ratePrecision;

        console.log({
            targetBase,
            targetQuote
        })

        await calibrator.setRatio(
            targetBase,
            targetQuote,
        );

        const liquidityBalanceAfter = await pair.balanceOf(vault.address);
        
        const [reserveBaseAfter, reserveQuoteAfter] = await calibrator.getReserves();

        console.log({
            ratio: tslaRate(reserveBaseAfter, reserveQuoteAfter),
            reserveBase: utils.formatEther(reserveBaseAfter),
            reserveQuote: utils.formatEther(reserveQuoteAfter),
            liquidity: utils.formatEther(liquidityBalanceAfter)
        });
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

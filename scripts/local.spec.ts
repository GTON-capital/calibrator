import { BigNumber as BN } from "bignumber.js";
import { ethers } from "hardhat";
import { BigNumber, utils } from "ethers"
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
    const [wallet] = await ethers.getSigners()

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

    async function getReserves() {
        const [reserve0, reserve1] = await pair.getReserves();

        const token0 = await pair.token0();

        const [reserveBase, reserveQuote] = tokenBase.address === token0
            ? [reserve0, reserve1]
            : [reserve1, reserve0];

        return [reserveBase, reserveQuote]
    }

    for (let i = 0; i < testCasesUSD.length; i++) {
        const testCase = testCasesUSD[i];

        const liquidityBalanceBefore = await pair.balanceOf(wallet.address);

        await pair.approve(calibrator.address, liquidityBalanceBefore);

        const quoteBalance = await tokenQuote.balanceOf(wallet.address);
        
        await tokenQuote.approve(calibrator.address, quoteBalance);

        const [reserveBaseBefore, reserveQuoteBefore] = await getReserves();

        console.log(`\n\nCalibrator - Test ${i + 1} (${testCase}):`);
        console.log({
            test: `Before price - ${testCase}`,
            liquidity: utils.formatEther(liquidityBalanceBefore),
            reserveBase: utils.formatEther(reserveBaseBefore),
            reserveQuote: utils.formatEther(reserveQuoteBefore),
            ratio: tslaRate(reserveBaseBefore, reserveQuoteBefore)
        });

        
        await calibrator.setRatio(
            (new BN(testCase)).div(new BN(ogxtRate)).times(1000).integerValue().toString(),
            "1000"
        );
    
    
        const liquidityBalanceAfter = await pair.balanceOf(wallet.address);
        
        const [reserveBaseAfter, reserveQuoteAfter] = await getReserves();

        console.log({
            test: `After price - ${testCase}`,
            liquidity: utils.formatEther(liquidityBalanceAfter),
            reserveBase: utils.formatEther(reserveBaseAfter),
            reserveQuote: utils.formatEther(reserveQuoteAfter),
            ratio: tslaRate(reserveBaseAfter, reserveQuoteAfter)
        });
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

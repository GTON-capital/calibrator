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

import { expandTo18Decimals } from "../test/shared/utilities"

// Note: simTSLA
const BASE_TOTAL_LIQUIDITY = expandTo18Decimals(1000000);

// Note: OGXT
const QUOTE_TOTAL_LIQUIDITY = expandTo18Decimals(1000000);

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
    
    // Note: simTSLA
    const startingReserveBase = BigNumber.from("518159171586236237881");
    
    // Note: OGXT
    const startingReserveQuote = BigNumber.from("416532198152771088894342");

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


    for (let i = 0; i < testCasesUSD.length; i++) {
        const testCase = testCasesUSD[i];

        const liquidityBalance = await pair.balanceOf(wallet.address);

        await pair.approve(calibrator.address, liquidityBalance);

        const quoteBalance = await tokenQuote.balanceOf(wallet.address);

        await tokenQuote.approve(calibrator.address, quoteBalance);

        let [reserveBase, reserveQuote] = await pair.getReserves();

        console.log({
            test: `${testCase} before`,
            liquidity: utils.formatEther(liquidityBalance),
            reserveBase: utils.formatEther(reserveBase),
            reserveQuote: utils.formatEther(reserveQuote),
            ratio: (new BN(reserveQuote.toString())).div(new BN(reserveBase.toString())).toString()
        });

        await calibrator.setRatio(
          "100",
          new BN(testCase).times(100).toString(),
        );

        [reserveBase, reserveQuote] = await pair.getReserves();

        console.log({
            test: `${testCase} after`,
            liquidity: utils.formatEther(liquidityBalance),
            reserveBase: utils.formatEther(reserveBase),
            reserveQuote: utils.formatEther(reserveQuote),
            ratio: (new BN(reserveQuote.toString())).div(new BN(reserveBase.toString())).toString()
        });
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

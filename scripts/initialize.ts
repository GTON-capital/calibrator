import { ethers } from "hardhat";
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

async function main() {
    const [wallet] = await ethers.getSigners()

    const addressFactory = "0x0000000000000000000000000000000000000000";
    const addressBase = "0x0000000000000000000000000000000000000000";
    const addressQuote = "0x0000000000000000000000000000000000000000";
    const addressPair = "0x0000000000000000000000000000000000000000";
    const addressCalibrator = "0x0000000000000000000000000000000000000000";

    const tokenFactory = await ethers.getContractFactory(
        ERC20ABI,
        ERC20Bytecode
    )

    const tokenBase = (await tokenFactory.attach(addressBase)) as IERC20

    const tokenQuote = (await tokenFactory.attach(addressQuote)) as IERC20

    const pair = (await ethers.getContractFactory(
        PairABI,
        PairBytecode
    )).attach(addressPair) as IPair

    const calibrator = (await ethers.getContractFactory(
        "Calibrator"
    )).attach(addressCalibrator);

    let liquidityBase = expandTo18Decimals(10);

    let liquidityQuote = expandTo18Decimals(50);

    await tokenBase.transfer(pair.address, liquidityBase);

    await tokenQuote.transfer(pair.address, liquidityQuote);

    await pair.mint(wallet.address);

    const liquidityBalance = pair.balanceOf(wallet.address);

    const quoteBalance = quoteToken.balanceOf(wallet.address);

    await tokenQuote.approve(calibrator.address, quoteBalance);

    await pair.approve(calibrator.address, liquidityBalance);

    await calibrator.setRatio("100", "18704");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

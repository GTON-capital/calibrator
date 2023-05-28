import { ethers } from "hardhat";
import {
    abi as PairABI,
    bytecode as PairBytecode
} from "@gton/ogs-core/build/OGXPair.json"
import {
    abi as ERC20ABI,
    bytecode as ERC20Bytecode
} from "@openzeppelin/contracts/build/contracts/ERC20PresetFixedSupply.json"

import { IERC20, IPair } from "~/typechain-types"

import { expandTo18Decimals } from "../test/shared/utilities"

async function main() {
    const [wallet] = await ethers.getSigners()

    const addressBase = "0x7c6b91D9Be155A6Db01f749217d76fF02A7227F2";
    const addressQuote = "0xBca5De3E6Ea3B39770C0a6EF3793e8fA6424031e";
    const addressPair = "0x45581064DE5264f458C59bbF861BA01142cC5b0b";
    const addressCalibrator = "0x0df83cfb2f1bD77d8c26fd12308f752052c6be3F";

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

    const [reserveBase, reserveQuote] = await calibrator.getReserves()

    console.log(reserveBase, reserveQuote);

    const res = await calibrator.estimate(2507394, 1000)

    console.log(res)
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

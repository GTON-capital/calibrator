import { ethers } from "hardhat";
import { IERC20 } from "../../typechain/IERC20"
import { IPair } from "../../typechain/IPair"
import { IFactory } from "../../typechain/IFactory"
import { Calibrator } from "../../typechain/Calibrator"
import { BigNumber } from "ethers"
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

import { expandTo18Decimals } from "../test/shared/utilities"

async function main() {
    const [wallet] = await ethers.getSigners()

    const addressFactory = "0x62A7423a4a6ee0F9e84c8cC26ea650c90310C0C2";
    const addressBase = "0x97563a815bec1d87c56af3b4f20ec70c31ad157b";
    const addressQuote = "0xe72cc60641179025a6d819dc0ebf90cc8e7da2c6";
    const addressPair = "0x06b83d8642880973E76365f5CDbc4ba4F8CbBC56";
    const addressCalibrator = "0x23CCa63830972575923db5A4cCdE11fe0d0A5eE7";

    const tokenFactory = await ethers.getContractFactory(
        ERC20ABI,
        ERC20Bytecode
    )

    const tokenBase = (await tokenFactory.attach(addressBase)) as IERC20

    const tokenQuote = (await tokenFactory.attach(addressQuote)) as IERC20

    const factory = (await ethers.getContractFactory(
        FactoryABI,
        FactoryBytecode
    )).attach(addressFactory) as IFactory

    const pair = (await ethers.getContractFactory(
        PairABI,
        PairBytecode
    )).attach(addressPair) as IPair

    // const calibrator = (await ethers.getContractFactory(
    //     "Calibrator"
    // )).attach(addressCalibrator);

    let liquidityBase = expandTo18Decimals(10)

    let liquidityQuote = expandTo18Decimals(50)

    // await tokenBase.transfer(pair.address, liquidityBase)

    // await tokenQuote.transfer(pair.address, liquidityQuote)

    // await pair.mint(wallet.address);



    // const calibrator = await ethers.getContractFactory(
    //     "Calibrator"
    // ).then((contract) => contract.deploy(
    //     pair.address,
    //     tokenBase.address,
    //     tokenQuote.address
    // ));

     const liquidity = pair.balanceOf(wallet.address);

     await tokenQuote.approve(calibrator.address, liquidityQuote);

     await pair.approve(calibrator.address, liquidity);

    await calibrator.setRatio("10", "45");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

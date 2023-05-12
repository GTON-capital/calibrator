import { ethers } from "hardhat";
import { BigNumber } from "ethers"
import { IERC20 } from "../../typechain/IERC20"
import { IPair } from "../../typechain/IPair"
import { IFactory } from "../../typechain/IFactory"
import { Calibrator } from "../../typechain/Calibrator"
import {
    abi as FactoryABI,
    bytecode as FactoryBytecode
} from "@gton-capital/ogs-core/build/OGXFactory.json"
import {
    abi as PairABI,
    bytecode as PairBytecode
} from "@gton-capital/ogs-core/build/OGXPair.json"
import {
    abi as ERC20ABI,
    bytecode as ERC20Bytecode
} from "@openzeppelin/contracts/build/contracts/ERC20PresetFixedSupply.json"

import { expandTo18Decimals } from "../test/shared/utilities"

async function main() {
    const [wallet] = await ethers.getSigners()

    const tokenFactory = await ethers.getContractFactory(
        ERC20ABI,
        ERC20Bytecode
    )

    const tokenBase = (await tokenFactory.deploy(
        "Base",
        "BASE",
        BigNumber.from(2).pow(255),
        wallet.address
    )) as IERC20

    const tokenQuote = (await tokenFactory.deploy(
        "Quote",
        "QUOT",
        BigNumber.from(2).pow(255),
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

    let liquidityBase = expandTo18Decimals(10)

    let liquidityQuote = expandTo18Decimals(50)

    await tokenBase.transfer(pair.address, liquidityBase)

    await tokenQuote.transfer(pair.address, liquidityQuote)

    await pair.mint(wallet.address);

    const liquidity = pair.balanceOf(wallet.address);

    await tokenQuote.approve(calibrator.address, liquidityQuote);

    await pair.approve(calibrator.address, liquidity);

    await calibrator.setRatio(10, 40);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

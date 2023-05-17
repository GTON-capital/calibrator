import { ethers } from "hardhat";
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

import { IERC20, IFactory, IPair } from "~/typechain-types"

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

    console.log({
        wallet: wallet.address,
        base: tokenBase.address,
        quote: tokenQuote.address,
        factory: factory.address,
        pair: pair.address,
        calibrator: calibrator.address
    })
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

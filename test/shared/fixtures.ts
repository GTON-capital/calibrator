import { ethers, waffle } from "hardhat"
import { BigNumber } from "ethers"
import { IERC20 } from "../../typechain/IERC20"
import { IPair } from "../../typechain/IPair"
import { IFactory } from "../../typechain/IFactory"
import { IRouter02 } from "../../typechain/IRouter02"
import {
  abi as ERC20ABI,
  bytecode as ERC20Bytecode
} from "@openzeppelin/contracts/build/contracts/ERC20PresetFixedSupply.json"
import {
  abi as FactoryABI,
  bytecode as FactoryBytecode
} from "@gton-capital/ogs-core/build/OGXFactory.json"
import {
  abi as PairABI,
  bytecode as PairBytecode
} from "@gton-capital/ogs-core/build/OGXPair.json"
import {
  abi as WETH9ABI,
  bytecode as WETH9Bytecode
} from "@gton-capital/ogs-periphery/build/WETH9.json"
import {
  abi as Router02ABI,
  bytecode as Router02Bytecode
} from "@gton-capital/ogs-periphery/build/OGXRouter02.json"

import { expandTo18Decimals } from "./utilities"

import { Fixture } from "ethereum-waffle"

interface TokensFixture {
  tokenBase: IERC20
  tokenQuote: IERC20
  weth: IERC20
}

export const tokensFixture: Fixture<TokensFixture> = async function(
  [wallet, other],
  provider
): Promise<TokensFixture> {
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

  const weth = await ethers.getContractFactory(
    WETH9ABI,
    WETH9Bytecode
  ).then((contract) => contract.deploy()) as IERC20

  return { tokenBase, tokenQuote, weth }
}

interface UniswapFixture extends TokensFixture {
  factory: IFactory
  router: IRouter02
  pair: IPair
}

export const uniswapFixture: Fixture<UniswapFixture> = async function(
  [wallet, other],
  provider
): Promise<UniswapFixture> {
  const {
    tokenBase,
    tokenQuote,
    weth
  } = await tokensFixture([wallet, other], provider)

  const factory = await ethers.getContractFactory(
    FactoryABI,
    FactoryBytecode
  ).then((contract) => contract.deploy(wallet.address)) as IFactory

  const router = await ethers.getContractFactory(
    Router02ABI,
    Router02Bytecode
  ).then((contract) => contract.deploy(
    factory.address,
    weth.address
  )) as IRouter02

  await factory.createPair(tokenQuote.address, tokenBase.address)

  let pairAddress = await factory.getPair(
    tokenQuote.address,
    tokenBase.address
  )

  const pair = (await ethers.getContractFactory(
    PairABI,
    PairBytecode
  )).attach(pairAddress) as IPair

  let block = await wallet.provider.getBlock("latest")

  let timestamp = block.timestamp

  // `wallet` account adds liquidity
  let liquidityBase = expandTo18Decimals(10)

  let liquidityQuote = expandTo18Decimals(50)

  await tokenBase.approve(router.address, liquidityBase)

  await tokenQuote.approve(router.address, liquidityQuote)

  await router.addLiquidity(
    tokenBase.address,
    tokenQuote.address,
    liquidityBase,
    liquidityQuote,
    liquidityBase,
    liquidityQuote,
    wallet.address,
    timestamp + 3600
  )

  const liquidity = await pair.balanceOf(wallet.address);

  await pair.approve(router.address, liquidity);

  // reapply liquidity to ignore 10**3 lp that is lost on pool initialization
  await router.removeLiquidity(
    tokenBase.address,
    tokenQuote.address,
    liquidity,
    0,
    0,
    wallet.address,
    timestamp + 3600
  );

  const [reserveBase, reserveQuote] = await pair.getReserves();

  liquidityBase = (liquidityBase).sub(reserveBase);

  // Library.quote()
  liquidityQuote = liquidityBase.mul(reserveQuote).div(reserveBase);

  await tokenBase.approve(router.address, liquidityBase);

  await tokenQuote.approve(router.address, liquidityQuote);

  await router.addLiquidity(
    tokenBase.address,
    tokenQuote.address,
    liquidityBase,
    liquidityQuote,
    liquidityBase,
    0,
    wallet.address,
    timestamp + 3600
  )

  // base reserve     "10000000000000000000"
  // quote reserve    "49933035714285714285"
  // liquidityBalance "22321428571428570428"

  return {
    tokenBase,
    tokenQuote,
    weth,
    factory,
    router,
    pair
  }
}

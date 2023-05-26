import { ethers } from "hardhat"
import { Fixture } from "ethereum-waffle"
import { BigNumber } from "ethers"
import {
  abi as ERC20ABI,
  bytecode as ERC20Bytecode,
} from "@openzeppelin/contracts/build/contracts/ERC20PresetFixedSupply.json"
import {
  abi as FactoryABI,
  bytecode as FactoryBytecode,
} from "@gton/ogs-core/build/OGXFactory.json"
import {
  abi as PairABI,
  bytecode as PairBytecode,
} from "@gton/ogs-core/build/OGXPair.json"
import {
  abi as WETH9ABI,
  bytecode as WETH9Bytecode,
} from "@gton/ogs-periphery/build/WETH9.json"
import {
  abi as Router02ABI,
  bytecode as Router02Bytecode,
} from "@gton/ogs-periphery/build/OGXRouter02.json"

import {
  Calibrator,
  IERC20,
  IFactory,
  IPair,
  IRouter02,
} from "~/typechain-types"

import { expandTo18Decimals } from "./utilities"

interface TokensFixture {
  tokenBase: IERC20
  tokenQuote: IERC20
  weth: IERC20
}

export const tokensFixture: Fixture<TokensFixture> = async function (
  [wallet, other],
  provider
): Promise<TokensFixture> {
  const tokenFactory = await ethers.getContractFactory(ERC20ABI, ERC20Bytecode)

  const tokenBase = (await tokenFactory.deploy(
    "Base",
    "BASE",
    expandTo18Decimals(1000000),
    wallet.address
  )) as IERC20

  const tokenQuote = (await tokenFactory.deploy(
    "Quote",
    "QUOT",
    expandTo18Decimals(1000000),
    wallet.address
  )) as IERC20

  const weth = (await ethers
    .getContractFactory(WETH9ABI, WETH9Bytecode)
    .then((contract) => contract.deploy())) as IERC20

  return { tokenBase, tokenQuote, weth }
}

interface UniswapFixture extends TokensFixture {
  factory: IFactory
  router: IRouter02
  pair: IPair
}

export const uniswapFixture: Fixture<UniswapFixture> = async function (
  [wallet, other],
  provider
): Promise<UniswapFixture> {
  const { tokenBase, tokenQuote, weth } = await tokensFixture(
    [wallet, other],
    provider
  )

  const factory = (await ethers
    .getContractFactory(FactoryABI, FactoryBytecode)
    .then((contract) => contract.deploy(wallet.address))) as IFactory

  const router = (await ethers
    .getContractFactory(Router02ABI, Router02Bytecode)
    .then((contract) =>
      contract.deploy(factory.address, weth.address)
    )) as IRouter02

  await factory.createPair(tokenQuote.address, tokenBase.address)

  let pairAddress = await factory.getPair(tokenQuote.address, tokenBase.address)

  const pair = (await ethers.getContractFactory(PairABI, PairBytecode)).attach(
    pairAddress
  ) as IPair

  let block = await wallet.provider.getBlock("latest")

  let timestamp = block.timestamp

  // `wallet` account adds liquidity
  let liquidityBase = BigNumber.from("518159171586236237881")

  let liquidityQuote = BigNumber.from("416532198152771088894342")

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

  // `other` account adds liquidity
  const liquidityBaseOther = BigNumber.from(518000)

  const liquidityQuoteOther = BigNumber.from(416000)

  await tokenBase.transfer(other.address, liquidityBaseOther)

  await tokenQuote.transfer(other.address, liquidityQuoteOther)

  await tokenBase.connect(other).approve(router.address, liquidityBaseOther)

  await tokenQuote.connect(other).approve(router.address, liquidityQuoteOther)

  block = await wallet.provider.getBlock("latest")

  timestamp = block.timestamp

  await router
    .connect(other)
    .addLiquidity(
      tokenBase.address,
      tokenQuote.address,
      liquidityBaseOther,
      liquidityQuoteOther,
      0,
      0,
      other.address,
      timestamp + 3600
    )

  // reapply liquidity
  // to ignore 10**3 lp that is lost on pool initialization
  // and liquidity of `other`
  // and to reset base reserve to a round number
  const liquidity = await pair.balanceOf(wallet.address)

  await pair.approve(router.address, liquidity)

  await router.removeLiquidity(
    tokenBase.address,
    tokenQuote.address,
    liquidity,
    0,
    0,
    wallet.address,
    timestamp + 3600
  )

  const [reserve0, reserve1] = await pair.getReserves()

  const token0 = await pair.token0()

  const [reserveBase, reserveQuote] =
    tokenBase.address === token0 ? [reserve0, reserve1] : [reserve1, reserve0]

  liquidityBase = liquidityBase.sub(reserveBase)

  // Library.quote()
  liquidityQuote = liquidityBase.mul(reserveQuote).div(reserveBase)

  await tokenBase.approve(router.address, liquidityBase)

  await tokenQuote.approve(router.address, liquidityQuote)

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

  return {
    tokenBase,
    tokenQuote,
    weth,
    factory,
    router,
    pair,
  }
}

interface CalibratorFixture extends UniswapFixture {
  calibrator: Calibrator
}

export const calibratorFixture: Fixture<CalibratorFixture> = async function (
  [wallet, other],
  provider
): Promise<CalibratorFixture> {
  const { tokenBase, tokenQuote, weth, router, factory, pair } =
    await uniswapFixture([wallet, other], provider)

  const calibrator = (await ethers
    .getContractFactory("Calibrator")
    .then((contract) =>
      contract.deploy(pair.address, tokenBase.address, tokenQuote.address)
    )) as Calibrator

  return {
    tokenBase,
    tokenQuote,
    weth,
    router,
    factory,
    pair,
    calibrator,
  }
}

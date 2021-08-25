import { ethers, waffle } from "hardhat"
import { BigNumber } from "ethers"

import { TestERC20 } from "../../typechain/TestERC20"
import { WrappedNative } from "../../typechain/WrappedNative"
import { UniswapV2Pair } from "../../typechain/UniswapV2Pair"
import { UniswapV2Factory } from "../../typechain/UniswapV2Factory"
import { UniswapV2Router01 } from "../../typechain/UniswapV2Router01"
import { Calibrator } from "../../typechain/Calibrator"

import { MdexPair } from "../../typechain/MdexPair"
import { MdexFactory } from "../../typechain/MdexFactory"
import { MdexRouter } from "../../typechain/MdexRouter"

import {
  expandTo18Decimals,
} from "./utilities"

import { Fixture } from "ethereum-waffle"

interface TokensFixture {
  token0: TestERC20
  token1: TestERC20
  token2: TestERC20
  weth: WrappedNative
}

export const tokensFixture: Fixture<TokensFixture> =
  async function (
    [wallet, other],
    provider
  ): Promise<TokensFixture> {
  const tokenFactory = await ethers.getContractFactory("TestERC20")
  const tokenA = (await tokenFactory.deploy(
    BigNumber.from(2).pow(255)
  )) as TestERC20
  const tokenB = (await tokenFactory.deploy(
    BigNumber.from(2).pow(255)
  )) as TestERC20
  const tokenC = (await tokenFactory.deploy(
    BigNumber.from(2).pow(255)
  )) as TestERC20

  const [token0, token1, token2] = [tokenA, tokenB, tokenC].sort(
    (tokenA, tokenB) =>
      tokenA.address.toLowerCase() < tokenB.address.toLowerCase() ? -1 : 1
  )

  const wethFactory = await ethers.getContractFactory("WrappedNative")
  let weth = await wethFactory.deploy() as WrappedNative
  weth = await wethFactory.deploy() as WrappedNative
  weth = await wethFactory.deploy() as WrappedNative
  weth = await wethFactory.deploy() as WrappedNative
  weth = await wethFactory.deploy() as WrappedNative
  weth = await wethFactory.deploy() as WrappedNative

  return { token0, token1, token2, weth }
}

interface UniswapFixture extends TokensFixture {
  uniswapV2Factory: UniswapV2Factory
  uniswapV2Router01: UniswapV2Router01
  uniswapV2PairGTON_WETH: UniswapV2Pair
  uniswapV2PairGTON_USDC: UniswapV2Pair
  mdexFactory: MdexFactory
  mdexRouter: MdexRouter
  mdexPairGTON_WETH: MdexPair
}

const uniswapFixture: Fixture<UniswapFixture> =
  async function (
    [wallet, other],
    provider
  ): Promise<UniswapFixture> {
  const { token0: gton, token1: usdt, token2: usdc, weth: weth } = await tokensFixture([wallet, other], provider)

  const uniswapV2FactoryFactory = await ethers.getContractFactory(
    "UniswapV2Factory"
  )
  const uniswapV2Factory = await uniswapV2FactoryFactory.deploy(
    wallet.address
  ) as UniswapV2Factory

  await uniswapV2Factory.setFeeTo(other.address)

  const uniswapV2Router01Factory = await ethers.getContractFactory(
    "UniswapV2Router01"
  )
  const uniswapV2Router01 = await uniswapV2Router01Factory.deploy(
    uniswapV2Factory.address,
    weth.address
  ) as UniswapV2Router01

  await uniswapV2Factory.createPair(weth.address, gton.address)

  const uniswapV2PairFactory = await ethers.getContractFactory(
    "UniswapV2Pair"
  )
  // log pairV2 bytecode for init code hash in the router
  // let bytecode = uniswapV2PairFactory.bytecode
  // console.log(ethers.utils.solidityKeccak256(["bytes"],[bytecode]))
  let pairAddressGTON_WETH = await uniswapV2Factory.getPair(weth.address, gton.address)
  const uniswapV2PairGTON_WETH = uniswapV2PairFactory.attach(pairAddressGTON_WETH) as UniswapV2Pair

  let liquidityGTON
  let block
  let timestamp

  liquidityGTON = expandTo18Decimals(10)
  let liquidityWETH = expandTo18Decimals(20)
  await gton.approve(uniswapV2Router01.address, liquidityGTON)
  block = await wallet.provider.getBlock("latest")
  timestamp = block.timestamp
  // let k = await uniswapV2PairGTON_WETH.kLast()
  // console.log(k.toString())
  await uniswapV2Router01.addLiquidityETH(
    gton.address,
    liquidityGTON,
    liquidityGTON,
    liquidityWETH,
    wallet.address,
    timestamp + 3600,
    {value: liquidityWETH}
  )
  // k = await uniswapV2PairGTON_WETH.kLast()
  // console.log(k.toString())

  await uniswapV2Factory.createPair(usdc.address, gton.address)

  // log pairV2 bytecode for init code hash in the router
  // let bytecode = uniswapV2PairFactory.bytecode
  // console.log(ethers.utils.solidityKeccak256(["bytes"],[bytecode]))
  let pairAddressGTON_USDC = await uniswapV2Factory.getPair(usdc.address, gton.address)
  const uniswapV2PairGTON_USDC = uniswapV2PairFactory.attach(pairAddressGTON_USDC) as UniswapV2Pair

  liquidityGTON = expandTo18Decimals(10)
  let liquidityUSDC = expandTo18Decimals(50)
  await gton.approve(uniswapV2Router01.address, liquidityGTON)
  await usdc.approve(uniswapV2Router01.address, liquidityUSDC)
  block = await wallet.provider.getBlock("latest")
  timestamp = block.timestamp
  let k = await uniswapV2PairGTON_USDC.kLast()
  // console.log(k.toString())
  await uniswapV2Router01.addLiquidity(
    gton.address,
    usdc.address,
    liquidityGTON,
    liquidityUSDC,
    liquidityGTON,
    liquidityUSDC,
    wallet.address,
    timestamp + 3600
  )

  k = await uniswapV2PairGTON_USDC.kLast()
  // console.log(k.toString())
  liquidityGTON = BigNumber.from(1)
  liquidityUSDC = BigNumber.from(5)
  await gton.transfer(other.address, liquidityGTON)
  await usdc.transfer(other.address, liquidityUSDC)
  await gton.connect(other).approve(uniswapV2Router01.address, liquidityGTON)
  await usdc.connect(other).approve(uniswapV2Router01.address, liquidityUSDC)
  block = await wallet.provider.getBlock("latest")
  timestamp = block.timestamp
  await uniswapV2Router01.connect(other).addLiquidity(
    gton.address,
    usdc.address,
    liquidityGTON,
    liquidityUSDC,
    liquidityGTON,
    liquidityUSDC,
    wallet.address,
    timestamp + 3600
  )

  const mdexFactoryFactory = await ethers.getContractFactory(
    "MdexFactory"
  )
  const mdexFactory = await mdexFactoryFactory.deploy(
    wallet.address
  ) as MdexFactory

  // console.log(await mdexFactory.getInitCodeHash())
  await mdexFactory.setInitCodeHash("0x0fd8d405689cfdaa9e8621294709df601788f38378a22ebcaff404049bf31af9")

  await mdexFactory.setFeeTo(other.address)
  await mdexFactory.setFeeToRate(2)

  const mdexRouterFactory = await ethers.getContractFactory(
    "MdexRouter"
  )

  const mdexRouter = await mdexRouterFactory.deploy(
    mdexFactory.address,
    weth.address
  ) as MdexRouter

  await mdexFactory.createPair(weth.address, gton.address)

  const mdexPairFactory = await ethers.getContractFactory(
    "MdexPair"
  )
  // log pairV2 bytecode for init code hash in the router
  // let bytecode = uniswapV2PairFactory.bytecode
  // console.log(ethers.utils.solidityKeccak256(["bytes"],[bytecode]))
  pairAddressGTON_WETH = await mdexFactory.getPair(weth.address, gton.address)
  const mdexPairGTON_WETH = mdexPairFactory.attach(pairAddressGTON_WETH) as MdexPair

  liquidityGTON = BigNumber.from("733147580690169526")
  liquidityWETH = BigNumber.from("307447487")
  await gton.approve(mdexRouter.address, liquidityGTON)
  block = await wallet.provider.getBlock("latest")
  timestamp = block.timestamp
  await mdexRouter.addLiquidityETH(
    gton.address,
    liquidityGTON,
    liquidityGTON,
    liquidityWETH,
    wallet.address,
    timestamp + 3600,
    {value: liquidityWETH}
  )
  // console.log(
  //   "lp balance",
  //   (await mdexPairGTON_WETH.balanceOf(wallet.address)).toString()
  // )

  liquidityGTON = BigNumber.from("7331475806")
  liquidityWETH = BigNumber.from("3")
  await gton.transfer(other.address, liquidityGTON)
  await wallet.sendTransaction({
    to: other.address,
    value: liquidityWETH
  })
  await gton.connect(other).approve(mdexRouter.address, liquidityGTON)
  block = await wallet.provider.getBlock("latest")
  timestamp = block.timestamp
  await mdexRouter.connect(other).addLiquidityETH(
    gton.address,
    liquidityGTON,
    liquidityGTON,
    liquidityWETH,
    wallet.address,
    timestamp + 3600,
    {value: liquidityWETH}
  )

  return {
    token0: gton,
    token1: usdt,
    token2: usdc,
    weth,
    uniswapV2Factory,
    uniswapV2Router01,
    uniswapV2PairGTON_WETH,
    uniswapV2PairGTON_USDC,
    mdexFactory,
    mdexRouter,
    mdexPairGTON_WETH
  }
}

interface CalibratorFixture extends UniswapFixture {
  calibrator: Calibrator
  calibratorMdex: Calibrator
}

export const calibratorFixture: Fixture<CalibratorFixture> =
  async function ([wallet, other, nebula], provider): Promise<CalibratorFixture> {
    const {
      token0: gton,
      token1: usdt,
      token2: usdc,
      weth,
      uniswapV2Factory,
      uniswapV2Router01,
      uniswapV2PairGTON_WETH,
      uniswapV2PairGTON_USDC,
      mdexFactory,
      mdexRouter,
      mdexPairGTON_WETH
    } = await uniswapFixture([wallet, other], provider)

    const calibratorFactory = await ethers.getContractFactory(
      "Calibrator"
    )
    const calibrator = (await calibratorFactory.deploy(
      gton.address,
      uniswapV2Router01.address,
      "QUICK"
    )) as Calibrator

    const calibratorMdex = (await calibratorFactory.deploy(
      gton.address,
      mdexRouter.address,
      "MDEX"
    )) as Calibrator

    return {
      token0: gton,
      token1: usdt,
      token2: usdc,
      weth,
      uniswapV2Factory,
      uniswapV2Router01,
      uniswapV2PairGTON_WETH,
      uniswapV2PairGTON_USDC,
      mdexFactory,
      mdexRouter,
      mdexPairGTON_WETH,
      calibrator,
      calibratorMdex
    }
  }

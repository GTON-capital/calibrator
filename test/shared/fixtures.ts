import { ethers, waffle } from "hardhat"
import { BigNumber } from "ethers"

import { TestERC20 } from "../../typechain/TestERC20"
import { WrappedNative } from "../../typechain/WrappedNative"
import { UniswapV2Pair } from "../../typechain/UniswapV2Pair"
import { UniswapV2Factory } from "../../typechain/UniswapV2Factory"
import { UniswapV2Router01 } from "../../typechain/UniswapV2Router01"
import { Pumper } from "../../typechain/Pumper"

import {
  expandTo18Decimals,
} from "./utilities"

import { Fixture } from "ethereum-waffle"

interface TokensFixture {
  token0: TestERC20
  token1: TestERC20
  token2: TestERC20
}

async function tokensFixture(): Promise<TokensFixture> {
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

  return { token0, token1, token2 }
}

interface UniswapFixture extends TokensFixture {
  weth: WrappedNative
  uniswapV2Factory: UniswapV2Factory
  uniswapV2Router01: UniswapV2Router01
  uniswapV2PairGTON_WETH: UniswapV2Pair
  uniswapV2PairGTON_USDC: UniswapV2Pair
}

const uniswapFixture: Fixture<UniswapFixture> =
  async function (
    [wallet, other],
    provider
  ): Promise<UniswapFixture> {
  const { token0: gton, token1: usdt, token2: usdc } = await tokensFixture()

  const wethFactory = await ethers.getContractFactory(
    "WrappedNative"
  )
  const weth = await wethFactory.deploy() as WrappedNative

  const uniswapV2FactoryFactory = await ethers.getContractFactory(
    "UniswapV2Factory"
  )
  const uniswapV2Factory = await uniswapV2FactoryFactory.deploy(
    wallet.address
  ) as UniswapV2Factory

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
  await uniswapV2Router01.addLiquidityETH(
    gton.address,
    liquidityGTON,
    liquidityGTON,
    liquidityWETH,
    wallet.address,
    timestamp + 3600,
    {value: liquidityWETH}
  )

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
  return {
    token0: gton,
    token1: usdt,
    token2: usdc,
    weth,
    uniswapV2Factory,
    uniswapV2Router01,
    uniswapV2PairGTON_WETH,
    uniswapV2PairGTON_USDC
  }
}

interface PumperFixture extends UniswapFixture {
  pumper: Pumper
}

export const pumperFixture: Fixture<PumperFixture> =
  async function ([wallet, other, nebula], provider): Promise<PumperFixture> {
    const {
      token0: gton,
      token1: usdt,
      token2: usdc,
      weth,
      uniswapV2Factory,
      uniswapV2Router01,
      uniswapV2PairGTON_WETH,
      uniswapV2PairGTON_USDC
    } = await uniswapFixture([wallet, other], provider)

    const pumperFactory = await ethers.getContractFactory(
      "Pumper"
    )
    const pumper = (await pumperFactory.deploy(
      gton.address,
      uniswapV2Router01.address,
      "ffffffff"
    )) as Pumper

    return {
      token0: gton,
      token1: usdt,
      token2: usdc,
      weth,
      uniswapV2Factory,
      uniswapV2Router01,
      uniswapV2PairGTON_WETH,
      uniswapV2PairGTON_USDC,
      pumper
    }
  }

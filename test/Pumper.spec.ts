import { ethers, waffle } from "hardhat"
import { BigNumber } from "ethers"
import { TestERC20 } from "../typechain/TestERC20"
import { WrappedNative } from "../typechain/WrappedNative"
import { UniswapV2Pair } from "../typechain/UniswapV2Pair"
import { UniswapV2Factory } from "../typechain/UniswapV2Factory"
import { UniswapV2Router01 } from "../typechain/UniswapV2Router01"
import { Pumper } from "../typechain/Pumper"
import { pumperFixture } from "./shared/fixtures"
import { expect } from "./shared/expect"
import {
  expandTo18Decimals,
} from "./shared/utilities"

describe("Pumper", () => {
  const [wallet, other] = waffle.provider.getWallets()

  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>

  before("create fixture loader", async () => {
    loadFixture = waffle.createFixtureLoader([wallet, other])
  })

  let token0: TestERC20
  let token1: TestERC20
  let token2: TestERC20
  let weth: WrappedNative
  let uniswapV2Factory: UniswapV2Factory
  let uniswapV2Router01: UniswapV2Router01
  let uniswapV2PairGTON_WETH: UniswapV2Pair
  let uniswapV2PairGTON_USDC: UniswapV2Pair
  let pumper: Pumper

  beforeEach("deploy test contracts", async () => {
    ;({ token0,
        token1,
        token2,
        weth,
        uniswapV2Factory,
        uniswapV2Router01,
        uniswapV2PairGTON_WETH,
        uniswapV2PairGTON_USDC,
        pumper
      } = await loadFixture(pumperFixture))
  })

  it("constructor initializes variables", async () => {
  })

})

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

  let gton: TestERC20
  let usdc: TestERC20
  let usdt: TestERC20
  let weth: WrappedNative
  let uniswapV2Factory: UniswapV2Factory
  let uniswapV2Router01: UniswapV2Router01
  let uniswapV2PairGTON_WETH: UniswapV2Pair
  let uniswapV2PairGTON_USDC: UniswapV2Pair
  let pumper: Pumper
  let startingBalance: BigNumber

  beforeEach("deploy test contracts", async () => {
    ;({ token0: gton,
        token1: usdt,
        token2: usdc,
        weth,
        uniswapV2Factory,
        uniswapV2Router01,
        uniswapV2PairGTON_WETH,
        uniswapV2PairGTON_USDC,
        pumper
      } = await loadFixture(pumperFixture))
    startingBalance = await wallet.provider.getBalance(wallet.address)
  })

  async function getPrice(): Promise<BigNumber> {
      let amountsIn = BigNumber.from("10000")
      let [amountGTON, amountUSDC] = await uniswapV2Router01.getAmountsOut(
          amountsIn,
          [gton.address, usdc.address]
      )
      return amountUSDC.div(amountGTON)
  }

  it("constructor initializes variables", async () => {
      // lp balance of gton_weth
      // lp balance of gton_usdc
      expect(await uniswapV2PairGTON_USDC.balanceOf(wallet.address))
        .to.eq("22360679774997895964")
      // price on gton-usdc
      expect(await getPrice()).to.be.eq("4")
      // price on gton-weth
  })

  describe("#pump", async () => {
    it("fails if lp is not approved", async () => {
        let liquidity = expandTo18Decimals(1)
        let buyback = expandTo18Decimals(10)
        await expect(pumper.pump(uniswapV2PairGTON_USDC.address, liquidity, buyback, wallet.address))
          .to.be.revertedWith("ds-math-sub-underflow")
    })

    it("transfers lp and gton to account after pump", async () => {
        let startingGton = await gton.balanceOf(other.address)
        let liquidity = expandTo18Decimals(10)
        let buyback = expandTo18Decimals(1)
        await uniswapV2PairGTON_USDC.approve(pumper.address, liquidity)
        await pumper.pump(uniswapV2PairGTON_USDC.address, liquidity, buyback, other.address)
        let gtonGained = (await gton.balanceOf(other.address)).sub(startingGton)
        expect(gtonGained).to.be.eq("3294429837562624227")
        expect(await uniswapV2PairGTON_USDC.balanceOf(other.address))
            .to.be.gt(0)
        expect(await uniswapV2PairGTON_USDC.balanceOf(other.address))
            .to.be.eq("5944950575849206235")
    })

    it("sets price from 4 to 7", async () => {
        let liquidity = expandTo18Decimals(10)
        let buyback = expandTo18Decimals(1)
        await uniswapV2PairGTON_USDC.approve(pumper.address, liquidity)
        await pumper.pump(uniswapV2PairGTON_USDC.address, liquidity, buyback, other.address)
        expect(await getPrice()).to.be.eq(7)
    })
  })

  describe("#estimate", async () => {
    it("estimates price change from 4 to 7", async () => {
        let liquidity = expandTo18Decimals(10)
        let buyback = expandTo18Decimals(1)
        let result = await pumper.estimateNow(uniswapV2PairGTON_USDC.address, liquidity, buyback)
        let reserveGton = result[0]
        let reserveToken = result[1]
        console.log(reserveGton.toString())
        console.log(reserveToken.toString())
        expect(reserveToken.div(reserveGton)).to.be.eq("7")
    })
  })

})

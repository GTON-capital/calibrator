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

  it("constructor initializes variables", async () => {
      // lp balance of gton_weth
      // lp balance of gton_usdc
      // price on gton-usdc
      let amountsIn = BigNumber.from("1000")
      let [amountGTON, amountUSDC] = await uniswapV2Router01.getAmountsOut(
          amountsIn,
          [gton.address, usdc.address]
      )
      let price = amountUSDC.div(amountGTON)
      expect(price).to.eq(5)
      // price on gton-weth
  })

  describe("#pump", async () => {
    it("fails if lp is not approved", async () => {
        let amountLP = expandTo18Decimals(1)
        let gtonBuyback = expandTo18Decimals(10)
        await expect(pumper.pump(amountLP, gtonBuyback, wallet.address)).to.be.revertedWith("P1")
    })

    it("transfers lp and gton to account after pump", async () => {
        let amountLP = expandTo18Decimals(1)
        let gtonBuyback = expandTo18Decimals(10)
        await pumper.pump(amountLP, gtonBuyback, other.address)
        expect(await uniswapV2PairGTON_USDC.balanceOf(other.address))
            .to.be.gt(0)
        expect(await uniswapV2PairGTON_USDC.balanceOf(other.address))
            .to.be.lt(expandTo18Decimals(1))
        expect(await gton.balanceOf(other.address))
            .to.be.eq(expandTo18Decimals(10))
    })

    it("changes pool price by 10% after pump", async () => {
        let amountLP = expandTo18Decimals(1)
        let gtonBuyback = expandTo18Decimals(10)
        await pumper.pump(amountLP, gtonBuyback, other.address)
        let amountsIn = BigNumber.from("1000")
        let [amountGTON, amountUSDC] = await uniswapV2Router01.getAmountsOut(
            amountsIn,
            [gton.address, usdc.address]
        )
        let price = amountUSDC.div(amountGTON)
        console.log("price", price)
        expect(price).to.be.gt(5)
    })

    it("spends less than x to pump", async () => {
        let amountLP = expandTo18Decimals(1)
        let gtonBuyback = expandTo18Decimals(10)
        await pumper.pump(amountLP, gtonBuyback, other.address)
        let currentBalance = await wallet.provider.getBalance(wallet.address)
        let balanceUsed = startingBalance.sub(currentBalance)
        console.log("balance used:", balanceUsed)
        // TODO: calculate proper resulting number
        expect(balanceUsed).to.be.lt(10000000000)
    })
  })

})

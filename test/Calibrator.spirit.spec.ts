import { ethers, waffle } from "hardhat"
import { BigNumber, ContractReceipt, ContractTransaction } from "ethers"
import { TestERC20 } from "../typechain/TestERC20"
import { WrappedNative } from "../typechain/WrappedNative"
import { UniswapV2Pair } from "../typechain/UniswapV2Pair"
import { UniswapV2Factory } from "../typechain/UniswapV2Factory"
import { UniswapV2Router01 } from "../typechain/UniswapV2Router01"
import { SpiritPair } from "../typechain/SpiritPair"
import { SpiritFactory } from "../typechain/SpiritFactory"
import { SpiritRouter } from "../typechain/SpiritRouter"
import { Calibrator } from "../typechain/Calibrator"
import { RelayLock } from "../typechain/RelayLock"
import { Relay } from "../typechain/Relay"
import { tokensFixture } from "./shared/fixtures"
import { expect } from "./shared/expect"
import {
  expandTo18Decimals,
  ZERO_ADDR
} from "./shared/utilities"

describe("Spirit", () => {
  const [wallet, other] = waffle.provider.getWallets()

  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>

  before("create fixture loader", async () => {
    loadFixture = waffle.createFixtureLoader([wallet, other])
  })

  let gton: TestERC20
  let usdc: TestERC20
  let usdt: TestERC20
  let weth: WrappedNative
  let factory: SpiritFactory
  let router: SpiritRouter
  let pair: SpiritPair
  let startingBalance: BigNumber

  beforeEach("deploy test contracts", async () => {
    ;({ token0: gton,
        token1: usdt,
        token2: usdc,
        weth: weth
      } = await loadFixture(tokensFixture))
    startingBalance = await wallet.provider.getBalance(wallet.address)
  })

  async function getPrice(): Promise<BigNumber> {
      let amountsIn = BigNumber.from("10000")
      let [amountGTON, amountUSDC] = await router.getAmountsOut(
          amountsIn,
          [gton.address, usdc.address]
      )
      return amountUSDC.div(amountGTON)
  }

  describe("#calibrate", async () => {
    it("matches estimates", async () => {

      const factoryFactory = await ethers.getContractFactory("SpiritFactory")
      const factory = await factoryFactory.deploy(wallet.address, false) as SpiritFactory

      await factory.setFeeTo(other.address)

      const routerFactory = await ethers.getContractFactory("SpiritRouter")
      const router = await routerFactory.deploy(factory.address,weth.address) as SpiritRouter

      const pairFactory = await ethers.getContractFactory("SpiritPair")
      // let bytecode = pairFactory.bytecode
      // console.log(ethers.utils.solidityKeccak256(["bytes"],[bytecode]))

      await factory.createPair(weth.address, gton.address)
      const pairAddress = await factory.getPair(weth.address, gton.address)
      // console.log(pairAddress)

      const pair = pairFactory.attach(pairAddress) as SpiritPair

      // https://ftmscan.com/tx/0xcb52f8bec8d6c968a22969fceec0ef78223490b15c49e47cc78caef52ea4eb65
      let liquidityGTON = BigNumber.from("10000000000000000000")
      let liquidityWETH = BigNumber.from("148000000000000000000")
      await gton.approve(router.address, liquidityGTON)
      let block = await wallet.provider.getBlock("latest")
      let timestamp = block.timestamp
      await expect(router.addLiquidityETH(
        gton.address,
        liquidityGTON,
        liquidityGTON,
        liquidityWETH,
        wallet.address,
        timestamp + 3600,
        {value: liquidityWETH}
      ))
        .to.emit(gton, "Transfer").withArgs(wallet.address, pair.address, "10000000000000000000")
        .to.emit(weth, "Transfer").withArgs(router.address, pair.address, "148000000000000000000")
        .to.emit(pair, "Transfer").withArgs(ZERO_ADDR, ZERO_ADDR, "1000")
        .to.emit(pair, "Transfer").withArgs(ZERO_ADDR, wallet.address, "38470768123342688503")
        .to.emit(pair, "Sync").withArgs("148000000000000000000","10000000000000000000")
        .to.emit(pair, "Mint").withArgs(router.address, "148000000000000000000","10000000000000000000")

      const pairAddress2 = await factory.getPair(weth.address, gton.address)
      // console.log(pairAddress2)
      expect(pairAddress2).to.eq(pairAddress)

      expect(await pair.token1()).to.eq(gton.address)
      expect(await pair.token0()).to.eq(weth.address)

      const calibratorFactory = await ethers.getContractFactory("Calibrator")
      const calibrator = (await calibratorFactory.deploy(
        gton.address,
        router.address,
        "SPIRIT"
      )) as Calibrator

      // console.log("TOTAL SUPPLY: ", (await pair.totalSupply()).toString())
      await pair.approve(calibrator.address, "37470768123342689503")

      let reserves = await calibrator.getReserves(pair.address, gton.address, weth.address)
      let reserveGTONBefore = reserves[0].toString()
      let reserveTokenBefore = reserves[1].toString()
      // console.log("gton before", reserveGTONBefore)
      // console.log("token before", reserveTokenBefore)

      let estimates = await calibrator.estimateNow(
        pair.address,
        "37470768123342689503",
        "5192222000000"
      )
      let reserveGTONEstimated = estimates[0] //"9999599905427336719"
      let reserveTokenEstimated = estimates[1] //"148000000000000000000"
      let amountGTONEstimated = estimates[2] //"400094572663281"
      let liquidityEstimated = estimates[3] //"37469997549927269088"
      // console.log(
      //   estimates[0].toString(),
      //   estimates[1].toString(),
      //   estimates[2].toString(),
      //   estimates[3].toString()
      // )

      // let tx: ContractTransaction = await calibrator.calibrate(
      //   pair.address,
      //   "37470768123342689503",
      //   "5192222000000",
      //   wallet.address
      // )
      // let receipt: ContractReceipt = await tx.wait();
      // console.log(receipt.events);
      // sync topic0 is 0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1
      // find one with the latest log index, get Sync arguments from data
      // 0x0000000000000000000000000000000000000000000000075f610f70ed200000 136000000000000000000
      // 0x0000000000000000000000000000000000000000000000008ac5c65f600efac2 9999616660581841602

      // console.log("LP FEE BEFORE", (await pair.balanceOf(other.address)).toString())
      await expect(calibrator.calibrate(
        pair.address,
        "37470768123342689503",
        "5192222000000",
        wallet.address
      ))
        .to.emit(pair, "Sync").withArgs("148000000000000000000","9999599905427336719")
      // console.log("LP FEE AFTER", (await pair.balanceOf(other.address)).toString())

      reserves = await calibrator.getReserves(pair.address, gton.address, weth.address)
      let reserveGTONAfter = reserves[0].toString()
      let reserveTokenAfter = reserves[1].toString()
      // console.log("gton after", reserveGTONAfter)
      // console.log("token after", reserveTokenAfter)

      expect(reserveGTONEstimated).to.eq("9999599905427336719")
      expect(reserveTokenEstimated).to.eq("148000000000000000000")
    })
  })
})
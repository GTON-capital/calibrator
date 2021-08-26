import { ethers, waffle } from "hardhat"
import { BigNumber, ContractReceipt, ContractTransaction } from "ethers"
import { TestERC20 } from "../typechain/TestERC20"
import { WrappedNative } from "../typechain/WrappedNative"
import { QuickPair } from "../typechain/QuickPair"
import { QuickFactory } from "../typechain/QuickFactory"
import { QuickRouter01 } from "../typechain/QuickRouter01"
import { MdexPair } from "../typechain/MdexPair"
import { MdexFactory } from "../typechain/MdexFactory"
import { MdexRouter } from "../typechain/MdexRouter"
import { Calibrator } from "../typechain/Calibrator"
import { RelayLock } from "../typechain/RelayLock"
import { Relay } from "../typechain/Relay"
import { tokensFixture } from "./shared/fixtures"
import { expect } from "./shared/expect"
import {
  expandTo18Decimals,
  ZERO_ADDR
} from "./shared/utilities"

describe("Quick", () => {
  const [wallet, other] = waffle.provider.getWallets()

  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>

  before("create fixture loader", async () => {
    loadFixture = waffle.createFixtureLoader([wallet, other])
  })

  let gton: TestERC20
  let usdc: TestERC20
  let usdt: TestERC20
  let weth: WrappedNative
  let factory: QuickFactory
  let router: QuickRouter01
  let pair: QuickPair
  let calibrator: Calibrator
  let startingBalance: BigNumber

  beforeEach("deploy test contracts", async () => {
    ;({ token0: gton,
        token1: usdt,
        token2: usdc,
        weth: weth
      } = await loadFixture(tokensFixture))
    startingBalance = await wallet.provider.getBalance(wallet.address)
  })

  async function nextAddress() {
      const wethFactory = await ethers.getContractFactory("WrappedNative")
      await wethFactory.deploy()
  }

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

      const factoryFactory = await ethers.getContractFactory("QuickFactory")
      const factory = await factoryFactory.deploy(wallet.address) as QuickFactory

      await factory.setFeeTo(other.address)

      const routerFactory = await ethers.getContractFactory("QuickRouter01")
      const router = await routerFactory.deploy(factory.address,weth.address) as QuickRouter01

      const pairFactory = await ethers.getContractFactory("QuickPair")
      // let bytecode = pairFactory.bytecode
      // console.log(ethers.utils.solidityKeccak256(["bytes"],[bytecode]))

      await factory.createPair(weth.address, gton.address)
      const pairAddress = await factory.getPair(weth.address, gton.address)
      // console.log(pairAddress)

      const pair = pairFactory.attach(pairAddress) as QuickPair

      let liquidityGTON = BigNumber.from("2000000000000000000000")
      let liquidityWETH = BigNumber.from("8928000000000000000000")
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
        .to.emit(gton, "Transfer").withArgs(wallet.address, pair.address, "2000000000000000000000")
        .to.emit(weth, "Transfer").withArgs(router.address, pair.address, "8928000000000000000000")
        .to.emit(pair, "Transfer").withArgs(ZERO_ADDR, ZERO_ADDR, "1000")
        .to.emit(pair, "Transfer").withArgs(ZERO_ADDR, wallet.address, "4225636046798162193984")
        .to.emit(pair, "Sync").withArgs("8928000000000000000000","2000000000000000000000")
        .to.emit(pair, "Mint").withArgs(router.address, "8928000000000000000000","2000000000000000000000")

      const pairAddress2 = await factory.getPair(weth.address, gton.address)
      // console.log(pairAddress2)
      expect(pairAddress2).to.eq(pairAddress)

      expect(await pair.token1()).to.eq(gton.address)
      expect(await pair.token0()).to.eq(weth.address)

      const calibratorFactory = await ethers.getContractFactory("Calibrator")
      const calibrator = (await calibratorFactory.deploy(
        gton.address,
        router.address,
        "QUICK"
      )) as Calibrator

      // console.log("TOTAL SUPPLY: ", (await pair.totalSupply()).toString())
      await pair.approve(calibrator.address, "3225636046798162193984")

      let reserves = await calibrator.getReserves(pair.address, gton.address, weth.address)
      let reserveGTONBefore = reserves[0].toString()
      let reserveTokenBefore = reserves[1].toString()
      // console.log("gton before", reserveGTONBefore)
      // console.log("token before", reserveTokenBefore)

      let estimates = await calibrator.estimateNow(
        pair.address,
        "3225636046798162193984",
        "5192222000000"
      )
      let reserveGTONEstimated = estimates[0] //"1999999956053099970307"
      let reserveTokenEstimated = estimates[1] //"8928000000000000000000"
      let amountGTONEstimated = estimates[2] //"43946900029693"
      let liquidityEstimated = estimates[3] //"3225636000302517244662"
      // console.log(
      //   estimates[0].toString(),
      //   estimates[1].toString(),
      //   estimates[2].toString(),
      //   estimates[3].toString()
      // )

      // console.log("LP FEE BEFORE", (await pair.balanceOf(other.address)).toString())
      await expect(calibrator.calibrate(
        pair.address,
        "3225636046798162193984",
        "5192222000000",
        wallet.address
      ))
        .to.emit(pair, "Sync").withArgs("8928000000000000000000","1999999956053099970307")
      // console.log("LP FEE AFTER", (await pair.balanceOf(other.address)).toString())

      reserves = await calibrator.getReserves(pair.address, gton.address, weth.address)
      let reserveGTONAfter = reserves[0].toString()
      let reserveTokenAfter = reserves[1].toString()
      // console.log("gton after", reserveGTONAfter)
      // console.log("token after", reserveTokenAfter)

      expect(reserveGTONEstimated).to.eq("1999999956053099970307")
      expect(reserveTokenEstimated).to.eq("8928000000000000000000")
    })
  })
})

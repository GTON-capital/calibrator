import { ethers, waffle } from "hardhat"
import { BigNumber, ContractReceipt, ContractTransaction } from "ethers"
import { TestERC20 } from "../typechain/TestERC20"
import { WrappedNative } from "../typechain/WrappedNative"
import { PancakePair } from "../typechain/PancakePair"
import { PancakeFactory } from "../typechain/PancakeFactory"
import { PancakeRouter } from "../typechain/PancakeRouter"
import { Calibrator } from "../typechain/Calibrator"
import { RelayLock } from "../typechain/RelayLock"
import { Relay } from "../typechain/Relay"
import { tokensFixture } from "./shared/fixtures"
import { expect } from "./shared/expect"
import {
  expandTo18Decimals,
  ZERO_ADDR
} from "./shared/utilities"

describe("Pancake", () => {
  const [wallet, other] = waffle.provider.getWallets()

  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>

  before("create fixture loader", async () => {
    loadFixture = waffle.createFixtureLoader([wallet, other])
  })

  let gton: TestERC20
  let usdc: TestERC20
  let usdt: TestERC20
  let weth: WrappedNative
  let factory: PancakeFactory
  let router: PancakeRouter
  let pair: PancakePair
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

      const factoryFactory = await ethers.getContractFactory("PancakeFactory")
      const factory = await factoryFactory.deploy(wallet.address) as PancakeFactory

      await factory.setFeeTo(other.address)

      const routerFactory = await ethers.getContractFactory("PancakeRouter")
      const router = await routerFactory.deploy(factory.address,weth.address) as PancakeRouter

      const pairFactory = await ethers.getContractFactory("PancakePair")
      // let bytecode = pairFactory.bytecode
      // console.log(ethers.utils.solidityKeccak256(["bytes"],[bytecode]))

      await factory.createPair(weth.address, gton.address)
      const pairAddress = await factory.getPair(weth.address, gton.address)
      // console.log(pairAddress)

      // hardcode address to expect a pair there after addLiquidityETH
      // let pairAddress = "0x55f9937E4257BCC49d112bF1E87959CA095818eF"
      const pair = pairFactory.attach(pairAddress) as PancakePair

      let liquidityGTON = BigNumber.from("17661000000000000000000")
      let liquidityWETH = BigNumber.from("290000000000000000000")
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
        .to.emit(gton, "Transfer").withArgs(wallet.address, pair.address, "17661000000000000000000")
        .to.emit(weth, "Transfer").withArgs(router.address, pair.address, "290000000000000000000")
        .to.emit(pair, "Transfer").withArgs(ZERO_ADDR, ZERO_ADDR, "1000")
        .to.emit(pair, "Transfer").withArgs(ZERO_ADDR, wallet.address, "2263115109754693851037")
        .to.emit(pair, "Sync").withArgs("290000000000000000000","17661000000000000000000")
        .to.emit(pair, "Mint").withArgs(router.address, "290000000000000000000","17661000000000000000000")

      const pairAddress2 = await factory.getPair(weth.address, gton.address)
      // console.log(pairAddress2)
      expect(pairAddress2).to.eq(pairAddress)

      expect(await pair.token1()).to.eq(gton.address)
      expect(await pair.token0()).to.eq(weth.address)

      const calibratorFactory = await ethers.getContractFactory("Calibrator")
      const calibrator = (await calibratorFactory.deploy(
        gton.address,
        router.address,
        "CAKE"
      )) as Calibrator

      // console.log("TOTAL SUPPLY: ", (await pair.totalSupply()).toString())
      await pair.approve(calibrator.address, "2163115109754693852037")

      let reserves = await calibrator.getReserves(pair.address, gton.address, weth.address)
      let reserveGTONBefore = reserves[0].toString()
      let reserveTokenBefore = reserves[1].toString()
      // console.log("gton before", reserveGTONBefore)
      // console.log("token before", reserveTokenBefore)

      let estimates = await calibrator.estimateNow(
        pair.address,
        "2163115109754693852037",
        "5192222000000"
      )
      let reserveGTONEstimated = estimates[0] //"17660999764634500939503"
      let reserveTokenEstimated = estimates[1] //"290000000000000000000"
      let amountGTONEstimated = estimates[2] //"235365499060497"
      let liquidityEstimated = estimates[3] //"2163115094655550648103"
      // console.log(
      //   estimates[0].toString(),
      //   estimates[1].toString(),
      //   estimates[2].toString(),
      //   estimates[3].toString()
      // )

      // let tx: ContractTransaction = await calibrator.calibrate(
      //   pair.address,
      //   "2163115109754693852037",
      //   "5192222000000",
      //   wallet.address
      // )
      // let receipt: ContractReceipt = await tx.wait();
      // console.log(receipt.events);
      // // sync topic0 is 0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1
      // // find one with the latest log index

      // console.log("LP FEE BEFORE", (await pair.balanceOf(other.address)).toString())
      await expect(calibrator.calibrate(
        pair.address,
        "2163115109754693852037",
        "5192222000000",
        wallet.address
      ))
        .to.emit(pair, "Sync").withArgs("290000000000000000000","17660999764693578401868")
      // console.log("LP FEE AFTER", (await pair.balanceOf(other.address)).toString())


      reserves = await calibrator.getReserves(pair.address, gton.address, weth.address)
      let reserveGTONAfter = reserves[0].toString()
      let reserveTokenAfter = reserves[1].toString()
      // console.log("gton after", reserveGTONAfter)
      // console.log("token after", reserveTokenAfter)

      expect(reserveGTONEstimated).to.eq("17660999764693578401868")
      expect(reserveTokenEstimated).to.eq("290000000000000000000")
    })
  })
})

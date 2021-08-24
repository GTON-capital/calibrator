import { ethers, waffle } from "hardhat"
import { BigNumber, ContractReceipt, ContractTransaction } from "ethers"
import { TestERC20 } from "../typechain/TestERC20"
import { WrappedNative } from "../typechain/WrappedNative"
import { UniswapV2Pair } from "../typechain/UniswapV2Pair"
import { UniswapV2Factory } from "../typechain/UniswapV2Factory"
import { UniswapV2Router01 } from "../typechain/UniswapV2Router01"
import { MdexPair } from "../typechain/MdexPair"
import { MdexFactory } from "../typechain/MdexFactory"
import { MdexRouter } from "../typechain/MdexRouter"
import { Calibrator } from "../typechain/Calibrator"
import { RelayLock } from "../typechain/RelayLock"
import { tokensFixture } from "./shared/fixtures"
import { expect } from "./shared/expect"
import {
  expandTo18Decimals,
  ZERO_ADDR
} from "./shared/utilities"

describe("Calibrator", () => {
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
  let mdexFactory: MdexFactory
  let mdexRouter: MdexRouter
  let mdexPairGTON_WETH: MdexPair
  let calibrator: Calibrator
  let calibratorMdex: Calibrator
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
      let [amountGTON, amountUSDC] = await uniswapV2Router01.getAmountsOut(
          amountsIn,
          [gton.address, usdc.address]
      )
      return amountUSDC.div(amountGTON)
  }
  async function getPriceMdex(): Promise<BigNumber> {
      let amountsIn = BigNumber.from("10000")
      let [amountGTON, amountUSDC] = await mdexRouter.getAmountsOut(
          amountsIn,
          [gton.address, weth.address]
      )
      return amountUSDC.div(amountGTON)
  }

  describe.only("#deploy", async () => {
    it("fails if lp is not approved", async () => {

      const mdexFactoryFactory = await ethers.getContractFactory("MdexFactory")
      const mdexFactory = await mdexFactoryFactory.deploy(wallet.address) as MdexFactory
      await mdexFactory.setInitCodeHash("0x0fd8d405689cfdaa9e8621294709df601788f38378a22ebcaff404049bf31af9")

      await mdexFactory.setFeeTo(other.address)
      await mdexFactory.setFeeToRate(1)

      const mdexRouterFactory = await ethers.getContractFactory("MdexRouter")
      const mdexRouter = await mdexRouterFactory.deploy(mdexFactory.address,weth.address) as MdexRouter

      // hardcode address to expect a pair there
      let pairAddress = "0x9C671a7f7a0B75dd13A040353A18c9700914bE04"
      const mdexPairFactory = await ethers.getContractFactory("MdexPair")
      const mdexPair = mdexPairFactory.attach(pairAddress) as MdexPair

      let liquidityGTON = BigNumber.from("800000000000000000")
      let liquidityWETH = BigNumber.from("400000000000000000")
      await gton.approve(mdexRouter.address, liquidityGTON)
      let block = await wallet.provider.getBlock("latest")
      let timestamp = block.timestamp
      await expect(mdexRouter.addLiquidityETH(
        gton.address,
        liquidityGTON,
        liquidityGTON,
        liquidityWETH,
        wallet.address,
        timestamp + 3600,
        {value: liquidityWETH}
      ))
        .to.emit(mdexFactory, "PairCreated").withArgs(weth.address, gton.address, pairAddress, 1)
        .to.emit(gton, "Transfer").withArgs(wallet.address, mdexPair.address, "800000000000000000")
        .to.emit(weth, "Transfer").withArgs(mdexRouter.address, mdexPair.address, "400000000000000000")
        .to.emit(mdexPair, "Transfer").withArgs(ZERO_ADDR, ZERO_ADDR, "1000")
        .to.emit(mdexPair, "Transfer").withArgs(ZERO_ADDR, wallet.address, "565685424949237019")
        .to.emit(mdexPair, "Sync").withArgs("400000000000000000","800000000000000000")
        .to.emit(mdexPair, "Mint").withArgs(mdexRouter.address, "400000000000000000","800000000000000000")

      const pairAddress2 = await mdexFactory.getPair(weth.address, gton.address)
      console.log(pairAddress2)
      expect(pairAddress2).to.eq(pairAddress)

      expect(await mdexPair.token1()).to.eq(gton.address)
      expect(await mdexPair.token0()).to.eq(weth.address)

      const relayLockFactory = await ethers.getContractFactory("RelayLock")
      const relayLock = await relayLockFactory.deploy(
        weth.address,
        mdexRouter.address,
        gton.address
      ) as RelayLock

      await expect(relayLock.lock("HEC", wallet.address, {value: "1000"}))
        .to.emit(weth, "Transfer").withArgs(relayLock.address, mdexPair.address, "1000")
        .to.emit(mdexPair, "Sync").withArgs("400000000000001000", "799999999999998007")
        .to.emit(mdexPair, "Swap").withArgs(mdexRouter.address, "1000", 0, 0, "1993", relayLock.address)
        .to.emit(relayLock, "CalculateFee").withArgs("1000", "1993", 0, 0, 0, "1993")

      await expect(relayLock.lock("HEC", wallet.address, {value: "1000"}))
        .to.emit(weth, "Transfer").withArgs(relayLock.address, mdexPair.address, "1000")
        .to.emit(mdexPair, "Sync").withArgs("400000000000002000", "799999999999996014")
        .to.emit(mdexPair, "Swap").withArgs(mdexRouter.address, "1000", 0, 0, "1993", relayLock.address)
        .to.emit(relayLock, "CalculateFee").withArgs("1000", "1993", 0, 0, 0, "1993")

      await expect(relayLock.lock("HEC", wallet.address, {value: "1000"}))
        .to.emit(weth, "Transfer").withArgs(relayLock.address, mdexPair.address, "1000")
        .to.emit(mdexPair, "Sync").withArgs("400000000000003000", "799999999999994021")
        .to.emit(mdexPair, "Swap").withArgs(mdexRouter.address, "1000", 0, 0, "1993", relayLock.address)
        .to.emit(relayLock, "CalculateFee").withArgs("1000", "1993", 0, 0, 0, "1993")

      await expect(relayLock.lock("HEC", wallet.address, {value: "1000"}))
        .to.emit(weth, "Transfer").withArgs(relayLock.address, mdexPair.address, "1000")
        .to.emit(mdexPair, "Sync").withArgs("400000000000004000", "799999999999992028")
        .to.emit(mdexPair, "Swap").withArgs(mdexRouter.address, "1000", 0, 0, "1993", relayLock.address)
        .to.emit(relayLock, "CalculateFee").withArgs("1000", "1993", 0, 0, 0, "1993")

      await expect(relayLock.lock("HEC", wallet.address, {value: "10000"}))
        .to.emit(weth, "Transfer").withArgs(relayLock.address, mdexPair.address, "10000")
        .to.emit(mdexPair, "Sync").withArgs("400000000000014000", "799999999999972089")
        .to.emit(mdexPair, "Swap").withArgs(mdexRouter.address, "10000", 0, 0, "19939", relayLock.address)
        .to.emit(relayLock, "CalculateFee").withArgs("10000", "19939", 0, 0, 0, "19939")

      let tx: ContractTransaction = await mdexRouter.removeLiquidityETH(
        gton.address,
        "565685424949237019",
        "795999999999970820",
        "398000000000013225",
        wallet.address,
        "99999999999999999999999"
      )

      let receipt: ContractReceipt = await tx.wait();
      console.log(receipt.events);

      await mdexPair.approve(mdexRouter.address, "565685424949237019")

      // not using removeLiquidityETHWithPermit here to avoid hassle
      // await expect(mdexRouter.removeLiquidityETH(
      //   gton.address,
      //   "565685424949237019",
      //   "795999999999970820",
      //   "398000000000013225",
      //   wallet.address,
      //   "99999999999999999999999"
      // ))
        // .to.emit(mdexPair, "Transfer").withArgs(wallet.address, mdexRouter.address, "565685424949237019")
        // .to.emit(mdexPair, "Transfer").withArgs(ZERO_ADDR, other.address, "31")
        // .to.emit(mdexPair, "Transfer").withArgs(mdexPair.address, ZERO_ADDR, "565685424949237019")
        // .to.emit(weth, "Transfer").withArgs(mdexRouter.address, mdexPair.address, "400000000000013270")
    })
  })
})

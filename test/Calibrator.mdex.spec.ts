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
import { Relay } from "../typechain/Relay"
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
  let factory: MdexFactory
  let router: MdexRouter
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

  describe("#mdex", async () => {
    it("estimates with fees", async () => {

      const factoryFactory = await ethers.getContractFactory("MdexFactory")
      const factory = await factoryFactory.deploy(wallet.address) as MdexFactory
      await factory.setInitCodeHash("0x0fd8d405689cfdaa9e8621294709df601788f38378a22ebcaff404049bf31af9")

      await factory.setFeeTo(other.address)
      await factory.setFeeToRate(1)

      const routerFactory = await ethers.getContractFactory("MdexRouter")
      const router = await routerFactory.deploy(factory.address,weth.address) as MdexRouter

      // hardcode address to expect a pair there
      let pairAddress = "0x9C671a7f7a0B75dd13A040353A18c9700914bE04"
      const pairFactory = await ethers.getContractFactory("MdexPair")
      const pair = pairFactory.attach(pairAddress) as MdexPair

      let liquidityGTON = BigNumber.from("800000000000000000")
      let liquidityWETH = BigNumber.from("400000000000000000")
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
        .to.emit(factory, "PairCreated").withArgs(weth.address, gton.address, pairAddress, 1)
        .to.emit(gton, "Transfer").withArgs(wallet.address, pair.address, "800000000000000000")
        .to.emit(weth, "Transfer").withArgs(router.address, pair.address, "400000000000000000")
        .to.emit(pair, "Transfer").withArgs(ZERO_ADDR, ZERO_ADDR, "1000")
        .to.emit(pair, "Transfer").withArgs(ZERO_ADDR, wallet.address, "565685424949237019")
        .to.emit(pair, "Sync").withArgs("400000000000000000","800000000000000000")
        .to.emit(pair, "Mint").withArgs(router.address, "400000000000000000","800000000000000000")

      const pairAddress2 = await factory.getPair(weth.address, gton.address)
      // console.log(pairAddress2)
      expect(pairAddress2).to.eq(pairAddress)

      expect(await pair.token1()).to.eq(gton.address)
      expect(await pair.token0()).to.eq(weth.address)

      const relayLockFactory = await ethers.getContractFactory("RelayLock")
      const relayLock = await relayLockFactory.deploy(
        weth.address,
        router.address,
        gton.address
      ) as RelayLock

      await expect(relayLock.lock("HEC", wallet.address, {value: "1000"}))
        .to.emit(weth, "Transfer").withArgs(relayLock.address, pair.address, "1000")
        .to.emit(pair, "Sync").withArgs("400000000000001000", "799999999999998007")
        .to.emit(pair, "Swap").withArgs(router.address, "1000", 0, 0, "1993", relayLock.address)
        .to.emit(relayLock, "CalculateFee").withArgs("1000", "1993", 0, 0, 0, "1993")

      await expect(relayLock.lock("HEC", wallet.address, {value: "1000"}))
        .to.emit(weth, "Transfer").withArgs(relayLock.address, pair.address, "1000")
        .to.emit(pair, "Sync").withArgs("400000000000002000", "799999999999996014")
        .to.emit(pair, "Swap").withArgs(router.address, "1000", 0, 0, "1993", relayLock.address)
        .to.emit(relayLock, "CalculateFee").withArgs("1000", "1993", 0, 0, 0, "1993")

      await expect(relayLock.lock("HEC", wallet.address, {value: "1000"}))
        .to.emit(weth, "Transfer").withArgs(relayLock.address, pair.address, "1000")
        .to.emit(pair, "Sync").withArgs("400000000000003000", "799999999999994021")
        .to.emit(pair, "Swap").withArgs(router.address, "1000", 0, 0, "1993", relayLock.address)
        .to.emit(relayLock, "CalculateFee").withArgs("1000", "1993", 0, 0, 0, "1993")

      await expect(relayLock.lock("HEC", wallet.address, {value: "1000"}))
        .to.emit(weth, "Transfer").withArgs(relayLock.address, pair.address, "1000")
        .to.emit(pair, "Sync").withArgs("400000000000004000", "799999999999992028")
        .to.emit(pair, "Swap").withArgs(router.address, "1000", 0, 0, "1993", relayLock.address)
        .to.emit(relayLock, "CalculateFee").withArgs("1000", "1993", 0, 0, 0, "1993")

      await expect(relayLock.lock("HEC", wallet.address, {value: "10000"}))
        .to.emit(weth, "Transfer").withArgs(relayLock.address, pair.address, "10000")
        .to.emit(pair, "Sync").withArgs("400000000000014000", "799999999999972089")
        .to.emit(pair, "Swap").withArgs(router.address, "10000", 0, 0, "19939", relayLock.address)
        .to.emit(relayLock, "CalculateFee").withArgs("10000", "19939", 0, 0, 0, "19939")

      await pair.approve(router.address, "565685424949237019")

      // let tx: ContractTransaction = await router.removeLiquidityETH(
      //   gton.address,
      //   "565685424949237019",
      //   "795999999999970820",
      //   "398000000000013225",
      //   wallet.address,
      //   "99999999999999999999999"
      // )

      // let receipt: ContractReceipt = await tx.wait();
      // console.log(receipt.events);

      // not using removeLiquidityETHWithPermit here to avoid hassle
      await expect(router.removeLiquidityETH(
        gton.address,
        "565685424949237019",
        "795999999999970820",
        "398000000000013225",
        wallet.address,
        "99999999999999999999999"
      ))
        // .to.emit(pair, "Transfer").withArgs(wallet.address, pair.address, "565685424949237019")
        // .to.emit(pair, "Transfer").withArgs(ZERO_ADDR, other.address, "31")
        // .to.emit(pair, "Transfer").withArgs(pair.address, ZERO_ADDR, "565685424949237019")
        .to.emit(weth, "Transfer").withArgs(pair.address, router.address, "400000000000013270")
        .to.emit(pair, "Sync").withArgs("730", "1459")
        .to.emit(pair, "Burn").withArgs(router.address, "400000000000013270", "799999999999970630", router.address)

      liquidityGTON = BigNumber.from("19986301369863")
      await gton.approve(router.address, liquidityGTON)
      await expect(router.addLiquidityETH(
        gton.address,
        liquidityGTON,
        "19886369863013",
        "9950000000000",
        wallet.address,
        timestamp + 3600,
        {value: "10000000000000"}
      ))
        .to.emit(gton, "Transfer").withArgs(wallet.address, pair.address, "19986301369863")
        .to.emit(weth, "Transfer").withArgs(router.address, pair.address, "9999999999999")
        .to.emit(pair, "Transfer").withArgs(ZERO_ADDR, wallet.address, "14123287671231")
        .to.emit(pair, "Sync").withArgs("10000000000729","19986301371322")
        .to.emit(pair, "Mint").withArgs(router.address, "9999999999999","19986301369863")

      await expect(router.swapExactETHForTokens(
        "1982522985",
        [weth.address, gton.address],
        wallet.address,
        "99999999999999",
        {value: "1000000000"}
      ))
        .to.emit(gton, "Transfer").withArgs(pair.address, wallet.address, "1992435600")
        .to.emit(pair, "Sync").withArgs("10001000000729","19984308935722")
        .to.emit(pair, "Swap").withArgs(router.address, "1000000000", 0, 0, "1992435600", wallet.address)

      const relayFactory = await ethers.getContractFactory("Relay")
      const relay = await relayFactory.deploy(
        weth.address,
        router.address,
        gton.address,
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ["PLG","HEC"],
        [[0,0],[0,0]],
        [[0,"999999999999999999999999"],[0,"9999999999999999999999"]]
      ) as Relay

      await expect(relay.lock("PLG", wallet.address, {value: "1000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "1000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "19785835375436")
        .to.emit(pair, "Sync").withArgs("1010001000000729","198473560286")
        .to.emit(pair, "Swap").withArgs(router.address, "1000000000000000", 0, 0, "19785835375436", relay.address)

      await expect(relay.lock("PLG", wallet.address, {value: "100000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "100000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "196483107576")
        .to.emit(pair, "Sync").withArgs("101010001000000729","1990452710")
        .to.emit(pair, "Swap").withArgs(router.address, "100000000000000000", 0, 0, "196483107576", relay.address)

      await expect(relay.lock("PLG", wallet.address, {value: "100000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "100000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "988730677")
        .to.emit(pair, "Sync").withArgs("201010001000000729","1001722033")
        .to.emit(pair, "Swap").withArgs(router.address, "100000000000000000", 0, 0, "988730677", relay.address)

      await expect(relay.lock("PLG", wallet.address, {value: "10000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "10000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "47337039")
        .to.emit(pair, "Sync").withArgs("211010001000000729","954384994")
        .to.emit(pair, "Swap").withArgs(router.address, "10000000000000000", 0, 0, "47337039", relay.address)

      await relay.setCanRoute(wallet.address, true)
      await gton.transfer(relay.address, "9999999999999999999")

      await expect(relay.routeValue(
        "0x730D536BFA0F4A1E87B8ED59B199C9C7",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "535947773922861049"
      ))
        .to.emit(pair, "Sync").withArgs("376885138","535947774877246043")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "535947773922861049", "211010000623115591", 0, relay.address)

      // https://hecoinfo.com/tx/0x64b40b9bfd4298bd31717eb20733aa6cf2c9e981a9c6b1c39380411ecf62cb1e#eventlog
      await expect(relay.routeValue(
        "0xD7FE1F6B5EC54E59A05F057C443D52F5",
        "HEC",
        "0xBC13C09A5098E3CF0C71AA4F6D467D53B68C278F",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "508177911445907800"
      ))
        .to.emit(pair, "Sync").withArgs("193737319","1044125686323153843")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "508177911445907800", "183147819", 0, relay.address)

      await expect(relay.routeValue(
        "0xB0838CA30FEF41E189C29463B6068D1E",
        "HEC",
        "0xBC13C09A5098E3CF0C71AA4F6D467D53B68C278F",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "5077384364222500237"
      ))
        .to.emit(pair, "Sync").withArgs("33127564","6121510050545654080")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "5077384364222500237", "160609755", 0, relay.address)

      await expect(relay.routeValue(
        "0x46FB424AFB984E22A586023C230D34BC",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "44737584948548"
      ))
        .to.emit(pair, "Sync").withArgs("33127323","6121554788130602628")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "44737584948548", "241", 0, relay.address)

      await expect(relay.routeValue(
        "0x8BFF797BD2F9467EB0D2C87958C4D362",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "44737584646339"
      ))
        .to.emit(pair, "Sync").withArgs("33127082","6121599525715248967")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "44737584646339", "241", 0, relay.address)

      await expect(relay.routeValue(
        "0xA564F36920DD4C6B9ECD5E4C7045BDEF",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "536826664794060101"
      ))
        .to.emit(pair, "Sync").withArgs("30463624","6658426190509309068")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "536826664794060101", "2663458", 0, relay.address)

      // https://hecoinfo.com/tx/0xdeb7b6bf0f44faae2a2bfa7e51cd47d59f1ddfb5b7b43775f7c62186f04b5973#eventlog
      await expect(relay.routeValue(
        "0x0E09C413B5E245F1894ECCF8BC19A36F",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "447338070388980"
      ))
        .to.emit(pair, "Sync").withArgs("30461584","6658873528579698048")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "447338070388980", "2040", 0, relay.address)

      // https://hecoinfo.com/tx/0x3d05ad735f18bf1778c56d1c3c5e2536d62b67f8147066a89c51aaeb20cfa5ee#eventlog
      await expect(relay.lock("PLG", wallet.address, {value: "200000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "200000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "6658873527562447118")
        .to.emit(pair, "Sync").withArgs("200000000030461584","1017250930")
        .to.emit(pair, "Swap").withArgs(router.address, "200000000000000000", 0, 0, "6658873527562447118", relay.address)

      // https://hecoinfo.com/tx/0x453a1a500cd87173fb0ddc49c30637928031ed887833ddab0483f6cd2de19511#eventlog
      await expect(relay.lock("PLG", wallet.address, {value: "1000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "1000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "5045842")
        .to.emit(pair, "Sync").withArgs("201000000030461584","1012205088")
        .to.emit(pair, "Swap").withArgs(router.address, "1000000000000000", 0, 0, "5045842", relay.address)

      // https://hecoinfo.com/tx/0xea1c5683af3456e1cc0348cea669d00387490460e579d1a30795401ebc293c97#eventlog
      await expect(relay.lock("PLG", wallet.address, {value: "100000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "100000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "501824")
        .to.emit(pair, "Sync").withArgs("201100000030461584","1011703264")
        .to.emit(pair, "Swap").withArgs(router.address, "100000000000000", 0, 0, "501824", relay.address)

      // https://hecoinfo.com/tx/0xea347f3b5b9878b0998bed9dfda7af6c4f5a29c75099989ca40beecd9855e201#eventlog
      await expect(relay.lock("PLG", wallet.address, {value: "1000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "1000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "4991010")
        .to.emit(pair, "Sync").withArgs("202100000030461584","1006712254")
        .to.emit(pair, "Swap").withArgs(router.address, "1000000000000000", 0, 0, "4991010", relay.address)

      // https://hecoinfo.com/tx/0x38ae17675b2ef590c2112409817aa64303a001e0b94369446bb67227eb766e75
      await expect(relay.routeValue(
        "0x26E6C1359346463FAEA8FC97923E4259",
        "HEC",
        "0x08D751281654CF6E6951E303EC3C55F92A4B22BD",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "1062257990357274234"
      ))
        .to.emit(pair, "Sync").withArgs("192108466","1062257991363986488")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "1062257990357274234", "202099999838353118", 0, relay.address)

      // https://hecoinfo.com/tx/0x24869dc1264e922efb81ed448cb7d51b1b12a5409473e28f6a598e1186c26ca5#eventlog
      await expect(relay.lock("PLG", wallet.address, {value: "1000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "1000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "1062257786681224305")
        .to.emit(pair, "Sync").withArgs("1000000192108466","204682762183")
        .to.emit(pair, "Swap").withArgs(router.address, "1000000000000000", 0, 0, "1062257786681224305", relay.address)

      // https://hecoinfo.com/tx/0x691aec55f950d7fcf8d8f78317ae7afec9ae4b95ee40cb0c03021b0e3ba037e9#eventlog
      await expect(relay.lock("PLG", wallet.address, {value: "1000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "1000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "102187628575")
        .to.emit(pair, "Sync").withArgs("2000000192108466","102495133608")
        .to.emit(pair, "Swap").withArgs(router.address, "1000000000000000", 0, 0, "102187628575", relay.address)

      // https://hecoinfo.com/tx/0x784c9ec7f034a18b2ae9692977499dcf1f47cad5389a2386da2c6899ba534841
      await expect(relay.routeValue(
        "0xCEA4F5EF2C8048AD8EC2A93A34107718",
        "HEC",
        "0x08D751281654CF6E6951E303EC3C55F92A4B22BD",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "22402724402830101"
      ))
        .to.emit(pair, "Sync").withArgs("9177730398","22402826897963709")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "22402724402830101", "1999991014378068", 0, relay.address)

      // https://hecoinfo.com/tx/0xc8bf96343012afa23a3c93f70499a4feb9e9a9c53220057dad2302bcbe3a5634
      await expect(relay.routeValue(
        "0x60B8B81C25114C74BC4178159B3ED2C4",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "48977260376628"
      ))
        .to.emit(pair, "Sync").withArgs("9157769663","22451804158340337")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "48977260376628", "19960735", 0, relay.address)

      // https://hecoinfo.com/tx/0xc0a7e06865f32ce3db00d4089c8e80f9ac6a6222692d23425948921121832e9b#eventlog
      await expect(relay.lock("PLG", wallet.address, {value: "1000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "1000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "22451597933102184")
        .to.emit(pair, "Sync").withArgs("1000009157769663","206225238153")
        .to.emit(pair, "Swap").withArgs(router.address, "1000000000000000", 0, 0, "22451597933102184", relay.address)

      // https://hecoinfo.com/tx/0xc61a26c605d7cb1cded48344c00636b1addbba87ddd534db5d761627f613cbdf
      await expect(relay.lock("PLG", wallet.address, {value: "1000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "1000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "102957245658")
        .to.emit(pair, "Sync").withArgs("2000009157769663","103267992495")
        .to.emit(pair, "Swap").withArgs(router.address, "1000000000000000", 0, 0, "102957245658", relay.address)

      // https://hecoinfo.com/tx/0x862c54eb75ef4caa07f641bcd8adc9fbd2d3d77908813d65da3293ca3b5b0360#eventlog
      await expect(relay.routeValue(
        "0x5B7424E2B2EB4E1C83A80296A637F0D0",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "97953696364244964"
      ))
        .to.emit(pair, "Sync").withArgs("2114858291","97953799632237459")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "97953696364244964", "2000007042911372", 0, relay.address)

      // https://hecoinfo.com/tx/0x0973993f78fce03cb4e0ea9b70f06356a6d503e76c735bb33bef2e051ae34997#eventlog
      await expect(relay.lock("PLG", wallet.address, {value: "1000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "1000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "97953591850927670")
        .to.emit(pair, "Sync").withArgs("1000002114858291","207781309789")
        .to.emit(pair, "Swap").withArgs(router.address, "1000000000000000", 0, 0, "97953591850927670", relay.address)

      // https://hecoinfo.com/tx/0xc1dc4613e18fe6b3ee1db6357a37b09d75f16313c04608b39dc2362426e6f739
      await expect(relay.routeValue(
        "0x842F5457C93D4BC8B406F051981C29CA",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "17721610624205644"
      ))
        .to.emit(pair, "Sync").withArgs("11759908493","17721818405515433")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "17721610624205644", "999990354949798", 0, relay.address)

      // https://hecoinfo.com/tx/0xa1a4548fb286e0b94a0eff0108dd58b67f9f9f1ee0bf3c5744ed2aa4ca9f2a85#eventlog
      await expect(relay.routeValue(
        "0x54F76CCE90EF4FF48F42678474F0B248",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "1969047231773746"
      ))
        .to.emit(pair, "Sync").withArgs("10587117206","19690865637289179")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "1969047231773746", "1172791287", 0, relay.address)

      // https://hecoinfo.com/tx/0x0aa8c619b7a1043551fcd3a1cebbe00114ec9f4a0eb9df00a4d5f38729bf91b6#eventlog
      await expect(relay.routeValue(
        "0x54F76CCE90EF4FF48F42678474F0B248",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "19690246104101505"
      ))
        .to.emit(pair, "Sync").withArgs("5301594146","39381111741390684")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "19690246104101505", "5285523060", 0, relay.address)

      // https://hecoinfo.com/tx/0x7599dcb9e15b3cc898f398265285ea8ea3d869e5e16e2bf2d2cca3e1b7aeb8c7#eventlog
      await expect(relay.routeValue(
        "0x54F76CCE90EF4FF48F42678474F0B228",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "349335939739490220"
      ))
        .to.emit(pair, "Sync").withArgs("538559049","388717051480880904")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "349335939739490220", "4763035097", 0, relay.address)

      // https://hecoinfo.com/tx/0x1036096d7df84d189c367d82332b996c6cc2490138d7ef67fd0a618881baf2d4
      await expect(relay.lock("PLG", wallet.address, {value: "100000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "100000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "388717049381110749")
        .to.emit(pair, "Sync").withArgs("100000000538559049","2099770155")
        .to.emit(pair, "Swap").withArgs(router.address, "100000000000000000", 0, 0, "388717049381110749", relay.address)

      // https://hecoinfo.com/tx/0xdcc43763966d3fffa6bae0715ee13576d1a0d47061227a13454eb4f7250f9a82#eventlog
      await expect(relay.routeValue(
        "0x54F76CCE90EF4FF48F42678474F0B228",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "55392366741706732"
      ))
        .to.emit(pair, "Sync").withArgs("3802127397","55392368841476887")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "55392366741706732", "99999996736431652", 0, relay.address)

      // https://hecoinfo.com/tx/0x5466e37015526d27abc5b593d71dac8127b5aa392da1aade2b59eece6ccf95f3#eventlog
      await expect(relay.routeValue(
        "0x54376CCE90EF4FF48F42678474F0B228",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "5439690080660058"
      ))
        .to.emit(pair, "Sync").withArgs("3463064721","60832058922136945")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "5439690080660058", "339062676", 0, relay.address)

      // https://hecoinfo.com/tx/0x7affc1f439301c9278cca4f39af3e1952179899ed77d21b3b69805200589681b#eventlog
      await expect(relay.routeValue(
        "0x54376CCE90EF4FF48F42678474F0B228",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "571763261289911957"
      ))
        .to.emit(pair, "Sync").withArgs("333923008","632595320212048902")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "571763261289911957", "3129141713", 0, relay.address)

      // https://hecoinfo.com/tx/0x483dacaeea09439c2a7efee706c696045c3f3c486ec067945406c3f85df4cc08
      await expect(relay.routeValue(
        "0x54376CCE90EF4FF48F42678434F0B228",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "55392366741706732"
      ))
        .to.emit(pair, "Sync").withArgs("307111844","687987686953755634")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "55392366741706732", "26811164", 0, relay.address)

      // https://hecoinfo.com/tx/0x72c5e7a9b9c53b50e68e3f7ccd823c705465c515dbf92f81adcf96052c85820a#eventlog
      await expect(relay.routeValue(
        "0x54376CCE90EF4FF48F42678434F0B228",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "5439690080660058"
      ))
        .to.emit(pair, "Sync").withArgs("304709833","693427377034415692")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "5439690080660058", "2402011", 0, relay.address)

      // https://hecoinfo.com/tx/0x3d6a4916e88d16ac17c7b08262b4ab62ae2a69d57fbd946f3941103e7cfc537e#eventlog
      await expect(relay.lock("PLG", wallet.address, {value: "1000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "1000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "693427165104550419")
        .to.emit(pair, "Sync").withArgs("1000000304709833","211929865273")
        .to.emit(pair, "Swap").withArgs(router.address, "1000000000000000", 0, 0, "693427165104550419", relay.address)

      // https://hecoinfo.com/tx/0x0ca766ff6527aae20f87bea68795581c07611d2626fa7f91d75dba1ee45f9ced
      await expect(relay.routeValue(
        "0x54376CCE90EF4FF48F42378434F0B228",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "571763261289911957"
      ))
        .to.emit(pair, "Sync").withArgs("371775468","571763473219777230")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "571763261289911957", "999999932934365", 0, relay.address)

      // https://hecoinfo.com/tx/0x4d0101b2377bec86e08c636372ceb42c036352018ce9007edd519dc1c4e524bd
      await expect(relay.routeValue(
        "0x54376CCE90EF4FF48F42678234F0B228",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "34571723508286562"
      ))
        .to.emit(pair, "Sync").withArgs("350637734","606335196728063792")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "34571723508286562", "21137734", 0, relay.address)

      // https://hecoinfo.com/tx/0xd3c638c88ff81bc29ff093991af0d171ee3de38cb31dea9f54c43168f2d07291#eventlog
      await expect(relay.routeValue(
        "0x54376CCE90EF4FF48F42678234F0B221",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "60388857901381432"
      ))
        .to.emit(pair, "Sync").withArgs("318965221","666724054629445224")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "60388857901381432", "31672513", 0, relay.address)

      // https://hecoinfo.com/tx/0x757a2090ee155a7c5ca11733297be428e3bd2fc6d85812ea49ffa4e42947cf2c#eventlog
      await expect(relay.routeValue(
        "0x54376CCE90EF4FF48F42678234F0B211",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "349335939739490220"
      ))
        .to.emit(pair, "Sync").withArgs("209516527","1016059994368935444")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "349335939739490220", "109448694", 0, relay.address)

      // https://hecoinfo.com/tx/0xbb1410d027668d0bd588895bfab9d9babc2dd876bda2f5b3af5f1131900be049
      await expect(relay.lock("PLG", wallet.address, {value: "10000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "10000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "1016038642624933380")
        .to.emit(pair, "Sync").withArgs("10000209516527","21351744002064")
        .to.emit(pair, "Swap").withArgs(router.address, "10000000000000", 0, 0, "1016038642624933380", relay.address)

      // https://hecoinfo.com/tx/0x0a664a9294d527ddb7525e59ea06295808bf3ed10c845ccc881fcd3a568d76a5
      await expect(relay.lock("PLG", wallet.address, {value: "100000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "100000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "19405331005179")
        .to.emit(pair, "Sync").withArgs("110000209516527","1946412996885")
        .to.emit(pair, "Swap").withArgs(router.address, "100000000000000", 0, 0, "19405331005179", relay.address)

      // https://hecoinfo.com/tx/0x9e2eed7733d481dc1d3574db35ed16654ba5a5a71000b478f617367641cdba76#eventlog
      await expect(relay.lock("PLG", wallet.address, {value: "500000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "500000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "1594554716288")
        .to.emit(pair, "Sync").withArgs("610000209516527","351858280597")
        .to.emit(pair, "Swap").withArgs(router.address, "500000000000000", 0, 0, "1594554716288", relay.address)

      // https://hecoinfo.com/tx/0x8def1821015b8075d65283daedb102fe9491277767c158b481b9a38af308ad9c#eventlog
      await expect(relay.lock("PLG", wallet.address, {value: "10000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "10000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "331571548968")
        .to.emit(pair, "Sync").withArgs("10610000209516527","20286731629")
        .to.emit(pair, "Swap").withArgs(router.address, "10000000000000000", 0, 0, "331571548968", relay.address)

      // https://hecoinfo.com/tx/0xb9f8473ba169f9edb46696901f3c597b903204e42ce12ea47433e48c7454b6cf
      await expect(relay.routeValue(
        "0x54376CCE90EF4FF48F42678234F0B111",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "488275562900249"
      ))
        .to.emit(pair, "Sync").withArgs("442129233123","488295849631878")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "488275562900249", "10609558080283404", 0, relay.address)

      // https://hecoinfo.com/tx/0x42e476fc040996fef9f4080495fbd5c7069a4e20e9f71209a61914d3c334cce8
      await expect(relay.routeValue(
        "0x54376CCE90EF4FF48F42678234F01111",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "208617995547456990"
      ))
        .to.emit(pair, "Sync").withArgs("1035540180","209106291397088868")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "208617995547456990", "441093692943", 0, relay.address)

      // https://hecoinfo.com/tx/0xe7e71c2f84b2a66f839c511afc2d02a6220617cc2546c218dfa1365ae3cbbe36
      await expect(relay.routeValue(
        "0x54376CCE90EF4FF48F42678214F01111",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "56559332089035628"
      ))
        .to.emit(pair, "Sync").withArgs("815598017","265665623486124496")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "56559332089035628", "219942163", 0, relay.address)

      // https://hecoinfo.com/tx/0x53e364d274331df33ea6f91f9c5f56eddbb342b95aa4e33174d30e472191dcd5
      await expect(relay.lock("PLG", wallet.address, {value: "100000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "100000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "265665621312841106")
        .to.emit(pair, "Sync").withArgs("100000000815598017","2173283390")
        .to.emit(pair, "Swap").withArgs(router.address, "100000000000000000", 0, 0, "265665621312841106", relay.address)

      // https://hecoinfo.com/tx/0x78ccb9505fc922629cdcdd52029107d977ca79359d749e074cd16d6de8fd24a1
      await expect(relay.lock("PLG", wallet.address, {value: "30000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "30000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "500368761")
        .to.emit(pair, "Sync").withArgs("130000000815598017","1672914629")
        .to.emit(pair, "Swap").withArgs(router.address, "30000000000000000", 0, 0, "500368761", relay.address)

      // https://hecoinfo.com/tx/0x75f3fdf528576bca4416dd297474d81ee00e94823f5b5a15f8b540d0508dcf5a
      await expect(relay.lock("PLG", wallet.address, {value: "1000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "1000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "12732321")
        .to.emit(pair, "Sync").withArgs("131000000815598017","1660182308")
        .to.emit(pair, "Swap").withArgs(router.address, "1000000000000000", 0, 0, "12732321", relay.address)

      // https://hecoinfo.com/tx/0x9370317ef9f5958363974787c4ec1818d3235375e8ac3584f41922688a356a9d#eventlog
      await expect(relay.routeValue(
        "0x54376CCE90EF4FF48F42678274F01111",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "155022913318724"
      ))
        .to.emit(pair, "Sync").withArgs("1407120733457","155024573501032")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "155022913318724", "130998593694864560", 0, relay.address)

      // https://hecoinfo.com/tx/0x7463461466a840f34044dd88105c18fda66d2d9d98326cf345e082d002d93cae#eventlog
      await expect(relay.lock("PLG", wallet.address, {value: "3000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "3000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "154951676237134")
        .to.emit(pair, "Sync").withArgs("3001407120733457","72897263898")
        .to.emit(pair, "Swap").withArgs(router.address, "3000000000000000", 0, 0, "154951676237134", relay.address)

      // https://hecoinfo.com/tx/0x88588c26a3a1e225f17c10f6ae078fefac46f24128864f329edcd67ec20a7e0c
      await expect(relay.lock("PLG", wallet.address, {value: "1000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "1000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "18176881420")
        .to.emit(pair, "Sync").withArgs("4001407120733457","54720382478")
        .to.emit(pair, "Swap").withArgs(router.address, "1000000000000000", 0, 0, "18176881420", relay.address)

      // https://hecoinfo.com/tx/0xfcc8bfad04d74bffa12d5db47515ef484515d6e949b1b50d3e2ff63120774ab1
      await expect(relay.lock("PLG", wallet.address, {value: "1000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "1000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "10914721432")
        .to.emit(pair, "Sync").withArgs("5001407120733457","43805661046")
        .to.emit(pair, "Swap").withArgs(router.address, "1000000000000000", 0, 0, "10914721432", relay.address)

      // https://hecoinfo.com/tx/0x0068794a4dbf036c476ae0b5e390c6ab404d6c666467ff903adcd35f32b19ffb
      await expect(relay.routeValue(
        "0x54376CCE90EF4FF48F42678224F01111",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "16566662441815"
      ))
        .to.emit(pair, "Sync").withArgs("13229455515314","16610468102861")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "16566662441815", "4988177665218143", 0, relay.address)

      // https://hecoinfo.com/tx/0x73872bc3d1f4d8aabda0d11e0123bbc45b8221b7f970b8f7c66f59cde61da6f9
      await expect(relay.routeValue(
        "0x54376CCE90EF4FF18F42678224F01111",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "122011515288827021"
      ))
        .to.emit(pair, "Sync").withArgs("1806211341","122028125756929882")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "122011515288827021", "13227649303973", 0, relay.address)

      // https://hecoinfo.com/tx/0x65f82d58faf8faab767952361e10928d89f6d5adb929282370a916b3f960cfaf
      await expect(relay.lock("PLG", wallet.address, {value: "1000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "1000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "122027904685530321")
        .to.emit(pair, "Sync").withArgs("1000001806211341","221071399561")
        .to.emit(pair, "Swap").withArgs(router.address, "1000000000000000", 0, 0, "122027904685530321", relay.address)

      // https://hecoinfo.com/tx/0xc30b57091abbc184f6ace616244a03ccb4a3e4ecee06c5326bbe10cf786afbe5#eventlog
      await expect(relay.lock("PLG", wallet.address, {value: "1000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "1000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "110369547326")
        .to.emit(pair, "Sync").withArgs("2000001806211341","110701852235")
        .to.emit(pair, "Swap").withArgs(router.address, "1000000000000000", 0, 0, "110369547326", relay.address)

      // https://hecoinfo.com/tx/0x6fccc2cc3a477d003450bf7e9749e7e5d6dd38833df4705315b5c0c658594504
      await expect(relay.routeValue(
        "0x14376CCE90EF4FF48F42678224F01111",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "459482509898885"
      ))
        .to.emit(pair, "Sync").withArgs("483188063129","459593211751120")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "459482509898885", "1999518618148212", 0, relay.address)

      // https://hecoinfo.com/tx/0xd2cccb0a2da3cf4d15571795c15fa7ea232938ed59bf819311ae8c8ff3e2715e
      await expect(relay.routeValue(
        "0x14376CCE90EF4FF48F42671224F01111",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "366752696948424125"
      ))
        .to.emit(pair, "Sync").withArgs("606562840","367212290160175245")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "366752696948424125", "482581500289", 0, relay.address)

      // https://hecoinfo.com/tx/0x65780cba866f14607afb0869c28b3f637d01d45bf62ad4017799c297a92b84a3
      await expect(relay.lock("PLG", wallet.address, {value: "1000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "1000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "367212066752758904")
        .to.emit(pair, "Sync").withArgs("1000000606562840","223407416341")
        .to.emit(pair, "Swap").withArgs(router.address, "1000000000000000", 0, 0, "367212066752758904", relay.address)

      // https://hecoinfo.com/tx/0x0325d5c1a432b9395e80e1037f846908b88e7eaf068f25d73bff8cc6ed1a8e98
      await expect(relay.lock("PLG", wallet.address, {value: "10000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "10000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "203042098246")
        .to.emit(pair, "Sync").withArgs("11000000606562840","20365318095")
        .to.emit(pair, "Swap").withArgs(router.address, "10000000000000000", 0, 0, "203042098246", relay.address)

      // https://hecoinfo.com/tx/0x36b890ab2f62ddeca1f756b2095cc2e3881c1e9c2d34bc9da789a69083ccf3f4
      await expect(relay.lock("PLG", wallet.address, {value: "1000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "1000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "1692441536")
        .to.emit(pair, "Sync").withArgs("12000000606562840","18672876559")
        .to.emit(pair, "Swap").withArgs(router.address, "1000000000000000", 0, 0, "1692441536", relay.address)

      // https://hecoinfo.com/tx/0xc4fb75480149e2fd41b63d7a57dcd51644c7b4a66ff94a18cd1a10572c01826e#eventlog
      await expect(relay.lock("PLG", wallet.address, {value: "100000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "100000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "16666837805")
        .to.emit(pair, "Sync").withArgs("112000000606562840","2006038754")
        .to.emit(pair, "Swap").withArgs(router.address, "100000000000000000", 0, 0, "16666837805", relay.address)

      // https://hecoinfo.com/tx/0x06a3deace5638b1d27ffb890fb890bf321b1841d87ac2f82ea09b377b900aff6#eventlog
      await expect(relay.lock("PLG", wallet.address, {value: "10000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "10000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "163976439")
        .to.emit(pair, "Sync").withArgs("122000000606562840","1842062315")
        .to.emit(pair, "Swap").withArgs(router.address, "10000000000000000", 0, 0, "163976439", relay.address)

      // https://hecoinfo.com/tx/0x414198ef815b4d8945abe4eabcfb265d1b78afe6424076942c3068e912728265#eventlog
      await expect(relay.lock("PLG", wallet.address, {value: "10000000000000000"}))
        .to.emit(weth, "Transfer").withArgs(relay.address, pair.address, "10000000000000000")
        .to.emit(gton, "Transfer").withArgs(pair.address, relay.address, "139163152")
        .to.emit(pair, "Sync").withArgs("132000000606562840","1702899163")
        .to.emit(pair, "Swap").withArgs(router.address, "10000000000000000", 0, 0, "139163152", relay.address)

      // https://hecoinfo.com/tx/0xe52d869699bd15cf26ae633cf91fd5d5e3535dea11ec76ab943ee0a799858bf1#eventlog
      await expect(relay.routeValue(
        "0x14376CCE90EF4FF48F42171224F01111",
        "HEC",
        "0xF3D45322F06ECD0F579FEC5A917B685FBA488B46",
        "0xa4f88aed847e87bafdc18210d88464dc24f71fa4bf1b4672710c9bc876bb0044",
        ZERO_ADDR,
        wallet.address,
        wallet.address,
        "733325452721429627"
      ))
        .to.emit(pair, "Sync").withArgs("307447487","733325454424328790")
        .to.emit(pair, "Swap").withArgs(router.address, 0, "733325452721429627", "132000000299115353", 0, relay.address)

      const calibratorFactory = await ethers.getContractFactory("Calibrator")
      const calibrator = (await calibratorFactory.deploy(
        gton.address,
        router.address,
        "MDEX"
      )) as Calibrator

      await pair.approve(calibrator.address, "14123187671231")

      let reserves = await calibrator.getReserves(pair.address, gton.address, weth.address)
      let reserveGTONBefore = reserves[0].toString()
      let reserveTokenBefore = reserves[1].toString()
      // console.log("gton before", reserveGTONBefore)
      // console.log("token before", reserveTokenBefore)

      // console.log("TOTAL SUPPLY: ", (await pair.totalSupply()).toString())
      let estimates = await calibrator.estimateNow(
        pair.address,
        "14123187671231",
        "5192222000000"
      )
      let reserveGTONEstimated = estimates[0] // "733147580690169526"
      let reserveTokenEstimated = estimates[1] //"307447487"
      let amountGTONEstimated = estimates[2] //"177873734159264"
      let liquidityEstimated = estimates[3] //"14121365118915"
      // console.log(
      //   estimates[0].toString(),
      //   estimates[1].toString(),
      //   estimates[2].toString(),
      //   estimates[3].toString()
      // )

      // console.log("LP FEE BEFORE", (await pair.balanceOf(other.address)).toString())
      // https://hecoinfo.com/tx/0x1d1d37183d64db99669b9a905cc644d8243189d50d25b2d6e0f128721dd84ab2
      await expect(calibrator.calibrate(
        pair.address,
        "14123187671231",
        "5192222000000",
        wallet.address
      ))
        .to.emit(pair, "Sync").withArgs( "17979705", "42885290365684524")
        .to.emit(pair, "Sync").withArgs( "17981889", "42880098143684524")
        .to.emit(pair, "Sync").withArgs("307447487","733147580690169526")
      // console.log("LP FEE AFTER", (await pair.balanceOf(other.address)).toString())

      reserves = await calibrator.getReserves(pair.address, gton.address, weth.address)
      let reserveGTONAfter = reserves[0].toString()
      let reserveTokenAfter = reserves[1].toString()
      // console.log("gton after", reserveGTONAfter)
      // console.log("token after", reserveTokenAfter)

      expect(reserveGTONEstimated).to.eq("733147580690169526")
      expect(reserveTokenEstimated).to.eq("307447487")
    })
  })
})

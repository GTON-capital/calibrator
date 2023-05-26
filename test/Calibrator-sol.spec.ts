import { BigNumber as BN } from "bignumber.js"
import { constants } from "ethers"
import { waffle } from "hardhat"

import { Calibrator, IERC20, IPair } from "~/typechain-types"

import { calibratorFixture } from "./shared/fixtures"
import { expect } from "./shared/expect"
import { TestCase, simpleCases, realCases } from "./cases"

describe("Calibrator", () => {
  const [wallet, other, vault] = waffle.provider.getWallets()

  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>

  before("create fixture loader", async () => {
    loadFixture = waffle.createFixtureLoader([wallet, other])
  })

  let tokenBase: IERC20
  let tokenQuote: IERC20
  let pair: IPair
  let calibrator: Calibrator

  beforeEach("deploy test contracts", async () => {
    ;({ tokenBase, tokenQuote, pair, calibrator } = await loadFixture(
      calibratorFixture
    ))
  })

  async function estimate(testCase: TestCase) {
    const { targetBase, targetQuote } = testCase

    let liquidityBalance = await pair.balanceOf(wallet.address)

    await pair.approve(calibrator.address, liquidityBalance)

    const quoteBalance = await tokenQuote.balanceOf(wallet.address)

    await tokenQuote.approve(calibrator.address, quoteBalance)

    const {
      baseToQuote,
      requiredQuote,
      leftoverQuote,
      leftoverLiquidity,
      reserveBase,
      reserveQuote,
    } = await calibrator.estimate(targetBase, targetQuote)

    return {
      targetBase,
      targetQuote,
      targetRatio: new BN(targetQuote).div(new BN(targetBase)).toString(),
      reserveBase: reserveBase.toString(),
      reserveQuote: reserveQuote.toString(),
      liquidityBalance: leftoverLiquidity.toString(),
      requiredQuote: requiredQuote.toString(),
      leftoverQuote: leftoverQuote.toString(),
      outcomeRatio: new BN(reserveQuote.toString())
        .div(new BN(reserveBase.toString()))
        .toString(),
    }
  }

  async function calibrate(testCase: TestCase) {
    const { targetBase, targetQuote } = testCase

    let liquidityBalance = await pair.balanceOf(wallet.address)

    await pair.approve(calibrator.address, liquidityBalance)

    const baseBalanceOld = await tokenBase.balanceOf(wallet.address)

    const quoteBalanceOld = await tokenQuote.balanceOf(wallet.address)

    await tokenQuote.approve(calibrator.address, quoteBalanceOld)

    await calibrator.setRatio(targetBase, targetQuote)

    const quoteBalanceNew = await tokenQuote.balanceOf(wallet.address)
    const baseBalanceNew = await tokenBase.balanceOf(wallet.address)

    let requiredQuote
    let leftoverQuote

    if (quoteBalanceNew.gt(quoteBalanceOld)) {
      requiredQuote = "0"
      leftoverQuote = quoteBalanceNew.sub(quoteBalanceOld).toString()
    } else if (quoteBalanceNew.lt(quoteBalanceOld)) {
      requiredQuote = quoteBalanceOld.sub(quoteBalanceNew).toString()
      leftoverQuote = "0"
    } else {
      requiredQuote = "0"
      leftoverQuote = "0"
    }

    const [reserveBase, reserveQuote] = await calibrator.getRatio()

    liquidityBalance = await pair.balanceOf(wallet.address)

    return {
      targetBase,
      targetQuote,
      targetRatio: new BN(targetQuote).div(new BN(targetBase)).toString(),
      reserveBase: reserveBase.toString(),
      reserveQuote: reserveQuote.toString(),
      liquidityBalance: liquidityBalance.toString(),
      requiredQuote,
      leftoverQuote,
      outcomeRatio: new BN(reserveQuote.toString())
        .div(new BN(reserveBase.toString()))
        .toString(),
    }
  }

  describe("#calibrate - simple", async () => {
    it("matches expectations", async () => {
      for (const testCase of simpleCases) {
        const calibrateResult = await calibrate(testCase)

        expect(calibrateResult).to.deep.equal(testCase)
      }
    })
  })

  describe("#estimate - simple", async () => {
    it("matches expectations", async () => {
      for (const testCase of simpleCases) {
        const estimateResult = await estimate(testCase)

        expect(estimateResult).to.deep.equal(testCase)

        await calibrate(testCase)
      }
    })
  })

  describe("#calibrate - real", async () => {
    it("matches expectations", async () => {
      for (const testCase of realCases) {
        const calibrateResult = await calibrate(testCase)

        expect(calibrateResult).to.deep.equal(testCase)
      }
    })
  })

  describe("#estimate - real", async () => {
    it("matches expectations", async () => {
      for (const testCase of realCases) {
        const estimateResult = await estimate(testCase)

        expect(estimateResult).to.deep.equal(testCase)

        await calibrate(testCase)
      }
    })
  })

  describe("#estimate - real, vault", async () => {
    it("matches expectations", async () => {
      await calibrator.setVault(vault.address)

      await pair.transfer(vault.address, await pair.balanceOf(wallet.address))

      await tokenQuote.transfer(
        vault.address,
        await tokenQuote.balanceOf(wallet.address)
      )

      await tokenBase.transfer(
        vault.address,
        await tokenBase.balanceOf(wallet.address)
      )

      await pair
        .connect(vault)
        .approve(calibrator.address, constants.MaxUint256)

      await tokenQuote
        .connect(vault)
        .approve(calibrator.address, constants.MaxUint256)

      for (const testCase of realCases) {
        const estimateResult = await estimate(testCase)

        expect(estimateResult).to.deep.equal(testCase)

        await calibrate(testCase)
      }
    })
  })
})

import { BigNumber as BN } from "bignumber.js";
import { waffle } from "hardhat"

import { Calibrator, IERC20, IPair } from "~/typechain-types"

import { calibratorFixture } from "./shared/fixtures"
import { expect } from "./shared/expect"
import { TestCase, simpleCases, realCases } from "./cases"

describe("Calibrator", () => {
    const [wallet, other] = waffle.provider.getWallets()

    let loadFixture: ReturnType<typeof waffle.createFixtureLoader>

    before("create fixture loader", async () => {
        loadFixture = waffle.createFixtureLoader([wallet, other])
    })

    let tokenBase: IERC20
    let tokenQuote: IERC20
    let pair: IPair
    let calibrator: Calibrator

    beforeEach("deploy test contracts", async () => {
        ;({ tokenBase,
            tokenQuote,
            pair,
            calibrator } = await loadFixture(calibratorFixture))
    })

    async function estimate(
        testCase: TestCase
    ) {
        const { targetRatioBase, targetRatioQuote } = testCase;

        let liquidityBalance = await pair.balanceOf(wallet.address);

        await pair.approve(calibrator.address, liquidityBalance);

        const quoteBalance = await tokenQuote.balanceOf(wallet.address);

        await tokenQuote.approve(calibrator.address, quoteBalance);

        const {
            baseToQuote,
            requiredBase,
            requiredQuote,
            leftoverBase,
            leftoverQuote,
            leftoverLiquidity,
            reserveBase,
            reserveQuote
        } = await calibrator.estimate(
            targetRatioBase,
            targetRatioQuote
        );

        return {
            targetRatioBase,
            targetRatioQuote,
            targetRatio: (new BN(targetRatioQuote)).div(new BN(targetRatioBase)).toString(),
            reserveBase: reserveBase.toString(),
            reserveQuote: reserveQuote.toString(),
            liquidityBalance: leftoverLiquidity.toString(),
            requiredBase: requiredBase.toString(),
            requiredQuote: requiredQuote.toString(),
            leftoverBase: leftoverBase.toString(),
            leftoverQuote: leftoverQuote.toString(),
            outcomeRatio: (new BN(reserveQuote.toString())).div(new BN(reserveBase.toString())).toString()
        }
    }

    async function calibrate(testCase: TestCase) {
        const { targetRatioBase, targetRatioQuote } = testCase;

        let liquidityBalance = await pair.balanceOf(wallet.address);

        await pair.approve(calibrator.address, liquidityBalance);

        const baseBalance = await tokenBase.balanceOf(wallet.address);

        const quoteBalance = await tokenQuote.balanceOf(wallet.address);

        await tokenQuote.approve(calibrator.address, quoteBalance);

        await calibrator.setRatio(
            targetRatioBase,
            targetRatioQuote
        );

        const quoteBalanceNew = await tokenQuote.balanceOf(wallet.address);
        const baseBalanceNew = await tokenBase.balanceOf(wallet.address);

        let requiredQuote;
        let leftoverQuote;

        if (quoteBalanceNew.gt(quoteBalance)) {
            requiredQuote = "0";
            leftoverQuote = quoteBalanceNew.sub(quoteBalance).toString();
        } else if (quoteBalanceNew.lt(quoteBalance)) {
            requiredQuote = quoteBalance.sub(quoteBalanceNew).toString();
            leftoverQuote = "0";
        } else {
            requiredQuote = "0";
            leftoverQuote = "0";
        }

        let requiredBase;
        let leftoverBase;

        if (baseBalanceNew.gt(baseBalance)) {
            requiredBase = "0";
            leftoverBase = baseBalanceNew.sub(baseBalance).toString();
        } else if (baseBalanceNew.lt(baseBalance)) {
            requiredBase = baseBalance.sub(baseBalanceNew).toString();
            leftoverBase = "0";
        } else {
            requiredBase = "0";
            leftoverBase = "0";
        }

        const [reserveBase, reserveQuote] = await pair.getReserves();

        liquidityBalance = await pair.balanceOf(wallet.address)

        return {
            targetRatioBase,
            targetRatioQuote,
            targetRatio: (new BN(targetRatioQuote)).div(new BN(targetRatioBase)).toString(),
            reserveBase: reserveBase.toString(),
            reserveQuote: reserveQuote.toString(),
            liquidityBalance: liquidityBalance.toString(),
            requiredBase,
            requiredQuote,
            leftoverBase,
            leftoverQuote,
            outcomeRatio: (new BN(reserveQuote.toString())).div(new BN(reserveBase.toString())).toString()
        }
    }

    describe("#calibrate - simple", async () => {
        it("matches expectations", async () => {
            for (const testCase of simpleCases) {
                const calibrateResult = await calibrate(testCase);

                expect(calibrateResult).to.deep.equal(testCase);
            }
        })
    })

    describe("#estimate - simple", async () => {
        it("matches expectations", async () => {
            for (const testCase of simpleCases) {
                const estimateResult = await estimate(testCase);

                expect(estimateResult).to.deep.equal(testCase);

                await calibrate(testCase);
            }
        })
    })

    describe("#calibrate - real", async () => {
        it("matches expectations", async () => {
            for (const testCase of realCases) {
                const calibrateResult = await calibrate(testCase);

                expect(calibrateResult).to.deep.equal(testCase);
            }
        })
    })

    describe("#estimate - real", async () => {
        it("matches expectations", async () => {
            for (const testCase of realCases) {
                const estimateResult = await estimate(testCase);

                expect(estimateResult).to.deep.equal(testCase);

                await calibrate(testCase);
            }
        })
    })
})

import { ethers, waffle } from "hardhat"
import { BigNumber as BN } from "bignumber.js";
import { BigNumber } from "ethers"
import { IERC20 } from "../typechain/IERC20"
import { IPair } from "../typechain/IPair"
import { Calibrator } from "../typechain/Calibrator"
import { calibratorFixture } from "./shared/fixtures"
import { expect } from "./shared/expect"
import { expandTo18Decimals } from "./shared/utilities"

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
            calibrator} = await loadFixture(calibratorFixture))
    })

    interface TestCase {
        targetRatioBase: string;
        targetRatioQuote: string;
        reserveBase: string;
        reserveQuote: string;
        liquidityBalance: string;
    }

    const testCases = [
        { targetRatioBase: "4",
          targetRatioQuote: "10",
          reserveBase: "10000000000000000000",
          reserveQuote: "25053581500282007896",
          liquidityBalance: "15804004512126338535"
        },
        { targetRatioBase: "5",
          targetRatioQuote: "10",
          reserveBase: "10000000000000000000",
          reserveQuote: "20053688888888888888",
          liquidityBalance: "14137066666666665664"
        },
        { targetRatioBase: "4",
          targetRatioQuote: "10",
          reserveBase: "10000000000000000000",
          reserveQuote: "24932472823078796466",
          liquidityBalance: "15760621692828834209"
        },
        { targetRatioBase: "10",
          targetRatioQuote: "8",
          reserveBase: "10000000000000000000",
          reserveQuote: "8013624208304011259",
          liquidityBalance: "8929373680506684430"
        },
        { targetRatioBase: "1",
          targetRatioQuote: "12",
          reserveBase: "10000000000000000000",
          reserveQuote: "119902567629527739569",
          liquidityBalance: "34500611340363746514"
        },
    ]

    async function estimate(
        testCase: TestCase
    ) {
        const { targetRatioBase, targetRatioQuote } = testCase;

        let liquidityBalance = await pair.balanceOf(wallet.address);

        await pair.approve(calibrator.address, liquidityBalance);

        // TODO: calculate a guard for amount of Quote
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
            reserveBase: reserveBase.toString(),
            reserveQuote: reserveQuote.toString(),
            liquidityBalance: leftoverLiquidity.toString()
        }
    }

    async function calibrate(testCase: TestCase) {
        const { targetRatioBase, targetRatioQuote } = testCase;

        let liquidityBalance = await pair.balanceOf(wallet.address);

        await pair.approve(calibrator.address, liquidityBalance);

        // TODO: calculate a guard for amount of Quote
        const quoteBalance = await tokenQuote.balanceOf(wallet.address);

        await tokenQuote.approve(calibrator.address, quoteBalance);

        await calibrator.setRatio(
            targetRatioBase,
            targetRatioQuote
        );

        const [reserveBase, reserveToken] = await pair.getReserves();

        liquidityBalance = await pair.balanceOf(wallet.address)

        return {
            targetRatioBase,
            targetRatioQuote,
            reserveBase: reserveBase.toString(),
            reserveQuote: reserveToken.toString(),
            liquidityBalance: liquidityBalance.toString()
        }
    }

    describe("#calibrate", async () => {
        it("matches expectations", async () => {
            for (const testCase of testCases) {
                const { targetRatioBase, targetRatioQuote } = testCase;

                const calibrateResult = await calibrate(testCase);

                expect(calibrateResult).to.deep.equal(testCase);
            }
        })
    })

    describe("#estimate", async () => {
        it("matches expectations", async () => {
            for (const testCase of testCases) {
                const { targetRatioBase, targetRatioQuote } = testCase;

                const estimateResult = await estimate(testCase);

                expect(estimateResult).to.deep.equal(testCase);

                await calibrate(testCase);
            }
        })
    })
})

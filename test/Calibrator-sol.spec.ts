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
            calibrator } = await loadFixture(calibratorFixture))
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
          liquidityBalance: "15804004512126338535",
          requiredBase: "0",
          leftoverBase: "0",
          requiredQuote: "0",
          leftoverQuote: "24857331640029796112"
        },
        { targetRatioBase: "5",
          targetRatioQuote: "10",
          reserveBase: "10000000000000000000",
          reserveQuote: "20053688888888888888",
          liquidityBalance: "14137066666666665664",
          requiredBase: "0",
          leftoverBase: "0",
          requiredQuote: "0",
          leftoverQuote: "4999892611393119008"
        },
        { targetRatioBase: "4",
          targetRatioQuote: "10",
          reserveBase: "10000000000000000000",
          reserveQuote: "24932472823078796466",
          liquidityBalance: "15760621692828834209",
          requiredBase: "0",
          leftoverBase: "0",
          requiredQuote: "4878783934189907578",
          leftoverQuote: "0"
        },
        { targetRatioBase: "10",
          targetRatioQuote: "8",
          reserveBase: "10000000000000000000",
          reserveQuote: "8013624208304011259",
          liquidityBalance: "8929373680506684430",
          requiredBase: "0",
          leftoverBase: "0",
          requiredQuote: "0",
          leftoverQuote: "16918848614774785207"
        },
        { targetRatioBase: "1",
          targetRatioQuote: "12",
          reserveBase: "10000000000000000000",
          reserveQuote: "119902567629527739569",
          liquidityBalance: "34500611340363746514",
          requiredBase: "0",
          leftoverBase: "0",
          requiredQuote: "111888943421223728310",
          leftoverQuote: "0"
        },
        { targetRatioBase: "16",
          targetRatioQuote: "100",
          reserveBase: "10000000000000000000",
          reserveQuote: "62635465141408174732",
          liquidityBalance: "24925297872033885093",
          requiredBase: "0",
          leftoverBase: "0",
          requiredQuote: "0",
          leftoverQuote: "57267102488119564837"
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
            liquidityBalance: leftoverLiquidity.toString(),
            requiredBase: requiredBase.toString(),
            requiredQuote: requiredQuote.toString(),
            leftoverBase: leftoverBase.toString(),
            leftoverQuote: leftoverQuote.toString()
        }
    }

    async function calibrate(testCase: TestCase) {
        const { targetRatioBase, targetRatioQuote } = testCase;

        let liquidityBalance = await pair.balanceOf(wallet.address);

        await pair.approve(calibrator.address, liquidityBalance);

        const baseBalance = await tokenBase.balanceOf(wallet.address);

        // TODO: calculate a guard for amount of Quote
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

        const [reserveBase, reserveToken] = await pair.getReserves();

        liquidityBalance = await pair.balanceOf(wallet.address)

        return {
            targetRatioBase,
            targetRatioQuote,
            reserveBase: reserveBase.toString(),
            reserveQuote: reserveToken.toString(),
            liquidityBalance: liquidityBalance.toString(),
            requiredBase,
            requiredQuote,
            leftoverBase,
            leftoverQuote
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

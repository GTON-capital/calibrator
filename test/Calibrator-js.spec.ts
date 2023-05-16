import { BigNumber as BN } from "bignumber.js";
import { waffle } from "hardhat"

import { IERC20, IPair, IRouter02 } from "~/typechain-types"

import { expect } from "./shared/expect"
import { uniswapFixture } from "./shared/fixtures"

describe("Calibrator-js", () => {
    const [wallet, other] = waffle.provider.getWallets()

    let loadFixture: ReturnType<typeof waffle.createFixtureLoader>

    before("create fixture loader", async () => {
        loadFixture = waffle.createFixtureLoader([wallet, other])
    })

    let tokenBase: IERC20
    let tokenQuote: IERC20
    let router: IRouter02
    let pair: IPair

    beforeEach("deploy test contracts", async () => {
        ;({ tokenBase,
            tokenQuote,
            router,
            pair } = await loadFixture(uniswapFixture))
    })

    async function timestamp() {
        let block = await wallet.provider.getBlock("latest")

        let timestamp = block.timestamp + 3600

        return timestamp
    }

    async function calibrate(
        targetRatioBase: BN,
        targetRatioQuote: BN
    ) {
        const [reserveBaseInvariant] = (await pair.getReserves()).map((n) => new BN(n.toString()));

        /* Remove liquidity */
        const availableLiquidity = await pair.balanceOf(wallet.address);

        const totalSupply = await pair.totalSupply();

        // preserve minimum liquidity required for 3 decimal precision
        const minimumLiquidity = totalSupply.mul(100000).div(reserveBaseInvariant.toString());

        expect(availableLiquidity).to.be.gte(minimumLiquidity);

        const liquidity = availableLiquidity.sub(minimumLiquidity);

        await pair.approve(router.address, liquidity);

        await router.removeLiquidity(
            tokenBase.address,
            tokenQuote.address,
            liquidity,
            0,
            0,
            wallet.address,
            await timestamp()
        );

        /* Swap to price */
        const [reserveBaseBefore, reserveQuoteBefore] = (await pair.getReserves()).map((n) => new BN(n.toString()));

        const targetRatio = targetRatioBase.div(targetRatioQuote);

        const baseToQuote = reserveBaseBefore.div(reserveQuoteBefore).lt(targetRatio);

        const invariant = reserveBaseBefore.times(reserveQuoteBefore);

        const leftSide = baseToQuote
            ? invariant.times(1000).times(targetRatioBase).div(targetRatioQuote.times(997)).sqrt()
            : invariant.times(1000).times(targetRatioQuote).div(targetRatioBase.times(997)).sqrt();

        const rightSide = (baseToQuote ? reserveBaseBefore.times(1000) : reserveQuoteBefore.times(1000)).div(997);

        expect(leftSide.gt(rightSide));

        const amountIn = leftSide.minus(rightSide).integerValue();

        if (baseToQuote) {
            await tokenBase.approve(router.address, amountIn.toString());
        } else {
            await tokenQuote.approve(router.address, amountIn.toString());
        }

        const path = baseToQuote
            ? [tokenBase.address, tokenQuote.address]
            : [tokenQuote.address, tokenBase.address];

        await router.swapExactTokensForTokens(
            amountIn.toString(),
            0,
            path,
            wallet.address,
            await timestamp()
        );

        const [reserveBaseAfter, reserveQuoteAfter] = (await pair.getReserves()).map((n) => new BN(n.toString()));

        // validate price calibration
        expect(
            reserveBaseAfter.div(reserveQuoteAfter).decimalPlaces(3).toNumber()
        ).to.be.within(
            targetRatioBase.div(targetRatioQuote).decimalPlaces(3).toNumber() - 0.002,
            targetRatioBase.div(targetRatioQuote).decimalPlaces(3).toNumber() + 0.002,
        );

        /* Add liquidity */
        const amountBaseDesired = reserveBaseInvariant.minus(reserveBaseAfter);

        // Library.quote()
        const amountQuoteDesired = amountBaseDesired.times(reserveQuoteAfter).div(reserveBaseAfter).integerValue().toFixed();

        await tokenBase.approve(router.address, amountBaseDesired.toString());

        await tokenQuote.approve(router.address, amountQuoteDesired.toString());

        await router.addLiquidity(
            tokenBase.address,
            tokenQuote.address,
            amountBaseDesired.toString(),
            amountQuoteDesired.toString(),
            0,
            0,
            wallet.address,
            await timestamp()
        );
    }

    interface TestCase {
        targetRatioBase: number;
        targetRatioQuote: number;
        reserveBase: string;
        reserveQuote: string;
        liquidityBalance: string;
    }

    const testCases = [
        { targetRatioBase: 4,
          targetRatioQuote: 10,
          reserveBase: "518159171586236237881",
          reserveQuote: "1295615469025634442369",
          liquidityBalance: "817641044002851015615"
        },
        { targetRatioBase: 5,
          targetRatioQuote: 10,
          reserveBase: "518159171586236237881",
          reserveQuote: "1039108320628187616874",
          liquidityBalance: "732126383632480773524"
        },
        { targetRatioBase: 4,
          targetRatioQuote: 10,
          reserveBase: "518159171586236237881",
          reserveQuote: "1291908449006796113524",
          liquidityBalance: "816210684072656639148"
        },
        { targetRatioBase: 10,
          targetRatioQuote: 8,
          reserveBase: "518159171586236237881",
          reserveQuote: "415236559090256431065",
          liquidityBalance: "462433455516845328998"
        },
        { targetRatioBase: 1,
          targetRatioQuote: 12,
          reserveBase: "518159171586236237881",
          reserveQuote: "6213004732579741960070",
          liquidityBalance: "1786748128884062178228"
        },
    ]

    async function test(testCase: TestCase) {
        const { targetRatioBase, targetRatioQuote } = testCase;

        await calibrate(
            new BN(targetRatioBase),
            new BN(targetRatioQuote)
        );

        const [reserveBase, reserveToken] = await pair.getReserves();

        const liquidityBalance = await pair.balanceOf(wallet.address)

        const result = {
            targetRatioBase,
            targetRatioQuote,
            reserveBase: reserveBase.toString(),
            reserveQuote: reserveToken.toString(),
            liquidityBalance: liquidityBalance.toString()
        };

        expect(result).to.deep.equal(testCase);
    }

    describe("#calibrate", async () => {
        it("matches estimates", async () => {
            for (const testCase of testCases) {
                await test(testCase);
            }
        })
    })
})

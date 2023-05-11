import { ethers, waffle } from "hardhat"
import { BigNumber as BN } from "bignumber.js";
import { BigNumber } from "ethers"
import { IERC20 } from "../typechain/IERC20"
import { IPair } from "../typechain/IPair"
import { IRouter02 } from "../typechain/IRouter02"
import { uniswapFixture } from "./shared/fixtures"
import { expect } from "./shared/expect"
import { expandTo18Decimals, ZERO_ADDR } from "./shared/utilities"

describe("Calibrator", () => {
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

    async function state() {
        const [reserveBase, reserveToken] = await pair.getReserves();

        const liquidity = await pair.balanceOf(wallet.address)

        return [
            reserveBase.toString(),
            reserveToken.toString(),
            liquidity.toString()
        ]
    }

    describe("#calibrate", async () => {
        it("matches estimates", async () => {

            expect(await state()).to.deep.equal([
                "10000000000000000000",
                "50000000000000000000",
                "22360679774997895964"
            ]);

            const liquidity = await pair.balanceOf(wallet.address);

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

            expect(await state()).to.deep.equal([
                "448",
                "2237",
                "0"
            ]);

            const [reserveBaseBN, reserveTokenBN] = await pair.getReserves();

            const reserveBase = new BN(reserveBaseBN.toString());

            const reserveToken = new BN(reserveTokenBN.toString());

            const targetRatioNumerator = 4;

            const targetRatioDenominator = 10;

            const targetRatio = targetRatioNumerator/targetRatioDenominator;

            const aToB = reserveBase.div(reserveToken).lt(targetRatio);

            const invariant = reserveBase.times(reserveToken);

            const leftSide = invariant.times(targetRatioNumerator).div(targetRatioDenominator).sqrt();

            const rightSide = reserveBase;

            const amountIn = leftSide.minus(rightSide).integerValue();

            await tokenBase.approve(router.address, amountIn.toString());

            await router.swapExactTokensForTokens(
                amountIn.toString(),
                0,
                [tokenBase.address, tokenQuote.address],
                wallet.address,
                await timestamp()
            );

            expect(await state()).to.deep.equal([
                "633",
                "1585",
                "0"
            ]);
        })
    })
})

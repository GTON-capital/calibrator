import { ethers, BigNumber } from 'ethers'

import { IERC20 } from "../../typechain/IERC20"
import { UniswapV2Pair } from "../../typechain/UniswapV2Pair"
import { Calibrator } from "../../typechain/Calibrator"

const IERC20ABI = require('../../abi/IERC20.json');
const UniswapV2PairABI = require('../../abi/UniswapV2Pair.json')
const CalibratorABI = require('../../abi/Calibrator.json');

import { C } from './constants'

export default class Invoker {

    provider: ethers.providers.JsonRpcProvider

    constructor(_metamask: ethers.providers.JsonRpcProvider) {
        this.provider = new ethers.providers.JsonRpcProvider("https://matic-mainnet.chainstacklabs.com")
    }

    async safeLiquidity(rpc: string, pool: string, safe: string): Promise<BigNumber> {
        const provider = new ethers.providers.JsonRpcProvider(rpc)
        const contract = new ethers.Contract(pool, UniswapV2PairABI, provider) as UniswapV2Pair
        const balance = await contract.balanceOf(safe)
        return balance
    }

    async totalSupply(rpc: string, pool: string): Promise<BigNumber> {
        const provider = new ethers.providers.JsonRpcProvider(rpc)
        const contract = new ethers.Contract(pool, UniswapV2PairABI, provider) as UniswapV2Pair
        const totalSupply = await contract.totalSupply()
        return totalSupply
    }

    async reserve(rpc: string, pool: string, quote: string): Promise<BigNumber> {
        const provider = new ethers.providers.JsonRpcProvider(rpc)
        const contract = new ethers.Contract(quote, IERC20ABI, provider) as IERC20
        const balance = await contract.balanceOf(pool)
        // console.log(rpc,pool,quote,balance.toString())
        return balance
    }

    async estimateRemove(
        rpc: string,
        base: string,
        calibrator: string,
        pair: string,
        quote: string,
        liquidity: string
    ): Promise<BigNumber[]> {
        const provider = new ethers.providers.JsonRpcProvider(rpc)
        const pool = new ethers.Contract(pair, UniswapV2PairABI, provider) as UniswapV2Pair
        const totalSupply = await pool.totalSupply()
        const kLast = await pool.kLast()
        const calibratorC = new ethers.Contract(calibrator, CalibratorABI, provider) as Calibrator
        let reserves = await calibratorC.getReserves(pair, base, quote)
        let reserveBase = reserves[0]
        let reserveQuote = reserves[1]
        let estimates = await calibratorC["estimateRemove(uint256,uint256,uint256,uint256,uint256)"](reserveBase, reserveQuote, totalSupply, kLast, liquidity)
        let reserveBaseAfterRemove = estimates[0]
        let reserveQuoteAfterRemove = estimates[1]
        let totalSupplyAfter = estimates[2]
        let kLastAfter = estimates[3]
        let amountBaseAfterRemove = estimates[4]
        let amountQuoteAfterRemove = estimates[5]
        return [reserveBaseAfterRemove, reserveQuoteAfterRemove, totalSupplyAfter, kLastAfter, amountBaseAfterRemove, amountQuoteAfterRemove]
    }

    async estimateBuy(
        rpc: string,
        calibrator: string,
        reserveBase: BigNumber,
        reserveQuote: BigNumber,
        amountBaseBuy: string
    ): Promise<BigNumber[]> {
        const provider = new ethers.providers.JsonRpcProvider(rpc)
        const calibratorC = new ethers.Contract(calibrator, CalibratorABI, provider) as Calibrator
        let estimates = await calibratorC["estimateBuy(uint256,uint256,uint256)"](reserveBase, reserveQuote, amountBaseBuy)
        let reserveBaseAfterBuy = estimates[0]
        let reserveQuoteAfterBuy = estimates[1]
        let amountQuoteSell = estimates[2]
        return [reserveBaseAfterBuy, reserveQuoteAfterBuy, amountQuoteSell]
    }

    async getReserves(
        rpc: string,
        calibrator: string,
        pair: string,
        quote1: string,
        quote2: string
    ): Promise<BigNumber[]> {
        const provider = new ethers.providers.JsonRpcProvider(rpc)
        const calibratorC = new ethers.Contract(calibrator, CalibratorABI, provider) as Calibrator
        let reserves = await calibratorC.getReserves(pair, quote1, quote2)
        let reserve1 = reserves[0]
        let reserve2 = reserves[1]
        return [reserve1, reserve2]
    }

    async estimateBuyNow(
        rpc: string,
        calibrator: string,
        pair: string,
        base: string,
        quote: string,
        amountBaseBuy: string
    ): Promise<BigNumber[]> {
        const provider = new ethers.providers.JsonRpcProvider(rpc)
        const calibratorC = new ethers.Contract(calibrator, CalibratorABI, provider) as Calibrator
        let reserves = await calibratorC.getReserves(pair, base, quote)
        let reserveBase = reserves[0]
        let reserveQuote = reserves[1]
        let estimates = await calibratorC.estimateBuyNow(pair, amountBaseBuy)
        let reserveBaseAfterBuy = estimates[0]
        let reserveQuoteAfterBuy = estimates[1]
        let amountQuoteSell = estimates[2]
        return [reserveBase, reserveQuote, reserveBaseAfterBuy, reserveQuoteAfterBuy, amountQuoteSell]
    }

    async estimateSellNow(
        rpc: string,
        calibrator: string,
        pair: string,
        base: string,
        quote: string,
        amountBaseSell: string
    ): Promise<BigNumber[]> {
        const provider = new ethers.providers.JsonRpcProvider(rpc)
        const calibratorC = new ethers.Contract(calibrator, CalibratorABI, provider) as Calibrator
        let reserves = await calibratorC.getReserves(pair, base, quote)
        let reserveBase = reserves[0]
        let reserveQuote = reserves[1]
        let estimates = await calibratorC.estimateSellNow(pair, amountBaseSell)
        let reserveBaseAfterSell = estimates[0]
        let reserveQuoteAfterSell = estimates[1]
        let amountQuoteBuy = estimates[2]
        return [reserveBase, reserveQuote, reserveBaseAfterSell, reserveQuoteAfterSell, amountQuoteBuy]
    }

    async estimateAdd(
        rpc: string,
        calibrator: string,
        reserveBase: BigNumber,
        reserveQuote: BigNumber,
        totalSupply: BigNumber,
        kLast: BigNumber,
        amountQuoteAdd: BigNumber
    ): Promise<BigNumber[]> {
        const provider = new ethers.providers.JsonRpcProvider(rpc)
        const calibratorC = new ethers.Contract(calibrator, CalibratorABI, provider) as Calibrator
        let estimates = await calibratorC["estimateAdd(uint256,uint256,uint256,uint256,uint256)"](
             reserveBase,
             reserveQuote,
             totalSupply,
             kLast,
             amountQuoteAdd
        )
        let reserveBaseAfterAdd = estimates[0]
        let reserveQuoteAfterAdd = estimates[1]
        console.log(reserveQuoteAfterAdd.toString())
        let amountBaseAdd = estimates[4]
        console.log(amountBaseAdd.toString())
        return [reserveBaseAfterAdd, reserveQuoteAfterAdd, amountBaseAdd]
    }

    async estimateNow(
        rpc: string,
        calibrator: string,
        pool: string,
        liquidity: string,
        buyback: string
    ): Promise<BigNumber[]> {
        const provider = new ethers.providers.JsonRpcProvider(rpc)
        const calibratorC = new ethers.Contract(calibrator, CalibratorABI, provider) as Calibrator
        let estimateNow = await calibratorC.estimateNow(pool, liquidity, buyback)
        let reserveBase = estimateNow[0]
        let reserveQuote = estimateNow[1]
        let baseback = estimateNow[2]
        return [reserveBase, reserveQuote, baseback]
    }

    getAmountOut(
        amountIn: BigNumber,
        reserveIn: BigNumber,
        reserveOut: BigNumber
    ): BigNumber {
        let amountInWithFee = amountIn.mul(BigNumber.from(997))
        let numerator = amountInWithFee.mul(reserveOut)
        let denominator = reserveIn.mul(1000).add(amountInWithFee)
        let amountOut = numerator.div(denominator)
        return amountOut
    }

    getAmountIn(
        amountOut: BigNumber,
        reserveIn: BigNumber,
        reserveOut: BigNumber
    ): BigNumber {
        let numerator = reserveIn.mul(amountOut).mul(1000)
        let denominator = (reserveOut.sub(amountOut)).mul(997)
        let amountIn = (numerator.div(denominator)).add(1)
        return amountIn
    }
}

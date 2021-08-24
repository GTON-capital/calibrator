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

    async reserve(rpc: string, pool: string, token: string): Promise<BigNumber> {
        const provider = new ethers.providers.JsonRpcProvider(rpc)
        const contract = new ethers.Contract(token, IERC20ABI, provider) as IERC20
        const balance = await contract.balanceOf(pool)
        console.log(rpc,pool,token,balance.toString())
        return balance
    }

    async estimateRemove(
        rpc: string,
        gton: string,
        calibrator: string,
        pair: string,
        token: string,
        liquidity: string
    ): Promise<BigNumber[]> {
        const provider = new ethers.providers.JsonRpcProvider(rpc)
        const pool = new ethers.Contract(pair, UniswapV2PairABI, provider) as UniswapV2Pair
        const totalSupply = await pool.totalSupply()
        const calibratorC = new ethers.Contract(calibrator, CalibratorABI, provider) as Calibrator
        let reserves = await calibratorC.getReserves(pair, gton, token)
        let reserveGton = reserves[0]
        let reserveToken = reserves[1]
        let remove = await calibratorC.estimateRemove(reserveGton, reserveToken, totalSupply, liquidity)
        let reserveGtonAfterRemove = remove[0]
        let reserveTokenAfterRemove = remove[1]
        let removedGton = remove[2]
        let removedToken = remove[3]
        return [reserveGtonAfterRemove, reserveTokenAfterRemove, removedGton, removedToken]
    }

    async estimateBuyback(
        rpc: string,
        calibrator: string,
        reserveGton: BigNumber,
        reserveToken: BigNumber,
        amountBuyback: string
    ): Promise<BigNumber[]> {
        const provider = new ethers.providers.JsonRpcProvider(rpc)
        const calibratorC = new ethers.Contract(calibrator, CalibratorABI, provider) as Calibrator
        let buyback = await calibratorC.estimateBuyback(reserveGton, reserveToken, amountBuyback)
        let reserveGtonAfterBuyback = buyback[0]
        let reserveTokenAfterBuyback = buyback[1]
        let amountToken = buyback[2]
        return [reserveGtonAfterBuyback, reserveTokenAfterBuyback, amountToken]
    }

    async getReserves(
        rpc: string,
        calibrator: string,
        pair: string,
        token1: string,
        token2: string
    ): Promise<BigNumber[]> {
        const provider = new ethers.providers.JsonRpcProvider(rpc)
        const calibratorC = new ethers.Contract(calibrator, CalibratorABI, provider) as Calibrator
        let reserves = await calibratorC.getReserves(pair, token1, token2)
        let reserve1 = reserves[0]
        let reserve2 = reserves[1]
        return [reserve1, reserve2]
    }

    async estimateBuybackNow(
        rpc: string,
        calibrator: string,
        pair: string,
        gton: string,
        token: string,
        amountBuyback: string
    ): Promise<BigNumber[]> {
        const provider = new ethers.providers.JsonRpcProvider(rpc)
        const calibratorC = new ethers.Contract(calibrator, CalibratorABI, provider) as Calibrator
        let reserves = await calibratorC.getReserves(pair, gton, token)
        let reserveGton = reserves[0]
        let reserveToken = reserves[1]
        let buyback = await calibratorC.estimateBuyback(reserveGton, reserveToken, amountBuyback)
        let reserveGtonAfterBuyback = buyback[0]
        let reserveTokenAfterBuyback = buyback[1]
        let amountToken = buyback[2]
        return [reserveGton, reserveToken, reserveGtonAfterBuyback, reserveTokenAfterBuyback, amountToken]
    }

    async estimateAdd(
        rpc: string,
        calibrator: string,
        reserveGton: BigNumber,
        reserveToken: BigNumber,
        amountToken: BigNumber
    ): Promise<BigNumber[]> {
        const provider = new ethers.providers.JsonRpcProvider(rpc)
        const calibratorC = new ethers.Contract(calibrator, CalibratorABI, provider) as Calibrator
        let add = await calibratorC.estimateAdd(reserveGton, reserveToken, amountToken)
        let reserveGtonAfterAdd = add[0]
        let reserveTokenAfterAdd = add[1]
        let amountGton = add[2]
        return [reserveGtonAfterAdd, reserveTokenAfterAdd, amountGton]
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
        let reserveGton = estimateNow[0]
        let reserveToken = estimateNow[1]
        let gtonback = estimateNow[2]
        return [reserveGton, reserveToken, gtonback]
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

     getAmountIns(
             reserveIn: BigNumber,
             reserveOut: BigNumber,
             reserveIn1: BigNumber,
             reserveOut1: BigNumber
         ): BigNumber[] {
         let amountInWithFee = amountIn.mul(BigNumber.from(997))
        let numerator = amountInWithFee.mul(reserveOut)
        let denominator = reserveIn.mul(1000).add(amountInWithFee)
        let amountOut = numerator.div(denominator)
             return [amountIn, amountOut]
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

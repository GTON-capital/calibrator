import { ethers, BigNumber } from 'ethers'

import { IERC20 } from "../../typechain/IERC20"
import { UniswapV2Pair } from "../../typechain/UniswapV2Pair"
import { Pumper } from "../../typechain/Pumper"

const IERC20ABI = require('../../abi/IERC20.json');
const UniswapV2PairABI = require('../../abi/UniswapV2Pair.json')
const PumperABI = require('../../abi/Pumper.json');

import { C } from './constants'

export default class Invoker {

    provider: ethers.providers.JsonRpcProvider

    constructor(_metamask: ethers.providers.JsonRpcProvider) {
        this.provider = new ethers.providers.JsonRpcProvider("https://matic-mainnet.chainstacklabs.com")
    }

    async safeLiquidity(pool: string): Promise<BigNumber> {
        const contract = new ethers.Contract(pool, UniswapV2PairABI, this.provider) as UniswapV2Pair
        const balance = await contract.balanceOf(C.safe)
        return balance
    }

    async totalSupply(pool: string): Promise<BigNumber> {
        const contract = new ethers.Contract(pool, UniswapV2PairABI, this.provider) as UniswapV2Pair
        const totalSupply = await contract.totalSupply()
        return totalSupply
    }

    async reserve(pool: string, token: string): Promise<BigNumber> {
        const contract = new ethers.Contract(token, IERC20ABI, this.provider) as IERC20
        const balance = await contract.balanceOf(pool)
        return balance
    }

    async estimateRemove(pair: string, token: string, liquidity: string): Promise<BigNumber[]> {
        const pool = new ethers.Contract(pair, UniswapV2PairABI, this.provider) as UniswapV2Pair
        const totalSupply = await pool.totalSupply()
        const pumper = new ethers.Contract(C.pumper, PumperABI, this.provider) as Pumper
        let reserves = await pumper.getReserves(pair, C.gton, token)
        let reserveGton = reserves[0]
        let reserveToken = reserves[1]
        let remove = await pumper.estimateRemove(reserveGton, reserveToken, totalSupply, liquidity)
        let reserveGtonAfterRemove = remove[0]
        let reserveTokenAfterRemove = remove[1]
        let removedGton = remove[2]
        let removedToken = remove[3]
        return [reserveGtonAfterRemove, reserveTokenAfterRemove, removedGton, removedToken]
    }

    async estimateBuyback(reserveGton: BigNumber, reserveToken: BigNumber, amountBuyback: string): Promise<BigNumber[]> {
        const pumper = new ethers.Contract(C.pumper, PumperABI, this.provider) as Pumper
        let buyback = await pumper.estimateBuyback(reserveGton, reserveToken, amountBuyback)
        let reserveGtonAfterBuyback = buyback[0]
        let reserveTokenAfterBuyback = buyback[1]
        let amountToken = buyback[2]
        return [reserveGtonAfterBuyback, reserveTokenAfterBuyback, amountToken]
    }

    async estimateAdd(reserveGton: BigNumber, reserveToken: BigNumber, amountToken: BigNumber): Promise<BigNumber[]> {
        const pumper = new ethers.Contract(C.pumper, PumperABI, this.provider) as Pumper
        let add = await pumper.estimateAdd(reserveGton, reserveToken, amountToken)
        let reserveGtonAfterAdd = add[0]
        let reserveTokenAfterAdd = add[1]
        let amountGton = add[2]
        return [reserveGtonAfterAdd, reserveTokenAfterAdd, amountGton]
    }

    async estimateNow(pool: string, liquidity: string, buyback: string): Promise<BigNumber[]> {
        const pumper = new ethers.Contract(C.pumper, PumperABI, this.provider) as Pumper
        let estimateNow = await pumper.estimateNow(pool, liquidity, buyback)
        let reserveGton = estimateNow[0]
        let reserveToken = estimateNow[1]
        let gtonback = estimateNow[2]
        return [reserveGton, reserveToken, gtonback]
    }
}

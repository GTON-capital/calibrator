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

    async estimateNow(liquidity: string, buyback: string): Promise<BigNumber[]> {
        const contract = new ethers.Contract(C.pumper, PumperABI, this.provider) as Pumper
        let result = await contract.estimateNow(C.quick_pool_GTON_USDC, liquidity, buyback)
        let reserveGTON = result[0]
        let reserveToken = result[1]
        let gtonback = result[2]
        return [reserveGTON, reserveToken, gtonback]
    }
}

// export function formatETHBalance(amount: string): string {
//   return ethers.utils.formatUnits(amount, "ether");
// }
// export function formatAmountToPrecision(
//   value: string,
//   precision: number
// ): string {
//   let dotAt = value.indexOf(".");
//   return dotAt !== -1 ? value.slice(0, ++dotAt + precision) : value;
// }

import { ethers, BigNumber } from 'ethers'

import { IERC20 } from "../../typechain/IERC20"
import { Pumper } from "../../typechain/Pumper"

const IERC20ABI = require('../../abi/IERC20.json');
const PumperABI = require('../../abi/Pumper.json');

import { C } from '../services/constants.ts'

export default class Invoker {

    metamask: ethers.providers.Web3Provider
    signer: ethers.Signer

    constructor(_metamask: ethers.providers.Web3Provider) {
        this.metamask = _metamask
        this.signer = this.metamask.getSigner()
    }

    async safeLiquidity(pool: string): Promise<BigNumber> {
        const contract = new ethers.Contract(pool, IERC20ABI, provider) as IERC20
        const balance = await contract.balanceOf(C.safe)
        return balance
    }

    async reserve(pool: string, token: string): Promise<BigNumber> {
        const contract = new ethers.Contract(token, IERC20ABI, provider) as IERC20
        const balance = await contract.balanceOf(pool)
        return balance
    }

    async estimateNow(liquidity: string, buyback: string): (reserveGTON: BigNumber, reserveToken: BigNumber, gtonback: BigNumber) {
        var address: string
        var provider: ethers.providers.JsonRpcProvider
        const contract = new ethers.Contract(address, PumperABI, provider) as Pumper
        let result = await contract.estimateNow(liquidity, buyback)
        reserveGTON = result[0]
        reserveToken = result[1]
        gtonback = result[2]
    }
}

export function formatETHBalance(amount: string): string {
  return ethers.utils.formatUnits(amount, "ether");
}
export function formatAmountToPrecision(
  value: string,
  precision: number
): string {
  let dotAt = value.indexOf(".");
  return dotAt !== -1 ? value.slice(0, ++dotAt + precision) : value;
}

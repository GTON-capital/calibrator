import { ethers } from "hardhat"
import { BigNumber, Bytes } from "ethers"

export const MAX_UINT = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

export function expandTo18Decimals(n: number): BigNumber {
  return BigNumber.from(n).mul(BigNumber.from(10).pow(18))
}

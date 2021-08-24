import { ethers } from 'ethers'

export interface Constants {
    gton_plg: string
    safe_plg: string
    quick_pool_GTON_USDC: string
    usdc_plg: string,
    quick_pool_GTON_WMATIC: string
    wmatic: string,
    quick_router: string
    quick_factory: string
    calibrator_plg: string
    rpc_ftm: string
    rpc_bsc: string
    rpc_plg: string
    rpc_hec: string
    gton_hec: string
    ht_hec: string
    safe_hec: string
    calibrator_hec: string
    mdex_pool_GTON_HT: string
    mdex_router: string
    mdex_factory: string
}

export const C: Constants = {
    gton_plg: '0xf480f38c366daac4305dc484b2ad7a496ff00cea',
    safe_plg: '0x9b28eAB67c14df24FF7E58C6E3f852a0DC41A807',
    quick_pool_GTON_USDC: '0xf01a0a0424bda0acdd044a61af88a34636e0001c',
    usdc_plg: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
    quick_pool_GTON_WMATIC: '0x7d49d50c886882220c428afbe60408904c72e2df',
    wmatic: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
    quick_router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
    quick_factory: '0x5757371414417b8c6caad45baef941abc7d3ab32',
    calibrator_plg: '0xFfB57187269aF94B660E3486b7519b81bE374cc8',
    rpc_ftm: 'https://rpc.ftm.tools',
    rpc_bsc: 'https://bsc-dataseed1.binance.org',
    rpc_plg: 'https://rpc-mainnet.maticvigil.com',
    rpc_hec: 'https://http-mainnet.hecochain.com',
    gton_hec: '0x922d641a426dcffaef11680e5358f34d97d112e1',
    safe_hec: '0xced486e3905f8fe1e8af5d1791f5e7ad7915f01a',
    calibrator_hec: '0x1C43a3852D73E2f3440744A6156092e915c5f362',
    ht_hec: '0x5545153ccfca01fbd7dd11c0b23ba694d9509a6f',
    mdex_pool_GTON_HT: '0x071f1ea3f4cdecbdc8ab49867c7c7bf44fa25143',
    mdex_router: '0xed7d5f38c79115ca12fe6c0041abb22f0a06c300',
    mdex_factory: '0xb0b670fc1F7724119963018DB0BfA86aDb22d941'
}

export const tokens = [
    {name: "PLG USDC", decimals: 6, value: C.usdc_plg},
    {name: "PLG WMATIC", decimals: 18, value: C.wmatic}
]
export const gtons = [
    {name: "PLG", value: C.gton_plg}
]
export const safes = [
    {name: "PLG", value: C.safe_plg}
]
export const calibrators = [
    {name: "PLG", value: C.calibrator_plg}
]
export const factories = [
    {name: "Quick", value: C.quick_factory}
]
export const routers = [
    {name: "Quick", value: C.quick_router}
]
export const pools = [
    {name: "Quick GTON-USDC", value: C.quick_pool_GTON_USDC},
    {name: "Quick GTON-WMATIC", value: C.quick_pool_GTON_WMATIC}
]
export const rpcs = [
    {name: "PLG", value: C.rpc_plg}
]

 const template_plg_usdc = {
     name: "PLG GTON-USDC",
     gton: C.gton_plg,
     safe: C.safe_plg,
     calibrator: C.calibrator_plg,
     token: C.usdc_plg,
     decimals: 6,
     router: C.quick_router,
     factory: C.quick_factory,
     pool: C.quick_pool_GTON_USDC,
     rpc: C.rpc_plg
 }
 const template_hec_ht = {
     name: "HEC GTON-HT",
     gton: C.gton_hec,
     safe: C.safe_hec,
     calibrator: C.calibrator_hec,
     token: C.ht_hec,
     decimals: 18,
     router: C.mdex_router,
     factory: C.mdex_factory,
     pool: C.mdex_pool_GTON_HT,
     rpc: C.rpc_hec
 }

export const templates = [
    template_plg_usdc,
    template_hec_ht
]

import { ethers } from 'ethers'

export interface Constants {
    gton: string
    safe: string
    quick_pool_GTON_USDC: string
    usdc: string,
    quick_pool_GTON_WMATIC: string
    matic: string,
    quick_router: string
    quick_factory: string
    pumper: string
}

export const C: Constants = {
    gton: '0xf480f38c366daac4305dc484b2ad7a496ff00cea',
    safe: '0x9b28eAB67c14df24FF7E58C6E3f852a0DC41A807',
    quick_pool_GTON_USDC: '0xf01a0a0424bda0acdd044a61af88a34636e0001c',
    usdc: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
    quick_pool_GTON_WMATIC: '0x7d49d50c886882220c428afbe60408904c72e2df',
    matic: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
    quick_router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
    quick_factory: '0x5757371414417b8c6caad45baef941abc7d3ab32',
    pumper: '0xdC72a6D3F7dB1B12104Bb54895216274A381b307'
}

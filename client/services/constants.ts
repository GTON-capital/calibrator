import { ethers } from "ethers"

export interface Constants {
  gton_plg: string
  safe_plg: string
  quick_pool_GTON_USDC: string
  usdc_plg: string
  quick_pool_GTON_WMATIC: string
  wmatic: string
  quick_router: string
  quick_factory: string
  calibrator_plg: string
  rpc_ftm: string
  rpc_bsc: string
  rpc_plg: string
  rpc_hec: string
  rpc_xdai: string
  rpc_avax: string
  gton_hec: string
  ht_hec: string
  safe_hec: string
  calibrator_hec: string
  mdex_pool_GTON_HT: string
  mdex_router: string
  mdex_factory: string
  bsc_gton: string
  bsc_safe: string
  bsc_wbnb: string
  bsc_busd: string
  calibrator_bsc: string
  cake_pool_GTON_WBNB: string
  cake_pool_GTON_BUSD: string
  cake_router: string
  cake_factory: string
  spooky_router: string
  spooky_factory: string
  spirit_router: string
  spirit_factory: string
  sushi_eth_factory: string
  sushi_eth_router: string
  pangolin_router: string
  pangolin_factory: string
  honey_xdai_router: string
  honey_xdai_factory: string
  wavax: string
  gton_avax: string
  wxdai: string
  gton_xdai: string
  pangolin_GTON_WAVAX: string
  ftm_gton: string
  wftm: string
  spooky_GTON_WFTM: string
  spooky_GTON_USDC: string
  spirit_GTON_WFTM: string
  spirit_GTON_USDC: string
  spirit_GTON_FUSDT: string
  fusdt: string
  ftm_usdc: string
  calibrator_spooky: string
  calibrator_spirit: string
  ftm_safe: string
}

export const C: Constants = {
  gton_plg: "0xf480f38c366daac4305dc484b2ad7a496ff00cea",
  safe_plg: "0x9b28eAB67c14df24FF7E58C6E3f852a0DC41A807",
  ftm_safe: "0xB3D22267E7260ec6c3931d50D215ABa5Fd54506a",
  usdc_plg: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
  wmatic: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
  quick_pool_GTON_USDC: "0xf01a0a0424bda0acdd044a61af88a34636e0001c",
  quick_pool_GTON_WMATIC: "0x7d49d50c886882220c428afbe60408904c72e2df",
  quick_router: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
  quick_factory: "0x5757371414417b8c6caad45baef941abc7d3ab32",
  calibrator_plg: "0x85A6536853B47997b430344DbD1e76C3aCbA2817",
  rpc_ftm: "https://rpc.ftm.tools",
  rpc_bsc: "https://bsc-dataseed1.binance.org",
  rpc_plg: "https://rpc-mainnet.maticvigil.com",
  rpc_hec: "https://http-mainnet.hecochain.com",
  rpc_xdai: "https://rpc.xdaichain.com",
  rpc_avax: "https://api.avax.network/ext/bc/C/rpc",
  gton_hec: "0x922d641a426dcffaef11680e5358f34d97d112e1",
  safe_hec: "0xced486e3905f8fe1e8af5d1791f5e7ad7915f01a",
  calibrator_hec: "0x04349651DE1e886d8DC534FabFf5cFe6bc756c0E",
  ht_hec: "0x5545153ccfca01fbd7dd11c0b23ba694d9509a6f",
  mdex_pool_GTON_HT: "0x071f1ea3f4cdecbdc8ab49867c7c7bf44fa25143",
  mdex_router: "0xed7d5f38c79115ca12fe6c0041abb22f0a06c300",
  mdex_factory: "0xb0b670fc1F7724119963018DB0BfA86aDb22d941",
  bsc_gton: "0x64d5baf5ac030e2b7c435add967f787ae94d0205",
  bsc_safe: "0x93B443d1f4081b58dE5ca637D63E49880C04ac4a",
  bsc_wbnb: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  bsc_busd: "0xe9e7cea3dedca5984780bafc599bd69add087d56",
  calibrator_bsc: "0x1e9d2aD793C82097CFd6Fa0c9596d08fFCe900f5",
  calibrator_spirit: "0x0D715369C8368b90fE51dD3c0B89d692Bb2cd220",
  calibrator_spooky: "0x9EC3dD9bdEe6321a98Ffa779147d2d25af0C3DcD",
  cake_pool_GTON_WBNB: "0xA216571b69dd69600F50992f7c23b07B1980CfD8",
  cake_pool_GTON_BUSD: "0xbe2c760aE00CbE6A5857cda719E74715edC22279",
  cake_router: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
  cake_factory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
  spooky_factory: "0x152ee697f2e276fa89e96742e9bb9ab1f2e61be3",
  spooky_router: "0xF491e7B69E4244ad4002BC14e878a34207E38c29",
  spirit_factory: "0xef45d134b73241eda7703fa787148d9c9f4950b0",
  spirit_router: "0x16327E3FbDaCA3bcF7E38F5Af2599D2DDc33aE52",
  sushi_eth_router: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
  sushi_eth_factory: "0xc0aee478e3658e2610c5f7a4a2e1777ce9e4f2ac",
  pangolin_router: "0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106",
  pangolin_factory: "0xefa94DE7a4656D787667C749f7E1223D71E9FD88",
  honey_xdai_router: "0x1C232F01118CB8B424793ae03F870aa7D0ac7f77",
  honey_xdai_factory: "0xA818b4F111Ccac7AA31D0BCc0806d64F2E0737D7",
  wavax: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
  gton_avax: "0x4E720DD3Ac5CFe1e1fbDE4935f386Bb1C66F4642",
  wxdai: "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d",
  gton_xdai: "0x6aB6d61428fde76768D7b45D8BFeec19c6eF91A8",
  pangolin_GTON_WAVAX: "0xb1e5b6fed540c9f7563bfe0c585acaabca7db0d9",
  ftm_gton: "0xC1Be9a4D5D45BeeACAE296a7BD5fADBfc14602C4",
  wftm: "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
  spooky_GTON_WFTM: "0xcf9f857ffe6ff32b41b2a0d0b4448c16564886de",
  spooky_GTON_USDC: "0xb9b452A71Dd1cfB4952d90e03bf701A6C7Ae263b",
  spirit_GTON_WFTM: "0x25F5B3840D414a21c4Fc46D21699e54d48F75FDD",
  spirit_GTON_USDC: "0x8a5555c4996b72e5725cf108ad773ce5e715ded4",
  spirit_GTON_FUSDT: "0x070AB37714b96f1A938e75CAbbb64ED5F5748170",
  fusdt: "0x049d68029688eabf473097a2fc38ef61633a3c7a",
  ftm_usdc: "0x04068da6c83afcfa0e13ba15a6696662335d5b75"
}

export const tokens = [
  { name: "PLG USDC", decimals: 6, value: C.usdc_plg },
  { name: "PLG WMATIC", decimals: 18, value: C.wmatic }
]
export const gtons = [{ name: "PLG", value: C.gton_plg }]
export const safes = [{ name: "PLG", value: C.safe_plg }]
export const calibrators = [{ name: "PLG", value: C.calibrator_plg }]
export const factories = [{ name: "Quick", value: C.quick_factory }]
export const routers = [{ name: "Quick", value: C.quick_router }]
export const pools = [
  { name: "Quick GTON-USDC", value: C.quick_pool_GTON_USDC },
  { name: "Quick GTON-WMATIC", value: C.quick_pool_GTON_WMATIC }
]
export const rpcs = [
  { name: "PLG", value: C.rpc_plg },
  { name: "PLG", value: C.rpc_bsc },
  { name: "PLG", value: C.rpc_hec }
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
const template_plg_wmatic = {
  name: "PLG GTON-WMATIC",
  gton: C.gton_plg,
  safe: C.safe_plg,
  calibrator: C.calibrator_plg,
  token: C.wmatic,
  decimals: 18,
  router: C.quick_router,
  factory: C.quick_factory,
  pool: C.quick_pool_GTON_WMATIC,
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
const template_bsc_bnb = {
  name: "BSC GTON-BNB",
  gton: C.bsc_gton,
  safe: C.bsc_safe,
  calibrator: C.calibrator_bsc,
  token: C.bsc_wbnb,
  decimals: 18,
  router: C.cake_router,
  factory: C.cake_factory,
  pool: C.cake_pool_GTON_WBNB,
  rpc: C.rpc_bsc
}
const template_bsc_busd = {
  name: "BSC GTON-BUSD",
  gton: C.bsc_gton,
  safe: C.bsc_safe,
  calibrator: C.calibrator_bsc,
  token: C.bsc_busd,
  decimals: 18,
  router: C.cake_router,
  factory: C.cake_factory,
  pool: C.cake_pool_GTON_BUSD,
  rpc: C.rpc_bsc
}
const template_spirit_usdc = {
  name: "SPIRIT GTON-USDC",
  gton: C.ftm_gton,
  safe: C.ftm_safe,
  calibrator: C.calibrator_spirit,
  token: C.ftm_usdc,
  decimals: 6,
  router: C.spirit_router,
  factory: C.spirit_factory,
  pool: C.spirit_GTON_USDC,
  rpc: C.rpc_ftm
}
const template_spirit_wftm = {
  name: "SPIRIT GTON-WFTM",
  gton: C.ftm_gton,
  safe: C.ftm_safe,
  calibrator: C.calibrator_spirit,
  token: C.wftm,
  decimals: 18,
  router: C.spirit_router,
  factory: C.spirit_factory,
  pool: C.spirit_GTON_WFTM,
  rpc: C.rpc_ftm
}
const template_spirit_fusdt = {
  name: "SPIRIT GTON-FUSDT",
  gton: C.ftm_gton,
  safe: C.ftm_safe,
  calibrator: C.calibrator_spirit,
  token: C.fusdt,
  decimals: 18,
  router: C.spirit_router,
  factory: C.spirit_factory,
  pool: C.spirit_GTON_FUSDT,
  rpc: C.rpc_ftm
}
const template_spooky_usdc = {
  name: "SPOOKY GTON-USDC",
  gton: C.ftm_gton,
  safe: C.ftm_safe,
  calibrator: C.calibrator_spooky,
  token: C.ftm_usdc,
  decimals: 6,
  router: C.spooky_router,
  factory: C.spooky_factory,
  pool: C.spooky_GTON_USDC,
  rpc: C.rpc_ftm
}
const template_spooky_wftm = {
  name: "SPOOKY GTON-WFTM",
  gton: C.ftm_gton,
  safe: C.ftm_safe,
  calibrator: C.calibrator_spooky,
  token: C.wftm,
  decimals: 18,
  router: C.spooky_router,
  factory: C.spooky_factory,
  pool: C.spooky_GTON_WFTM,
  rpc: C.rpc_ftm
}

export const templates = [
  template_plg_usdc,
  template_plg_wmatic,
  template_hec_ht,
  template_bsc_bnb,
  template_bsc_busd,
  template_spirit_usdc,
  template_spirit_wftm,
  template_spirit_fusdt,
  template_spooky_usdc,
  template_spooky_wftm
]

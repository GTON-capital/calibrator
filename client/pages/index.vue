<template>
  <div class="container">
    <div>
      <div>
        <Button class='button--green' size="large" ghost @click="update">Update</Button>
        <div> Pool GTON-USDC</div>
        <div> Total supply: {{ totalSupplyGTON_USDC }},
              LP on safe: {{ safeLiquidityGTON_USDC }}</div>
        <br>
        <div> Current state</div>
        <div> Reserve GTON: {{ formatUnits(reserveGTON_GTON_USDC, 18) }}</div>
        <div> Reserve USDC: {{ formatUnits(reserveUSDC_GTON_USDC, 6) }}</div>
        <div> Price: 1 GTON = {{ priceGTON_USDC }} USDC</div>
        <br>
        <div> Estimated state</div>
        <div> Reserve GTON: {{ formatUnits(reserveGTON_GTON_USDC_new, 18) }}</div>
        <div> Reserve USDC: {{ formatUnits(reserveUSDC_GTON_USDC_new, 6) }}</div>
        <div> Price: 1 GTON = {{ priceGTON_USDC_new }} USDC</div>
        <div> GTON back: {{ formatUnits(gtonbackGTON_USDC, 18) }}</div>
        <br>
        <div> Liquidity: <input v-model="liquidityGTON_USDC" placeholder="GTON_USDC lp tokens"></div>
        <div> Buyback: <input v-model="buybackGTON_USDC" placeholder="buyback GTON"></div>
        <Button class='button--green' size="large" ghost @click="estimate">Estimate</Button>
        <div> {{ error }}</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
 import Vue from 'vue'
 import { ethers, BigNumber } from 'ethers'
 import Invoker from '../services/web3.ts'
 import { C } from '../services/constants.ts'

 export default Vue.extend({
     data () {
         return {
             invoker: {},
             safeLiquidityGTON_USDC: BigNumber.from(0),
             totalSupplyGTON_USDC: BigNumber.from(0),
             reserveGTON_GTON_USDC: BigNumber.from(0),
             reserveUSDC_GTON_USDC: BigNumber.from(0),
             priceGTON_USDC: BigNumber.from(0),
             reserveGTON_GTON_USDC_new: BigNumber.from(0),
             reserveUSDC_GTON_USDC_new: BigNumber.from(0),
             priceGTON_USDC_new: BigNumber.from(0),
             gtonbackGTON_USDC: BigNumber.from(0),
             liquidityGTON_USDC: "10000000000000000",
             buybackGTON_USDC: "300000000000000000000",
             error: ""
         }
     },
     async mounted () {
         await this.connect()
         await this.update()
     },
     methods: {
         async connect () {
             this.invoker = new Invoker()
             console.log("Invoker loaded:", this.invoker)
         },
         async update () {
             // clear so that errors are evident
             this.safeLiquidity_GTON_USDC = BigNumber.from(0)
             this.reserveGTON_GTON_USDC = BigNumber.from(0)
             this.reserveUSDC_GTON_USDC = BigNumber.from(0)
             this.priceGTON_USDC = BigNumber.from(0)

             this.safeLiquidityGTON_USDC = await this.invoker.safeLiquidity(C.quick_pool_GTON_USDC)
             this.totalSupplyGTON_USDC = await this.invoker.totalSupply(C.quick_pool_GTON_USDC)
             this.reserveGTON_GTON_USDC = await this.invoker.reserve(C.quick_pool_GTON_USDC, C.gton)
             this.reserveUSDC_GTON_USDC = await this.invoker.reserve(C.quick_pool_GTON_USDC, C.usdc)
             if (this.reserveGTON_GTON_USDC != 0) {
                 this.priceGTON_USDC = this.reserveUSDC_GTON_USDC.mul(10**12).div(this.reserveGTON_GTON_USDC)
             }
         },
         async estimate () {
             // clear so that errors are evident
             this.reserveGTON_GTON_USDC_new = BigNumber.from(0)
             this.reserveUSDC_GTON_USDC_new = BigNumber.from(0)
             this.priceGTON_USDC_new = BigNumber.from(0)
             this.gtonbackGTON_USDC = BigNumber.from(0)
             this.error = ""
             try {
                 let result = await this.invoker.estimateNow(this.liquidityGTON_USDC, this.buybackGTON_USDC)
                 this.reserveGTON_GTON_USDC_new = result[0]
                 this.reserveUSDC_GTON_USDC_new = result[1]
                 this.gtonbackGTON_USDC = result[2]
                 if (this.reserveGTON_GTON_USDC_new != 0) {
                    this.priceGTON_USDC_new = this.reserveUSDC_GTON_USDC_new.mul(10**12).div(this.reserveGTON_GTON_USDC_new)
                 }
             } catch(e) {
                 this.error = e;
                 console.log(e)
             }
         },
         formatUnits(amount: BigNumber, precision: number): string {
             return ethers.utils.formatUnits(amount, precision);
         },
     }
 })
</script>

<style>
.container {
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.title {
  font-family: 'Quicksand', 'Source Sans Pro', -apple-system, BlinkMacSystemFont,
    'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  display: block;
  font-weight: 300;
  font-size: 100px;
  color: #35495e;
  letter-spacing: 1px;
}

.subtitle {
  font-weight: 300;
  font-size: 42px;
  color: #526488;
  word-spacing: 5px;
  padding-bottom: 15px;
}

.links {
  padding-top: 15px;
}
</style>

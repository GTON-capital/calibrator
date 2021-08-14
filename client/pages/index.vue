<template>
  <div class="container">
    <div>
      <div>
        <Button class='button--green' size="large" ghost @click="update">Update</Button>
        <div> Pool GTON-USDC, {{ formatETHBalance(safeLiquidity_GTON_USDC) }} LP on safe</div>
        <div> Current state</div>
        <div> Reserve GTON: {{ formatETHBalance(reserveGTON_GTON_USDC) }}USDC</div>
        <div> Reserve USDC: {{ formatAmountToPrecision(reserveUSDC_GTON_USDC, 6) }}GTON</div>
        <div> Price: 1 GTON = {{ priceGTON_USDC }}USDC</div>
        <div> Estimated state</div>
        <div> Reserve GTON: {{ reserveGTON_GTON_USDC_new }}GTON</div>
        <div> Reserve USDC: {{ reserveUSDC_GTON_USDC_new }}USDC</div>
        <div> Price: 1 GTON = {{ priceGTON_USDC_new }}USDC</div>
        <div> GTON back: {{ gtonbackGTON_USDC }}GTON</div>
        <input v-model="liquidityGTON_USDC" placeholder="GTON_USDC lp tokens">
        <input v-model="buybackGTON_USDC" placeholder="buyback GTON">
        <Button class='button--green' size="large" ghost @click="estimate">Estimate</Button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
 import Vue from 'vue'
 import { ethers, BigNumber } from 'ethers'
 import Invoker from '../services/web3.ts'
 import { C } from '../services/constants.ts'

 function formatETHBalance(amount: BigNumber): string {
     return ethers.utils.formatUnits(amount, "ether");
 }
 function formatAmountToPrecision(
     value: BigNumber,
     precision: number
 ): string {
     s = value.toString()
     let dotAt = s.indexOf(".");
     return dotAt !== -1 ? s.slice(0, ++dotAt + precision) : s;
 }

 export default Vue.extend({
     data () {
         return {
             invoker: {},
             safeLiquidity_GTON_USDC: "",
             reserveGTON_GTON_USDC: "",
             reserveUSDC_GTON_USDC: "",
             priceGTON_USDC: "",
             reserveGTON_GTON_USDC_new: "",
             reserveUSDC_GTON_USDC_new: "",
             priceGTON_USDC_new: "",
             liquidityGTON_USDC: "",
             buybackGTON_USDC: "",
             gtonbackGTON_USDC: ""
         }
     },

     async mounted () {
         await this.connect()
     },

     methods: {
         async connect () {
             const provider = new ethers.providers.JsonRpcProvider("https://matic-mainnet.chainstacklabs.com")
             this.invoker = new Invoker(provider)
             console.log("Invoker loaded:", this.invoker)
         },
         clear () {
             this.safeLiquidity_GTON_USDC = ""
             this.reserveGTON_GTON_USDC = ""
             this.reserveUSDC_GTON_USDC = ""
             this.priceGTON_USDC = ""
             this.reserveGTON_GTON_USDC_new = ""
             this.reserveUSDC_GTON_USDC_new = ""
             this.priceGTON_USDC_new = ""
             this.gtonbackGTON_USDC = ""
         },
         async update () {
             this.clear()
             this.safeLiquidity_GTON_USDC = await this.invoker.safeLiquidity(C.quick_pool_GTON_USDC)
             this.reserveGTON_GTON_USDC = await this.invoker.reserve(C.quick_pool_GTON_USDC, C.gton)
             this.reserveUSDC_GTON_USDC = await this.invoker.reserve(C.quick_pool_GTON_USDC, C.usdc)
             this.priceGTON_USDC = this.reserveUSDC_GTON_USDC.div(this.reserveGTON_GTON_USDC)
         },
         async estimate () {
             try {
                 this.reserveGTON_GTON_USDC_new, this.reserveGTON_GTON_USDC_new, this.gtonbackGTON_USDC = await this.invoker.estimateNow(this.liquidityGTON_USDC, this.buybackGTON_USDC)
                 this.priceGTON_USDC_new = this.reserveUSDC_GTON_USDC_new.div(this.reserveGTON_GTON_USDC_new)
             } catch(e) { console.log(e) }
         }
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

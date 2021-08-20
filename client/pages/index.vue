<template>
  <div class="container">
    <div>
      <div>
        <Button class='button--green' size="large" ghost @click="update">Update</Button>
        <div> Pool GTON-USDC</div>
        <div> Total supply: {{ totalSupply }},
              LP on safe: {{ safeLiquidity }}</div>
        <br>
        <div> Current state</div>
        <table class="table table-hover">
            <thead>
                <tr>
                    <td></td>
                    <td>GTON</td>
                    <td>USDC</td>
                    <td>reserve GTON</td>
                    <td>reserve USDC</td>
                    <td>price</td>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Current state</td>
                    <td>0</td>
                    <td>0</td>
                    <td>{{ formatUnits(reserveGTON, 18) }}</td>
                    <td>{{ formatUnits(reserveUSDC, 6) }}</td>
                    <td>1 GTON = {{ price }} USDC</td>
                </tr>
                <tr>
                    <td>After remove</td>
                    <td>{{ formatUnits(amountGTON_afterRemove, 18) }}</td>
                    <td>{{ formatUnits(amountUSDC_afterRemove, 6) }}</td>
                    <td>{{ formatUnits(reserveGTON_afterRemove, 18) }}</td>
                    <td>{{ formatUnits(reserveUSDC_afterRemove, 6) }}</td>
                    <td>1 GTON = {{ price_afterRemove }} USDC</td>
                </tr>
                <tr>
                    <td>After buyback</td>
                    <td>{{ formatUnits(amountGTON_afterBuyback, 18) }}</td>
                    <td>{{ formatUnits(amountUSDC_afterBuyback, 6) }}</td>
                    <td>{{ formatUnits(reserveGTON_afterBuyback, 18) }}</td>
                    <td>{{ formatUnits(reserveUSDC_afterBuyback, 6) }}</td>
                    <td>1 GTON = {{ price_afterBuyback }} USDC</td>
                </tr>
                <tr>
                    <td>After add</td>
                    <td>{{ formatUnits(amountGTON_afterAdd, 18) }}</td>
                    <td>{{ formatUnits(amountUSDC_afterAdd, 6) }}</td>
                    <td>{{ formatUnits(reserveGTON_afterAdd, 18) }}</td>
                    <td>{{ formatUnits(reserveUSDC_afterAdd, 6) }}</td>
                    <td>1 GTON = {{ price_afterAdd }} USDC</td>
                </tr>
            </tbody>
        </table>
        <br>
        <div> Liquidity: <input v-model="liquidity" placeholder=" lp tokens"></div>
        <div> Buyback: <input v-model="buyback" placeholder="buyback GTON"></div>
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
             safeLiquidity: BigNumber.from(0),
             totalSupply: BigNumber.from(0),
             reserveGTON: BigNumber.from(0),
             reserveUSDC: BigNumber.from(0),
             price: 0,
             amountGTON_afterRemove: BigNumber.from(0),
             amountUSDC_afterRemove: BigNumber.from(0),
             reserveGTON_afterRemove: BigNumber.from(0),
             reserveUSDC_afterRemove: BigNumber.from(0),
             price_afterRemove: 0,
             amountGTON_afterBuyback: BigNumber.from(0),
             amountUSDC_afterBuyback: BigNumber.from(0),
             reserveGTON_afterBuyback: BigNumber.from(0),
             reserveUSDC_afterBuyback: BigNumber.from(0),
             price_afterBuyback: 0,
             amountGTON_afterAdd: BigNumber.from(0),
             amountUSDC_afterAdd: BigNumber.from(0),
             reserveGTON_afterAdd: BigNumber.from(0),
             reserveUSDC_afterAdd: BigNumber.from(0),
             price_afterAdd: 0,
             liquidity: "10000000000000000",
             buyback: "300000000000000000000",
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
             this.safeLiquidity = BigNumber.from(0)
             this.reserveGTON = BigNumber.from(0)
             this.reserveUSDC = BigNumber.from(0)
             this.price = 0

             this.safeLiquidity = await this.invoker.safeLiquidity(C.quick_pool_GTON_USDC)
             this.totalSupply = await this.invoker.totalSupply(C.quick_pool_GTON_USDC)
             this.reserveGTON = await this.invoker.reserve(C.quick_pool_GTON_USDC, C.gton)
             this.reserveUSDC = await this.invoker.reserve(C.quick_pool_GTON_USDC, C.usdc)
             if (this.reserveGTON != 0) {
                 this.price = this.reserveUSDC.mul(10**12).mul(10**2).div(this.reserveGTON).toNumber() / (10**2)
             }
         },
         async estimate () {
             // clear so that errors are evident
             this.amountGTON_afterRemove = BigNumber.from(0)
             this.amountUSDC_afterRemove = BigNumber.from(0)
             this.reserveGTON_afterRemove = BigNumber.from(0)
             this.reserveUSDC_afterRemove = BigNumber.from(0)
             this.price_afterRemove = 0
             this.amountGTON_afterBuyback = BigNumber.from(0)
             this.amountUSDC_afterBuyback = BigNumber.from(0)
             this.reserveGTON_afterBuyback = BigNumber.from(0)
             this.reserveUSDC_afterBuyback = BigNumber.from(0)
             this.price_afterBuyback = 0
             this.amountGTON_afterAdd = BigNumber.from(0)
             this.amountUSDC_afterAdd = BigNumber.from(0)
             this.reserveGTON_afterAdd = BigNumber.from(0)
             this.reserveUSDC_afterAdd = BigNumber.from(0)
             this.price_afterAdd = 0
             this.error = ""
             try {
                 let result = await this.invoker.estimateRemove(
                     C.quick_pool_GTON_USDC, C.usdc, this.liquidity)
                 this.reserveGTON_afterRemove = result[0]
                 this.reserveUSDC_afterRemove = result[1]
                 this.amountGTON_afterRemove = result[2]
                 this.amountUSDC_afterRemove = result[3]
                 if (this.reserveGTON_afterRemove != 0) {
                     this.price_afterRemove = this.reserveUSDC_afterRemove.mul(10**12).mul(10**2).div(this.reserveGTON_afterRemove) / (10**2)
                 }
             } catch(e) {
                 this.error = "remove: " + e
                 console.log(e)
                 return
             }
             try {
                 let result = await this.invoker.estimateBuyback(
                     this.reserveGTON_afterRemove,
                     this.reserveUSDC_afterRemove,
                     this.buyback
                 )
                 this.reserveGTON_afterBuyback = result[0]
                 this.reserveUSDC_afterBuyback = result[1]
                 let amountToken = result[2]
                 this.amountGTON_afterBuyback = this.amountGTON_afterRemove.add(this.buyback)
                 if (this.amountUSDC_afterRemove.lt(amountToken)) { throw "not enough token" }
                 this.amountUSDC_afterBuyback = this.amountUSDC_afterRemove.sub(amountToken)
                 if (this.reserveGTON_afterBuyback != 0) {
                     this.price_afterBuyback = this.reserveUSDC_afterBuyback.mul(10**12).mul(10**2).div(this.reserveGTON_afterBuyback) / (10**2)
                 }
             } catch(e) {
                 this.error = "buyback: " + e
                 console.log(e)
                 return
             }
             try {
                 let result = await this.invoker.estimateAdd(
                     this.reserveGTON_afterBuyback,
                     this.reserveUSDC_afterBuyback,
                     this.amountUSDC_afterBuyback)
                 this.reserveGTON_afterAdd = result[0]
                 this.reserveUSDC_afterAdd = result[1]
                 let amountGTON = result[2]
                 this.amountGTON_afterAdd = this.amountGTON_afterBuyback.sub(amountGTON)
                 this.amountUSDC_afterAdd = BigNumber.from(0)
                 if (this.reserveGTON_afterAdd != 0) {
                     this.price_afterAdd = this.reserveUSDC_afterAdd.mul(10**12).mul(10**2).div(this.reserveGTON_afterAdd) / (10**2)
                 }
             } catch(e) {
                 this.error = "add: " + e
                 console.log(e)
             }
         },
         formatUnits(amount: BigNumber, precision: number): string {
             return ethers.utils.formatUnits(amount, precision);
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

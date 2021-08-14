<template>
  <div class="container">
    <div>
      <div>
        <Button class='button--green' size="large" ghost @click="update">Update</Button>
        <div> Pool GTON-MATIC</div>
        <div> Total supply: {{ totalSupply }},
              LP on safe: {{ safeLiquidity }}</div>
        <br>
        <div> Current state</div>
        <table class="table table-hover">
            <thead>
                <tr>
                    <td></td>
                    <td>GTON</td>
                    <td>MATIC</td>
                    <td>reserve GTON</td>
                    <td>reserve MATIC</td>
                    <td>price</td>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Current state</td>
                    <td>0</td>
                    <td>0</td>
                    <td>{{ formatUnits(reserveGTON, 18) }}</td>
                    <td>{{ formatUnits(reserveMATIC, 18) }}</td>
                    <td>1 GTON = {{ price }} MATIC</td>
                </tr>
                <tr>
                    <td>After remove</td>
                    <td>{{ formatUnits(amountGTON_afterRemove, 18) }}</td>
                    <td>{{ formatUnits(amountMATIC_afterRemove, 18) }}</td>
                    <td>{{ formatUnits(reserveGTON_afterRemove, 18) }}</td>
                    <td>{{ formatUnits(reserveMATIC_afterRemove, 18) }}</td>
                    <td>1 GTON = {{ price_afterRemove }} MATIC</td>
                </tr>
                <tr>
                    <td>After buyback</td>
                    <td>{{ formatUnits(amountGTON_afterBuyback, 18) }}</td>
                    <td>{{ formatUnits(amountMATIC_afterBuyback, 18) }}</td>
                    <td>{{ formatUnits(reserveGTON_afterBuyback, 18) }}</td>
                    <td>{{ formatUnits(reserveMATIC_afterBuyback, 18) }}</td>
                    <td>1 GTON = {{ price_afterBuyback }} MATIC</td>
                </tr>
                <tr>
                    <td>After add</td>
                    <td>{{ formatUnits(amountGTON_afterAdd, 18) }}</td>
                    <td>{{ formatUnits(amountMATIC_afterAdd, 18) }}</td>
                    <td>{{ formatUnits(reserveGTON_afterAdd, 18) }}</td>
                    <td>{{ formatUnits(reserveMATIC_afterAdd, 18) }}</td>
                    <td>1 GTON = {{ price_afterAdd }} MATIC</td>
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
             reserveMATIC: BigNumber.from(0),
             price: BigNumber.from(0),
             amountGTON_afterRemove: BigNumber.from(0),
             amountMATIC_afterRemove: BigNumber.from(0),
             reserveGTON_afterRemove: BigNumber.from(0),
             reserveMATIC_afterRemove: BigNumber.from(0),
             price_afterRemove: BigNumber.from(0),
             amountGTON_afterBuyback: BigNumber.from(0),
             amountMATIC_afterBuyback: BigNumber.from(0),
             reserveGTON_afterBuyback: BigNumber.from(0),
             reserveMATIC_afterBuyback: BigNumber.from(0),
             price_afterBuyback: BigNumber.from(0),
             amountGTON_afterAdd: BigNumber.from(0),
             amountMATIC_afterAdd: BigNumber.from(0),
             reserveGTON_afterAdd: BigNumber.from(0),
             reserveMATIC_afterAdd: BigNumber.from(0),
             price_afterAdd: BigNumber.from(0),
             liquidity: "3000000000000000000000",
             buyback: "200000000000000000000",
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
             this.reserveMATIC = BigNumber.from(0)
             this.price = BigNumber.from(0)

             this.safeLiquidity = await this.invoker.safeLiquidity(C.quick_pool_GTON_WMATIC)
             this.totalSupply = await this.invoker.totalSupply(C.quick_pool_GTON_WMATIC)
             this.reserveGTON = await this.invoker.reserve(C.quick_pool_GTON_WMATIC, C.gton)
             this.reserveMATIC = await this.invoker.reserve(C.quick_pool_GTON_WMATIC, C.wmatic)
             if (this.reserveGTON != 0) {
                 this.price = this.reserveMATIC.div(this.reserveGTON)
             }
         },
         async estimate () {
             // clear so that errors are evident
             this.amountGTON_afterRemove = BigNumber.from(0)
             this.amountMATIC_afterRemove = BigNumber.from(0)
             this.reserveGTON_afterRemove = BigNumber.from(0)
             this.reserveMATIC_afterRemove = BigNumber.from(0)
             this.price_afterRemove = BigNumber.from(0)
             this.amountGTON_afterBuyback = BigNumber.from(0)
             this.amountMATIC_afterBuyback = BigNumber.from(0)
             this.reserveGTON_afterBuyback = BigNumber.from(0)
             this.reserveMATIC_afterBuyback = BigNumber.from(0)
             this.price_afterBuyback = BigNumber.from(0)
             this.amountGTON_afterAdd = BigNumber.from(0)
             this.amountMATIC_afterAdd = BigNumber.from(0)
             this.reserveGTON_afterAdd = BigNumber.from(0)
             this.reserveMATIC_afterAdd = BigNumber.from(0)
             this.price_afterAdd = BigNumber.from(0)
             this.error = ""
             try {
                 let result = await this.invoker.estimateRemove(
                     C.quick_pool_GTON_WMATIC, C.wmatic, this.liquidity
                 )
                 this.reserveGTON_afterRemove = result[0]
                 this.reserveMATIC_afterRemove = result[1]
                 this.amountGTON_afterRemove = result[2]
                 this.amountMATIC_afterRemove = result[3]
                 if (this.reserveGTON_afterRemove != 0) {
                     this.price_afterRemove = this.reserveMATIC_afterRemove.div(this.reserveGTON_afterRemove)
                 }
             } catch(e) {
                 this.error = "remove: " + e
                 console.log(e)
                 return
             }
             try {
                 let result = await this.invoker.estimateBuyback(
                     this.reserveGTON_afterRemove,
                     this.reserveMATIC_afterRemove,
                     this.buyback
                 )
                 this.reserveGTON_afterBuyback = result[0]
                 this.reserveMATIC_afterBuyback = result[1]
                 let amountToken = result[2]
                 this.amountGTON_afterBuyback = this.amountGTON_afterRemove.add(this.buyback)
                 if (this.amountMATIC_afterRemove.lt(amountToken)) { throw "not enough token" }
                 this.amountMATIC_afterBuyback = this.amountMATIC_afterRemove.sub(amountToken)
                 if (this.reserveGTON_afterBuyback != 0) {
                     this.price_afterBuyback = this.reserveMATIC_afterBuyback.div(this.reserveGTON_afterBuyback)
                 }
             } catch(e) {
                 this.error = "buyback: " + e
                 console.log(e)
                 return
             }
             try {
                 let result = await this.invoker.estimateAdd(
                     this.reserveGTON_afterBuyback,
                     this.reserveMATIC_afterBuyback,
                     this.amountMATIC_afterBuyback)
                 this.reserveGTON_afterAdd = result[0]
                 this.reserveMATIC_afterAdd = result[1]
                 let amountGTON = result[2]
                 this.amountGTON_afterAdd = this.amountGTON_afterBuyback.sub(amountGTON)
                 this.amountMATIC_afterAdd = BigNumber.from(0)
                 if (this.reserveGTON_afterAdd != 0) {
                     this.price_afterAdd = this.reserveMATIC_afterAdd.div(this.reserveGTON_afterAdd)
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

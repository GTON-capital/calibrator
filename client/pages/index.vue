<template>
    <div class="container">
        <div>
            <div>
                <select v-model="template">
                    <option v-for="template in templates" v-bind:value="template" @change="updateTemplate()">
                        {{template.name}}
                    </option>
                </select>
                <Button @click="updateTemplate">Fill</Button>
                <div>rpc:<input style="width: 200px" v-model="rpc" placeholder="rpc" list="rpcs"></div>
                <datalist id="rpcs">
                    <option v-for="r in rpcs" v-bind:value="r.value">{{r.name}}</option>
                </datalist>
                <div>router:<input style="width: 200px" v-model="router" placeholder="router" list="routers"></div>
                <datalist id="routers">
                    <option v-for="r in routers" v-bind:value="r.value">{{r.name}}</option>
                </datalist>
                <div>pool:<input style="width: 200px" v-model="pool" placeholder="pool" list="pools"></div>
                <datalist id="pools">
                    <option v-for="p in pools" v-bind:value="p.value">{{p.name}}</option>
                </datalist>
                <div>gton:<input style="width: 200px" v-model="gton" placeholder="gton" list="gtons"></div>
                <datalist id="gtons">
                    <option v-for="g in gtons" v-bind:value="g.value">{{g.name}}</option>
                </datalist>
                <div>token:<input style="width: 200px" v-model="token" placeholder="token" list="tokens"></div>
                <datalist id="tokens">
                    <option v-for="t in tokens" v-bind:value="t.value">{{t.name}}</option>
                </datalist>
                <input style="width: 200px" v-model="decimals" placeholder="decimals">
                <div>safe:<input style="width: 200px" v-model="safe" placeholder="safe" list="safes"></div>
                <datalist id="safes">
                    <option v-for="s in safes" v-bind:value="s.value">{{s.name}}</option>
                </datalist>
                <div>calibrator:<input style="width: 200px" v-model="calibrator" placeholder="calibrator" list="calibrators"></div>
                <datalist id="calibrators">
                    <option v-for="pu in calibrators" v-bind:value="pu.value">{{pu.name}}</option>
                </datalist>
                <Button class='button--green' size="large" ghost @click="update">Update</Button>
                <div> Pool {{ template.name }}</div>
                <div> Total supply: {{ totalSupply }},
                    LP on safe: {{ safeLiquidity }}</div>
                <br>
                <div> Current state</div>
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <td></td>
                            <td>Base</td>
                            <td>Quote</td>
                            <td>reserve Base</td>
                            <td>reserve Quote</td>
                            <td>price</td>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Current state</td>
                            <td>0</td>
                            <td>0</td>
                            <td>{{ formatUnits(reserveBase, 18) }}</td>
                            <td>{{ formatUnits(reserveToken, decimals) }}</td>
                            <td>1 Base = {{ price }} Quote</td>
                        </tr>
                        <tr>
                            <td>After remove</td>
                            <td>{{ formatUnits(amountBase_afterRemove, 18) }}</td>
                            <td>{{ formatUnits(amountToken_afterRemove, decimals) }}</td>
                            <td>{{ formatUnits(reserveBase_afterRemove, 18) }}</td>
                            <td>{{ formatUnits(reserveToken_afterRemove, decimals) }}</td>
                            <td>1 Base = {{ price_afterRemove }} Quote</td>
                        </tr>
                        <tr>
                            <td>After amount</td>
                            <td>{{ formatUnits(amountBase_afterBuy, 18) }}</td>
                            <td>{{ formatUnits(amountToken_afterBuy, decimals) }}</td>
                            <td>{{ formatUnits(reserveBase_afterBuy, 18) }}</td>
                            <td>{{ formatUnits(reserveToken_afterBuy, decimals) }}</td>
                            <td>1 Base = {{ price_afterBuy }} Quote</td>
                        </tr>
                        <tr>
                            <td>After add</td>
                            <td>{{ formatUnits(amountBase_afterAdd, 18) }}</td>
                            <td>{{ formatUnits(amountToken_afterAdd, decimals) }}</td>
                            <td>{{ formatUnits(reserveBase_afterAdd, 18) }}</td>
                            <td>{{ formatUnits(reserveToken_afterAdd, decimals) }}</td>
                            <td>1 Base = {{ price_afterAdd }} Quote</td>
                        </tr>
                    </tbody>
                </table>
                <br>
                <div> Liquidity: <input v-model="liquidity" placeholder=" lp tokens"></div>
                <div> Amount: <input v-model="amount" placeholder="amount Base"></div>
                <Button class='button--green' size="large" ghost @click="estimate">Calibrate</Button>
                <Button class='button--green' size="large" ghost @click="buyNow">Just buy</Button>
                <Button class='button--green' size="large" ghost @click="sellNow">Just sell</Button>
                <div> {{ error }}</div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
 import Vue from 'vue'
 import { ethers, BigNumber } from 'ethers'
 import Invoker from '../services/web3.ts'
 import { C, routers, pools, gtons, tokens, safes, calibrators, templates, rpcs } from '../services/constants.ts'

 export default Vue.extend({
     data () {
         return {
             invoker: {},
             routers: routers,
             pools: pools,
             gtons: gtons,
             tokens: tokens,
             safes: safes,
             calibrators: calibrators,
             router: routers[0].value,
             pool: pools[0].value,
             gton: gtons[0].value,
             token: tokens[0].value,
             safe: safes[0].value,
             calibrator: calibrators[0].value,
             templates: templates,
             template: templates[0],
             rpcs: rpcs,
             rpc: rpcs[0].value,
             decimals: 6,
             safeLiquidity: BigNumber.from(0),
             totalSupply: BigNumber.from(0),
             reserveBase: BigNumber.from(0),
             reserveToken: BigNumber.from(0),
             price: 0,
             amountBase_afterRemove: BigNumber.from(0),
             amountToken_afterRemove: BigNumber.from(0),
             reserveBase_afterRemove: BigNumber.from(0),
             reserveToken_afterRemove: BigNumber.from(0),
             price_afterRemove: 0,
             amountBase_afterBuy: BigNumber.from(0),
             amountToken_afterBuy: BigNumber.from(0),
             reserveBase_afterBuy: BigNumber.from(0),
             reserveToken_afterBuy: BigNumber.from(0),
             price_afterBuy: 0,
             amountBase_afterAdd: BigNumber.from(0),
             amountToken_afterAdd: BigNumber.from(0),
             reserveBase_afterAdd: BigNumber.from(0),
             reserveToken_afterAdd: BigNumber.from(0),
             price_afterAdd: 0,
             liquidity: "10000000000000000",
             amount: "300000000000000000000",
             error: ""
         }
     },
     async mounted () {
         await this.connect()
         // await this.update()
     },
     methods: {
         async connect () {
             this.invoker = new Invoker()
             console.log("Invoker loaded:", this.invoker)
         },
         async update () {
             // clear so that errors are evident
             this.safeLiquidity = BigNumber.from(0)
             this.reserveBase = BigNumber.from(0)
             this.reserveToken = BigNumber.from(0)
             this.price = 0

             try {
             this.safeLiquidity = await this.invoker.safeLiquidity(this.rpc, this.pool, this.safe)
             this.totalSupply = await this.invoker.totalSupply(this.rpc, this.pool)
             this.reserveBase = await this.invoker.reserve(this.rpc, this.pool, this.gton)
             this.reserveToken = await this.invoker.reserve(this.rpc, this.pool, this.token)
             if (this.reserveBase != 0) {
                 // console.log(this.decimals.toString())
                 // console.log(this.reserveToken.toString())
                 // console.log(this.reserveToken.mul(10**(18-(this.decimals))).toString())
                 // console.log(this.reserveBase.toString())
                 // console.log(this.reserveToken.mul(10**(18-(this.decimals))).mul(10**5).div(this.reserveBase).toString())
                 this.price = this.reserveToken.mul(10**(18-(this.decimals))).mul(10**5).div(this.reserveBase).toNumber() / (10**5)
                 // console.log(this.price.toString())
             }
             }    catch(e) { console.log(e) }
         },
         updateTemplate () {
             this.rpc = this.template.rpc
             this.pool = this.template.pool
             this.gton = this.template.gton
             this.safe = this.template.safe
             this.router = this.template.router
             this.calibrator = this.template.calibrator
             this.token = this.template.token
             this.decimals = this.template.decimals
         },
         async estimate () {
             // clear so that errors are evident
             this.amountBase_afterRemove = BigNumber.from(0)
             this.amountToken_afterRemove = BigNumber.from(0)
             this.reserveBase_afterRemove = BigNumber.from(0)
             this.reserveToken_afterRemove = BigNumber.from(0)
             this.price_afterRemove = 0
             this.amountBase_afterBuy = BigNumber.from(0)
             this.amountToken_afterBuy = BigNumber.from(0)
             this.reserveBase_afterBuy = BigNumber.from(0)
             this.reserveToken_afterBuy = BigNumber.from(0)
             this.price_afterBuy = 0
             this.amountBase_afterAdd = BigNumber.from(0)
             this.amountToken_afterAdd = BigNumber.from(0)
             this.reserveBase_afterAdd = BigNumber.from(0)
             this.reserveToken_afterAdd = BigNumber.from(0)
             this.price_afterAdd = 0
             this.error = ""
             try {
                 let result = await this.invoker.estimateRemove(
                     this.rpc,
                     this.gton,
                     this.calibrator,
                     this.pool,
                     this.token,
                     this.liquidity
                 )
                 this.reserveBase_afterRemove = result[0]
                 this.reserveToken_afterRemove = result[1]
                 this.totalSupply = result[2]
                 this.kLast = result[3]
                 this.amountBase_afterRemove = result[4]
                 this.amountToken_afterRemove = result[5]
                 if (this.reserveBase_afterRemove != 0) {
                     this.price_afterRemove = this.reserveToken_afterRemove.mul(10**(18-(this.decimals))).mul(10**5).div(this.reserveBase_afterRemove) / (10**5)
                 }
             } catch(e) {
                 this.error = "remove: " + e
                 console.log(e)
                 return
             }
             try {
                 let result = await this.invoker.estimateBuy(
                     this.rpc,
                     this.calibrator,
                     this.reserveBase_afterRemove,
                     this.reserveToken_afterRemove,
                     this.amount
                 )
                 this.reserveBase_afterBuy = result[0]
                 this.reserveToken_afterBuy = result[1]
                 let amountToken = result[2]
                 this.amountBase_afterBuy = this.amountBase_afterRemove.add(this.amount)
                 if (this.amountToken_afterRemove.lt(amountToken)) { throw "not enough token" }
                 this.amountToken_afterBuy = this.amountToken_afterRemove.sub(amountToken)
                 if (this.reserveBase_afterBuy != 0) {
                     this.price_afterBuy = this.reserveToken_afterBuy.mul(10**(18-(this.decimals))).mul(10**5).div(this.reserveBase_afterBuy) / (10**5)
                 }
             } catch(e) {
                 this.error = "amount: " + e
                 console.log(e)
                 return
             }
             try {
                 let result = await this.invoker.estimateAdd(
                     this.rpc,
                     this.calibrator,
                     this.reserveBase_afterBuy,
                     this.reserveToken_afterBuy,
                     this.totalSupply,
                     this.kLast,
                     this.amountToken_afterBuy)
                 this.reserveBase_afterAdd = result[0]
                 this.reserveToken_afterAdd = result[1]
                 let amountBase = result[2]
                 this.amountBase_afterAdd = this.amountBase_afterBuy.sub(amountBase)
                 this.amountToken_afterAdd = BigNumber.from(0)
                 if (this.reserveBase_afterAdd != 0) {
                     this.price_afterAdd = this.reserveToken_afterAdd.mul(10**(18-(this.decimals))).mul(10**5).div(this.reserveBase_afterAdd) / (10**5)
                 }
             } catch(e) {
                 this.error = "add: " + e
                 console.log(e)
             }
         },
         async buyNow() {
             try {
                 let result = await this.invoker.estimateBuyNow(
                     this.rpc,
                     this.calibrator,
                     this.pool,
                     this.gton,
                     this.token,
                     this.amount
                 )
                 this.reserveBase_afterRemove = result[0]
                 this.reserveToken_afterRemove = result[1]
                 this.reserveBase_afterBuy = result[2]
                 this.reserveToken_afterBuy = result[3]
                 let amountToken = result[4]
                 // console.log(amountToken)
                 this.amountBase_afterBuy = this.amountBase_afterRemove.add(this.amount)
                 this.amountToken_afterBuy = this.amountToken_afterRemove.sub(amountToken)
                 if (this.reserveBase_afterBuy != 0) {
                     this.price_afterBuy = this.reserveToken_afterBuy.mul(10**(18-(this.decimals))).mul(10**5).div(this.reserveBase_afterBuy) / (10**5)
                 }
             } catch(e) {
                 this.error = "buy: " + e
                 console.log(e)
                 return
             }
         },
         async sellNow() {
             try {
                 let result = await this.invoker.estimateSellNow(
                     this.rpc,
                     this.calibrator,
                     this.pool,
                     this.gton,
                     this.token,
                     this.amount
                 )
                 this.reserveBase_afterRemove = result[0]
                 this.reserveToken_afterRemove = result[1]
                 this.reserveBase_afterBuy = result[2]
                 this.reserveToken_afterBuy = result[3]
                 let amountToken = result[4]
                 // console.log(amountToken)
                 this.amountBase_afterBuy = this.amountBase_afterRemove.sub(this.amount)
                 this.amountToken_afterBuy = this.amountToken_afterRemove.add(amountToken)
                 if (this.reserveBase_afterBuy != 0) {
                     this.price_afterBuy = this.reserveToken_afterBuy.mul(10**(18-(this.decimals))).mul(10**5).div(this.reserveBase_afterBuy) / (10**5)
                 }
             } catch(e) {
                 this.error = "sell: " + e
                 console.log(e)
                 return
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

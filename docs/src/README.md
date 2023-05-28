# calibrator

Pathway protocol contracts. Set desired price in Uniswap V2 pools.

## Requirements

* Internet
* Node >= 18.15.0
* NPM >= 9.5.0

## Quick Start

1. Prepare `.env` file from `.env.example` template
2. Run `npm i`
3. Run `npm run compile`
4. Run `npm test`

## Common
```console
# install node modules
npm i

# compile contract
npm run compile

# run tests
npm run test

# put private key to .env
# PRIVATE_KEY=0xabc..abc

# deploy pool and Calibrator
npm run hardhat scripts/deploy --network gtonTestnet

# solidity compiler uses viaIR optimizer
# this allows to have a lot of variables in the code
# but makes verification a bit difficult
# get json metadata
npm run hardhat solidity-json
# choose Standard-Json-Input in explorer verification,
# upload json from artifacts/solidity-json/contracts/Calibrator.sol.json
```

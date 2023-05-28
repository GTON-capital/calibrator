# Calibrator
[Git Source](https://github.com/fetsorn/calibrator/blob/fae732b2e54a8c19e7be5f987150a473afd2869c/contracts/Calibrator.sol)

**Inherits:**
[Settings](/contracts/Settings.sol/contract.Settings.md), [Estimator](/contracts/Estimator.sol/abstract.Estimator.md)

**Author:**
Anton Davydov


## Functions
### constructor


```solidity
constructor(address _pair, address _tokenBase, address _tokenQuote) Settings(_pair, _tokenBase, _tokenQuote);
```

### setRatio

Change pool reserves to match target ratio


```solidity
function setRatio(uint256 targetBase, uint256 targetQuote) external onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`targetBase`|`uint256`|The number of base parts in target ratio|
|`targetQuote`|`uint256`|The number of quote parts in target ratio|


### removeLiquidity

Remove liquidity from the pool for smaller swaps


```solidity
function removeLiquidity() internal onlyOwner;
```

### swapToRatio

Swap to move reserves in the direction of target ratio


```solidity
function swapToRatio(uint256 targetBase, uint256 targetQuote) internal onlyOwner returns (bool);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`targetBase`|`uint256`|The number of base parts in target ratio|
|`targetQuote`|`uint256`|The number of quote parts in target ratio|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bool`|isIdle Did not swap|


### addLiquidity

Add liquidity to reach invariant base reserve


```solidity
function addLiquidity(uint256 reserveBaseInvariant) internal onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`reserveBaseInvariant`|`uint256`|The target size of base reserve|


### reclaim

Transfer all tokens to the vault


```solidity
function reclaim() internal onlyOwner;
```


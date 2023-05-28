# Estimator
[Git Source](https://github.com/fetsorn/calibrator/blob/fae732b2e54a8c19e7be5f987150a473afd2869c/contracts/Estimator.sol)

**Inherits:**
[Settings](/contracts/Settings.sol/contract.Settings.md)

**Author:**
Anton Davydov


## Functions
### estimate

Simulate a reserve ratio calibration


```solidity
function estimate(uint256 targetBase, uint256 targetQuote) external view returns (Estimation memory estimation);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`targetBase`|`uint256`|The number of base parts in target ratio|
|`targetQuote`|`uint256`|The number of quote parts in target ratio|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`estimation`|`Estimation`|Information about the simulated calibration|


### removeLiquidityDryrun

Simulate a removal of liquidity from the pool


```solidity
function removeLiquidityDryrun(Estimation memory estimation, EstimationContext memory context, uint256 minimumBase)
    internal
    pure
    returns (Estimation memory, EstimationContext memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`estimation`|`Estimation`|Information about the simulated calibration|
|`context`|`EstimationContext`|Intermediary state of the calibration|
|`minimumBase`|`uint256`|The size of base reserve after removal|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`Estimation`|estimationNew Information about the simulated calibration|
|`<none>`|`EstimationContext`|contextNew Intermediary state of the calibration|


### swapToRatioDryrun

Simulate a swap that changes pool ratio


```solidity
function swapToRatioDryrun(
    Estimation memory estimation,
    EstimationContext memory context,
    uint256 targetBase,
    uint256 targetQuote,
    uint256 feeNumerator,
    uint256 feeDenominator
) internal pure returns (Estimation memory, EstimationContext memory, bool);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`estimation`|`Estimation`|Information about the simulated calibration|
|`context`|`EstimationContext`|Intermediary state of the calibration|
|`targetBase`|`uint256`|The number of base parts in target ratio|
|`targetQuote`|`uint256`|The number of quote parts in target ratio|
|`feeNumerator`|`uint256`|The top of a fraction that represents swap size minus fees|
|`feeDenominator`|`uint256`|The bottom of a fraction that represents swap size minus fees|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`Estimation`|estimationNew Information about the simulated calibration|
|`<none>`|`EstimationContext`|contextNew Intermediary state of the calibration|
|`<none>`|`bool`||


### addLiquidityDryrun

Simulate addition of liquidity to reach invariant base reserve


```solidity
function addLiquidityDryrun(
    Estimation memory estimation,
    EstimationContext memory context,
    uint256 reserveBaseInvariant
) internal pure returns (Estimation memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`estimation`|`Estimation`|Information about the simulated calibration|
|`context`|`EstimationContext`|Intermediary state of the calibration|
|`reserveBaseInvariant`|`uint256`|The target size of base reserve|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`Estimation`|estimationNew Information about the simulated calibration|


## Structs
### Estimation
Information about the simulated calibration


```solidity
struct Estimation {
    bool baseToQuote;
    uint256 requiredQuote;
    uint256 leftoverQuote;
    uint256 leftoverLiquidity;
    uint256 reserveBase;
    uint256 reserveQuote;
}
```

### EstimationContext
Intermediary state of the calibration


```solidity
struct EstimationContext {
    uint256 availableQuote;
    uint256 availableBase;
    uint256 minimumLiquidity;
    uint256 totalSupply;
    uint256 vaultLiquidity;
}
```


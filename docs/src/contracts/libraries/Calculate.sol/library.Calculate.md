# Calculate
[Git Source](https://github.com/fetsorn/calibrator/blob/0f389c961061dc866d857aec6275ad5a77652230/contracts/libraries/Calculate.sol)

**Author:**
Anton Davydov


## Functions
### removeLiquidity

Calculate amount of liquidity tokens that should be
removed from the pool to reach minimum reserve value


```solidity
function removeLiquidity(uint256 reserve, uint256 minimum, uint256 availableLiquidity, uint256 totalSupply)
    internal
    pure
    returns (uint256 leftoverLiquidity, uint256 removedLiquidity);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`reserve`|`uint256`|The size of token reserve in the pool|
|`minimum`|`uint256`|The size of token reserve after liquidity removal|
|`availableLiquidity`|`uint256`|The amount of owned liquidity provider tokens|
|`totalSupply`|`uint256`|Total amount of liquidity provider tokens|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`leftoverLiquidity`|`uint256`|Amount of liquidity tokens left after removal|
|`removedLiquidity`|`uint256`|Amount of liquidity tokens to remove|


### swapToRatio

Calculate amount of tokens that will be swapped


```solidity
function swapToRatio(
    uint256 reserveBase,
    uint256 reserveQuote,
    uint256 targetBase,
    uint256 targetQuote,
    uint256 feeNumerator,
    uint256 feeDenominator
) internal pure returns (bool baseToQuote, uint256 amountIn, uint256 amountOut);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`reserveBase`|`uint256`|The size of base token reserve in the pool|
|`reserveQuote`|`uint256`|The size of quote token reserve in the pool|
|`targetBase`|`uint256`|The number of base parts in target ratio|
|`targetQuote`|`uint256`|The number of quote parts in target ratio|
|`feeNumerator`|`uint256`|The top of a fraction that represents swap size minus fees|
|`feeDenominator`|`uint256`|The bottom of a fraction that represents swap size minus fees|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`baseToQuote`|`bool`|Whether to sell base and buy quote, or vice versa, trading direction|
|`amountIn`|`uint256`|The amount of tokens that will be sold|
|`amountOut`|`uint256`|The amount of tokens that will be bought|


### addLiquidity

Calculate the size of token liquidity required to reach invariant base reserve


```solidity
function addLiquidity(uint256 reserveBase, uint256 reserveQuote, uint256 reserveBaseInvariant)
    internal
    pure
    returns (uint256 amountBaseDesired, uint256 amountQuoteOptimal);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`reserveBase`|`uint256`|The size of base token reserve in the pool|
|`reserveQuote`|`uint256`|The size of quote token reserve in the pool|
|`reserveBaseInvariant`|`uint256`|The target size of base reserve|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amountBaseDesired`|`uint256`|Required amount of base tokens|
|`amountQuoteOptimal`|`uint256`|Required amount of quote tokens|


### checkPrecision

Check if the difference between pool and target ratios
is smaller than acceptable margin of error


```solidity
function checkPrecision(
    uint256 reserveBase,
    uint256 reserveQuote,
    uint256 targetBase,
    uint256 targetQuote,
    uint256 precisionNumerator,
    uint256 precisionDenominator
) internal pure returns (bool);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`reserveBase`|`uint256`|The size of base token reserve in the pool|
|`reserveQuote`|`uint256`|The size of quote token reserve in the pool|
|`targetBase`|`uint256`|The number of base parts in target ratio|
|`targetQuote`|`uint256`|The number of quote parts in target ratio|
|`precisionNumerator`|`uint256`|The top of a fraction that represents the acceptable margin of error in a calibration|
|`precisionDenominator`|`uint256`|The bottom of a fraction that represents the acceptable margin of error in a calibration|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bool`|isPrecise Difference between reserve ratio and target ratio is smaller than the acceptable margin of error|


### getAmountOut

Calculate the maximum output amount of the asset being bought


```solidity
function getAmountOut(
    uint256 amountIn,
    uint256 reserveIn,
    uint256 reserveOut,
    uint256 feeNumerator,
    uint256 feeDenominator
) internal pure returns (uint256 amountOut);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`amountIn`|`uint256`|The amount of tokens sold|
|`reserveIn`|`uint256`|The reserve size of the token being sold|
|`reserveOut`|`uint256`|The reserve size of the token being bought|
|`feeNumerator`|`uint256`|The top of a fraction that represents swap size minus fees|
|`feeDenominator`|`uint256`|The bottom of a fraction that represents swap size minus fees|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amountOut`|`uint256`|The amount of tokens bought|



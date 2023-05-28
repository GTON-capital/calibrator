# Settings
[Git Source](https://github.com/fetsorn/calibrator/blob/fae732b2e54a8c19e7be5f987150a473afd2869c/contracts/Settings.sol)

**Inherits:**
Ownable

**Author:**
Anton Davydov


## State Variables
### pair
Pool that is being calibrated


```solidity
IPair public pair;
```


### tokenBase
Token which pool reserve remains invariant


```solidity
IERC20 public tokenBase;
```


### tokenQuote
Token which pool reserve changes


```solidity
IERC20 public tokenQuote;
```


### VERSION
Version of the contract, bumped on each deployment


```solidity
string public constant VERSION = "0.0.2";
```


### feeNumerator
The top of a fraction that represents swap size minus fees


```solidity
uint256 public feeNumerator = 997;
```


### feeDenominator
The bottom of a fraction that represents swap size minus fees


```solidity
uint256 public feeDenominator = 1000;
```


### precisionNumerator
The top of a fraction that represents the acceptable margin of error in a calibration


```solidity
uint256 public precisionNumerator = 1;
```


### precisionDenominator
The bottom of a fraction that represents the acceptable margin of error in a calibration


```solidity
uint256 public precisionDenominator = 1000;
```


### minimumBase
The size of the base reserve after liquidity removal and before swaps

*When minimum base reserve is large, swaps are more precise and more expensive*


```solidity
uint256 public minimumBase = 10000000;
```


### vault
The address of the vault that holds pair and ERC20 tokens

*When vault is 0, msg.sender is considered the vault*

*Vault is expected to approve a large allowance to this contract*


```solidity
address public vault = address(0);
```


## Functions
### constructor


```solidity
constructor(address _pair, address _tokenBase, address _tokenQuote);
```

### setFee

Update the fraction that represents a net swap size


```solidity
function setFee(uint256 _feeNumerator, uint256 _feeDenominator) external onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_feeNumerator`|`uint256`|The top of a fraction that represents swap size minus fees|
|`_feeDenominator`|`uint256`|The bottom of a fraction that represents swap size minus fees|


### setPrecision

Update the fraction that represents the acceptable margin of error in a calibration


```solidity
function setPrecision(uint256 _precisionNumerator, uint256 _precisionDenominator) external onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_precisionNumerator`|`uint256`|The top of a fraction that represents the acceptable margin of error in a calibration|
|`_precisionDenominator`|`uint256`|The bottom of a fraction that represents the acceptable margin of error in a calibration|


### setMinimumBase

Update the size of the base reserve after liquidity removal


```solidity
function setMinimumBase(uint256 _minimumBase) external onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_minimumBase`|`uint256`|The size of the base reserve after liquidity removal|


### setVault

Update the address of the vault that holds pair and ERC20 tokens


```solidity
function setVault(address _vault) external onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_vault`|`address`|The address of the vault that holds pair and ERC20 tokens|


### getVault

Get the address of the vault that holds pair and ERC20 tokens

*When vault is 0, msg.sender is considered the vault*


```solidity
function getVault() internal view returns (address);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`address`|vault The address of the vault that holds pair and ERC20 tokens|


### getReserves

Retrieve pool reserves sorted such that base if first and quote is second


```solidity
function getReserves() public view returns (uint256 reserveBase, uint256 reserveQuote);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`reserveBase`|`uint256`|The size of base token reserve in the pool|
|`reserveQuote`|`uint256`|The size of quote token reserve in the pool|


### sortTokens

Sort token addresses


```solidity
function sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`tokenA`|`address`|The address of token A|
|`tokenB`|`address`|The address of token B|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`token0`|`address`|The address of the first token in order|
|`token1`|`address`|The address of the last token in order|



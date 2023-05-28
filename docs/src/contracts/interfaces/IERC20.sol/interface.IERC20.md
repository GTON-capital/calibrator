# IERC20
[Git Source](https://github.com/fetsorn/calibrator/blob/fae732b2e54a8c19e7be5f987150a473afd2869c/contracts/interfaces/IERC20.sol)


## Functions
### mint


```solidity
function mint(address _to, uint256 _value) external;
```

### allowance


```solidity
function allowance(address owner, address spender) external view returns (uint256);
```

### approve


```solidity
function approve(address spender, uint256 amount) external returns (bool);
```

### increaseAllowance


```solidity
function increaseAllowance(address spender, uint256 addedValue) external returns (bool);
```

### transfer


```solidity
function transfer(address _to, uint256 _value) external returns (bool success);
```

### transferFrom


```solidity
function transferFrom(address _from, address _to, uint256 _value) external returns (bool success);
```

### balanceOf


```solidity
function balanceOf(address _owner) external view returns (uint256 balance);
```

### decimals


```solidity
function decimals() external view returns (uint8);
```


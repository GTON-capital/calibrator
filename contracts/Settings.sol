// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IPair.sol";

/// @title Stores settings for pool ratio calibration
/// @author Anton Davydov
contract Settings is Ownable {
    /// @notice Pool that is being calibrated
    IPair public pair;
    /// @notice Token which pool reserve remains invariant
    IERC20 public tokenBase;
    /// @notice Token which pool reserve changes
    IERC20 public tokenQuote;
    /// @notice Version of the contract, bumped on each deployment
    string public constant VERSION = "0.0.2";

    /// @notice The top of a fraction that represents swap size minus fees
    uint256 public feeNumerator = 997;
    /// @notice The bottom of a fraction that represents swap size minus fees
    uint256 public feeDenominator = 1000;

    /// @notice The top of a fraction that represents the acceptable margin of error in a calibration
    /// @dev when the error margin fraction is large, less swaps are performed, and precision is lower
    uint256 public precisionNumerator = 1;
    /// @notice The bottom of a fraction that represents the acceptable margin of error in a calibration
    uint256 public precisionDenominator = 1000;

    /// @notice The size of the base reserve after liquidity removal and before swaps
    /// @dev When minimum base reserve is large, swaps are more precise and more expensive
    uint256 public minimumBase = 10000000;

    /// @notice The address of the vault that holds pair and ERC20 tokens
    /// @dev When vault is 0, msg.sender is considered the vault
    /// @dev Vault is expected to approve a large allowance to this contract
    address public vault = address(0);

    /// @notice Emits when the net swap fraction is updated
    /// @dev Call this to setup a fork with alternative fees
    /// @param feeNumerator The top of a fraction that represents swap size minus fees
    /// @param feeDenominator The bottom of a fraction that represents swap size minus fees
    event SetFee(uint256 indexed feeNumerator, uint256 indexed feeDenominator);

    /// @notice Emits when acceptable margin of calibration error is updated
    /// @param precisionNumerator The top of a fraction that represents the acceptable margin of error in a calibration
    /// @param precisionDenominator The bottom of a fraction that represents the acceptable margin of error in a calibration
    event SetPrecision(uint256 indexed precisionNumerator, uint256 indexed precisionDenominator);

    /// @notice Emits when the minimum size of the base reserve is updated
    /// @param minimumBase The size of the base reserve after liquidity removal
    event SetMinimumBase(uint256 indexed minimumBase);

    /// @notice Emits when new vault is set
    /// @param vault The address of the vault that holds pair and ERC20 tokens
    event SetVault(address indexed vault);

    constructor(address _pair, address _tokenBase, address _tokenQuote) {
        pair = IPair(_pair);
        tokenBase = IERC20(_tokenBase);
        tokenQuote = IERC20(_tokenQuote);
    }

    /// @notice Update the fraction that represents a net swap size
    /// @param _feeNumerator The top of a fraction that represents swap size minus fees
    /// @param _feeDenominator The bottom of a fraction that represents swap size minus fees
    function setFee(uint256 _feeNumerator, uint256 _feeDenominator) external onlyOwner {
        require(_feeDenominator > 0, "setFee: division by 0");

        require(_feeNumerator <= _feeDenominator, "setFee: improper fraction");

        feeNumerator = _feeNumerator;
        feeDenominator = _feeDenominator;
    }

    /// @notice Update the fraction that represents the acceptable margin of error in a calibration
    /// @param _precisionNumerator The top of a fraction that represents the acceptable margin of error in a calibration
    /// @param _precisionDenominator The bottom of a fraction that represents the acceptable margin of error in a calibration
    function setPrecision(uint256 _precisionNumerator, uint256 _precisionDenominator) external onlyOwner {
        require(_precisionDenominator > 0, "setPrecision: division by 0");

        require(_precisionNumerator <= _precisionDenominator, "setPrecision: improper fraction");

        precisionNumerator = _precisionNumerator;
        precisionDenominator = _precisionDenominator;
    }

    /// @notice Update the size of the base reserve after liquidity removal
    /// @param _minimumBase The size of the base reserve after liquidity removal
    function setMinimumBase(uint256 _minimumBase) external onlyOwner {
        minimumBase = _minimumBase;
    }

    /// @notice Update the address of the vault that holds pair and ERC20 tokens
    /// @param _vault The address of the vault that holds pair and ERC20 tokens
    function setVault(address _vault) external onlyOwner {
        vault = _vault;
    }

    /// @notice Get the address of the vault that holds pair and ERC20 tokens
    /// @dev When vault is 0, msg.sender is considered the vault
    /// @return vault The address of the vault that holds pair and ERC20 tokens
    function getVault() internal view returns (address) {
        return vault != address(0) ? vault : msg.sender;
    }

    /// @notice Retrieve pool reserves sorted such that base if first and quote is second
    /// @return reserveBase The size of base token reserve in the pool
    /// @return reserveQuote The size of quote token reserve in the pool
    function getReserves() public view returns (uint256 reserveBase, uint256 reserveQuote) {
        (uint256 reserve0, uint256 reserve1,) = pair.getReserves();

        (address token0,) = sortTokens(address(tokenBase), address(tokenQuote));

        (reserveBase, reserveQuote) = address(tokenBase) == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }

    /// @notice Sort token addresses
    /// @param tokenA The address of token A
    /// @param tokenB The address of token B
    /// @return token0 The address of the first token in order
    /// @return token1 The address of the last token in order
    function sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, "sortTokens: IDENTICAL_ADDRESSES");

        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);

        require(token0 != address(0), "sortTokens: ZERO_ADDRESS");
    }
}

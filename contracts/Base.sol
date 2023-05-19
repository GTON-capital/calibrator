// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IPair.sol";

contract Base is Ownable {
    IPair public pair;
    IERC20 public tokenBase;
    IERC20 public tokenQuote;
    string public constant VERSION = "0.0.2";

    uint256 public feeNumerator = 997;
    uint256 public feeDenominator = 1000;

    uint256 public precisionNumerator = 1;
    uint256 public precisionDenominator = 1000;

    uint256 public minimumBase = 10000000;

    address public vault = address(0);

    constructor(address _pair, address _tokenBase, address _tokenQuote) {
        pair = IPair(_pair);
        tokenBase = IERC20(_tokenBase);
        tokenQuote = IERC20(_tokenQuote);
    }

    function setFee(
        uint256 _feeNumerator,
        uint256 _feeDenominator
    ) external onlyOwner {
        feeNumerator = _feeNumerator;
        feeDenominator = _feeDenominator;
    }

    function setPrecision(
        uint256 _precisionNumerator,
        uint256 _precisionDenominator
    ) external onlyOwner {
        precisionNumerator = _precisionNumerator;
        precisionDenominator = _precisionDenominator;
    }

    function setMinimumBase(uint256 _minimumBase) external onlyOwner {
        minimumBase = _minimumBase;
    }

    function setVault(address _vault) external onlyOwner {
        vault = _vault;
    }

    function getVault() public view returns (address) {
        return vault != address(0) ? vault : msg.sender;
    }

    // retrieve current pool ratio
    function getRatio()
        public
        view
        returns (uint256 ratioBase, uint256 ratioQuote)
    {
        (uint256 reserve0, uint256 reserve1, ) = pair.getReserves();

        (address token0, ) = sortTokens(
            address(tokenBase),
            address(tokenQuote)
        );

        (ratioBase, ratioQuote) = address(tokenBase) == token0
            ? (reserve0, reserve1)
            : (reserve1, reserve0);
    }

    function sortTokens(
        address tokenA,
        address tokenB
    ) public pure returns (address token0, address token1) {
        require(tokenA != tokenB, "sortTokens: IDENTICAL_ADDRESSES");

        (token0, token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);

        require(token0 != address(0), "sortTokens: ZERO_ADDRESS");
    }
}

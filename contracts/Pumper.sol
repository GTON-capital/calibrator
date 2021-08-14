//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "./interfaces/IPumper.sol";
import "hardhat/console.sol";

/// @title Pumper
contract Pumper is IPumper {

    IERC20 gton;
    IERC20 token;
    IUniswapV2Pair pool;
    IUniswapV2Router01 router;

    constructor(
        IERC20 _gton,
        IERC20 _token,
        IUniswapV2Pair _pool,
        IUniswapV2Router01 _router
    ) {
        gton = _gton;
        token = _token;
        pool = _pool;
        router = _router;
    }

    function pump(uint256 liquidity, uint256 amountBuyback, address to) external {
        // transfer `liquidity` from msg.sender
        pool.transferFrom(msg.sender, address(this), liquidity);
        // remove `liquidity`
        remove();
        // buy gton for `amountBuyback`
        buyback(amountBuyback);
        // add liquidity for all quote token and have some gton left
        add();
        // send gton and lp to `to`
        retrieve(to);
    }

    function remove() internal {
        log("=========== before remove ===========");
        uint liquidity = pool.balanceOf(address(this));
        uint totalSupply = pool.totalSupply();
        uint amount0 = liquidity * gton.balanceOf(address(pool)) / totalSupply;
        uint amount1 = liquidity * token.balanceOf(address(pool)) / totalSupply;
        uint deadline = block.timestamp+86400;
        console.log("remove liquidity", amount0, amount1, liquidity);
        pool.approve(address(router), liquidity);
        router.removeLiquidity(
            address(gton),
            address(token),
            liquidity,
            amount0,
            amount1,
            address(this),
            deadline
        );
        log("===========  after remove ===========");
    }

    function buyback(uint256 amountBuyback) internal {
        log("===========   before buy  ===========");
        gton.approve(address(router), gton.balanceOf(address(this)));
        token.approve(address(router), token.balanceOf(address(this)));
        address[] memory pathToGton = new address[](2);
        pathToGton[0] = address(token);
        pathToGton[1] = address(gton);
        uint deadline = block.timestamp+86400;
        uint[] memory amounts = router.getAmountsIn(amountBuyback, pathToGton);
        console.log("swap gton for token", amountBuyback, amounts[0]);
        router.swapTokensForExactTokens(
            amountBuyback,
            amounts[0],
            pathToGton,
            address(this),
            deadline
        );
        log("===========   after buy   ===========");
    }

    function add() internal {
        log("===========   before add  ===========");
        uint amountTokenAdd = token.balanceOf(address(this));
        address[] memory pathToGton = new address[](2);
        pathToGton[0] = address(token);
        pathToGton[1] = address(gton);
        uint deadline = block.timestamp+86400;
        (uint reserveGton, uint reserveToken) = getReserves(router.factory(), address(gton), address(token));
        uint amountGtonAdd = quote(amountTokenAdd, reserveToken, reserveGton);
        console.log("add liquidity", amountGtonAdd, amountTokenAdd);
        (uint amountA, uint amountB, uint liq) = router.addLiquidity(
            address(token),
            address(gton),
            amountTokenAdd,
            amountGtonAdd,
            amountTokenAdd,
            amountGtonAdd,
            address(this),
            deadline
        );
        console.log("add liquidity", amountA, amountB, liq);
        log("===========   after add   ===========");
    }

    function retrieve(address to) internal {
        log("========== before retrieve ==========");
        pool.transfer(to, pool.balanceOf(address(this)));
        gton.transfer(to, gton.balanceOf(address(this)));
        log("==========  after retrieve ==========");
    }

    // **** ESTIMATE FUNCTIONS ****
    function estimateNow(uint256 liquidity, uint256 amountBuyback)
        external view returns (
        uint256 reserveGton,
        uint256 reserveToken,
        uint256 amountGton
    ) {
        (uint256 reserveGtonBefore,
         uint256 reserveTokenBefore) = getReserves(
            router.factory(),
            address(gton),
            address(token)
        );
        (reserveGton,
         reserveToken,
         amountGton) = estimate(
            reserveGtonBefore,
            reserveTokenBefore,
            liquidity,
            amountBuyback
        );
    }

    function estimate(
        uint256 reserveGtonBefore,
        uint256 reserveTokenBefore,
        uint256 liquidity,
        uint256 amountBuyback
    )
        public view returns (
        uint256 reserveGton,
        uint256 reserveToken,
        uint256 amountGton
    ) {
        (uint256 reserveGtonAfterRemove,
         uint256 reserveTokenAfterRemove,
         uint256 amountGTONAfterRemove,
         uint256 amountTokenAfterRemove) = estimateRemove(
            reserveGtonBefore,
            reserveTokenBefore,
            liquidity
        );
        (uint256 reserveGtonAfterBuyback,
         uint256 reserveTokenAfterBuyback,
         uint256 amountTokenIn) = estimateBuyback(
            reserveGtonAfterRemove,
            reserveTokenAfterRemove,
            amountBuyback
        );
        uint256 amountGtonAdd;
        (reserveGton,
         reserveToken,
         amountGtonAdd) = estimateAdd(
            reserveGtonAfterBuyback,
            reserveTokenAfterBuyback,
            amountTokenAfterRemove - amountTokenIn
        );
        amountGton = amountGTONAfterRemove + amountBuyback - amountGtonAdd;
    }

    function estimateRemove(
        uint256 reserveGton,
        uint256 reserveToken,
        uint256 liquidity
    )
        public view returns (
        uint256 reserveGtonAfterRemove,
        uint256 reserveTokenAfterRemove,
        uint256 amountGtonAfterRemove,
        uint256 amountTokenAfterRemove
    ) {
        uint totalSupply = pool.totalSupply();
        amountGtonAfterRemove = liquidity * gton.balanceOf(address(pool)) / totalSupply;
        amountTokenAfterRemove = liquidity * token.balanceOf(address(pool)) / totalSupply;
        reserveGtonAfterRemove = reserveGton - amountGtonAfterRemove;
        reserveTokenAfterRemove = reserveToken - amountTokenAfterRemove;
        console.log("after remove", reserveGtonAfterRemove, reserveTokenAfterRemove);
    }

    function estimateBuyback(
        uint256 reserveGton,
        uint256 reserveToken,
        uint256 amountBuyback
    )
        public view returns (
        uint256 reserveGtonAfterBuyback,
        uint256 reserveTokenAfterBuyback,
        uint256 amountToken
    ) {
        amountToken = getAmountIn(
            amountBuyback,
            reserveToken,
            reserveGton
        );
        console.log("swap gton for token", amountBuyback, amountToken);
        reserveGtonAfterBuyback = reserveGton - amountBuyback;
        reserveTokenAfterBuyback = reserveToken + amountToken;
        console.log("after buyback", reserveGtonAfterBuyback, reserveTokenAfterBuyback);
    }

    function estimateAdd(
        uint256 reserveGton,
        uint256 reserveToken,
        uint256 amountTokenAdd
    ) public view returns (
        uint256 reserveGtonAfterAdd,
        uint256 reserveTokenAfterAdd,
        uint256 amountGtonAdd
    ) {
        amountGtonAdd = quote(amountTokenAdd, reserveToken, reserveGton);
        reserveGtonAfterAdd = reserveGton + amountGtonAdd;
        reserveTokenAfterAdd = reserveToken + amountTokenAdd;
        console.log("after add", reserveGtonAfterAdd, reserveTokenAfterAdd);
    }

    // **** LIBRARY FUNCTIONS ****
    // returns sorted token addresses, used to handle return values from pairs sorted in this order
    function sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, 'UniswapV2Library: IDENTICAL_ADDRESSES');
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'UniswapV2Library: ZERO_ADDRESS');
    }

    // fetches and sorts the reserves for a pair
    // uses getPair instead of pairFor because init code hashes can be different for amms
    function getReserves(
        address factory,
        address tokenA,
        address tokenB
    ) public view returns (uint reserveA, uint reserveB) {
        (address token0,) = sortTokens(tokenA, tokenB);
        (uint reserve0, uint reserve1,) = IUniswapV2Pair(IUniswapV2Factory(factory).getPair(tokenA, tokenB)).getReserves();
        (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }

    // given some amount of an asset and pair reserves, returns an equivalent amount of the other asset
    function quote(uint amountA, uint reserveA, uint reserveB) public pure returns (uint amountB) {
        require(amountA > 0, 'UniswapV2Library: INSUFFICIENT_AMOUNT');
        require(reserveA > 0 && reserveB > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');
        amountB = (amountA * reserveB) / reserveA;
    }

    // given an output amount of an asset and pair reserves, returns a required input amount of the other asset
    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) public pure returns (uint amountIn) {
        require(amountOut > 0, 'UniswapV2Library: INSUFFICIENT_OUTPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');
        uint numerator = reserveIn * amountOut * 1000;
        uint denominator = (reserveOut - amountOut) * 997;
        amountIn = (numerator / denominator) + 1;
    }

    // performs chained getAmountIn calculations on any number of pairs
    function getAmountsIn(address factory, uint amountOut, address[] memory path) public view returns (uint[] memory amounts) {
        require(path.length >= 2, 'UniswapV2Library: INVALID_PATH');
        amounts = new uint[](path.length);
        amounts[amounts.length - 1] = amountOut;
        for (uint i = path.length - 1; i > 0; i--) {
            (uint reserveIn, uint reserveOut) = getReserves(factory, path[i - 1], path[i]);
            amounts[i - 1] = getAmountIn(amounts[i], reserveIn, reserveOut);
        }
    }

    // **** LOG FUNCTION ****
    function log(string memory s) internal {
        console.log(s);
        console.log(
            "balances",
            gton.balanceOf(address(this)),
            token.balanceOf(address(this))
        );
        console.log(
            "reserves",
            gton.balanceOf(address(pool)),
            token.balanceOf(address(pool))
        );
        address[] memory pathToToken = new address[](2);
        pathToToken[0] = address(gton);
        pathToToken[1] = address(token);
        uint[] memory quotes = router.getAmountsOut(1e10, pathToToken);
        console.log("price");
        console.log(quotes[1], "/", quotes[0], quotes[1]/quotes[0]);
        console.log("=====================================");
    }

}

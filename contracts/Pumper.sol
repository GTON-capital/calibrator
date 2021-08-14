//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "./interfaces/IPumper.sol";
// import "hardhat/console.sol";

/// @title Pumper
contract Pumper is IPumper {

    address public owner;
    IERC20 public gton;
    IUniswapV2Router01 public router;
    string public VERSION;

    constructor(
        IERC20 _gton,
        IUniswapV2Router01 _router,
        string memory _VERSION
    ) {
        owner = msg.sender;
        gton = _gton;
        router = _router;
        VERSION = _VERSION;
    }

    function setOwner(address _owner) external {
        require(msg.sender == owner, "ACW");
        owner = _owner;
    }

    function pump2(
        IUniswapV2Pair pool1,
        uint256 liquidity1,
        uint256 amountBuyback1,
        IUniswapV2Pair pool2,
        uint256 liquidity2,
        uint256 amountBuyback2,
        address to
    ) external {
        pump(pool1, liquidity1, amountBuyback1, to);
        pump(pool2, liquidity2, amountBuyback2, to);
    }

    function pump(IUniswapV2Pair pool, uint256 liquidity, uint256 amountBuyback, address to) public {
        // transfer `liquidity` from msg.sender
        pool.transferFrom(msg.sender, address(this), liquidity);
        // remove `liquidity`
        IERC20 token = tokenFromPool(pool);
        remove(pool, token);
        // buy gton for `amountBuyback`
        buyback(pool, token, amountBuyback);
        // add liquidity for all quote token and have some gton left
        add(pool, token);
        // send gton and lp to `to`
        retrieve(pool, to);
    }

    function remove(IUniswapV2Pair pool, IERC20 token) internal {
        //log(pool, "=========== before remove ===========");
        uint liquidity = pool.balanceOf(address(this));
        uint totalSupply = pool.totalSupply();
        uint amount0 = liquidity * gton.balanceOf(address(pool)) / totalSupply;
        uint amount1 = liquidity * token.balanceOf(address(pool)) / totalSupply;
        uint deadline = block.timestamp+86400;
        //console.log("remove liquidity", amount0, amount1, liquidity);
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
        //log(pool, "===========  after remove ===========");
    }

    function buyback(IUniswapV2Pair pool, IERC20 token, uint256 amountBuyback) internal {
        //log(pool, "===========   before buy  ===========");
        gton.approve(address(router), gton.balanceOf(address(this)));
        token.approve(address(router), token.balanceOf(address(this)));
        address[] memory pathToGton = new address[](2);
        pathToGton[0] = address(token);
        pathToGton[1] = address(gton);
        uint deadline = block.timestamp+86400;
        uint[] memory amounts = router.getAmountsIn(amountBuyback, pathToGton);
        //console.log("swap gton for token", amountBuyback, amounts[0]);
        router.swapTokensForExactTokens(
            amountBuyback,
            amounts[0],
            pathToGton,
            address(this),
            deadline
        );
        //log(pool, "===========   after buy   ===========");
    }

    function add(IUniswapV2Pair pool, IERC20 token) internal {
        //log(pool, "===========   before add  ===========");
        uint amountTokenAdd = token.balanceOf(address(this));
        address[] memory pathToGton = new address[](2);
        pathToGton[0] = address(token);
        pathToGton[1] = address(gton);
        uint deadline = block.timestamp+86400;
        (uint reserveGton, uint reserveToken) = getReserves(pool, address(gton), address(token));
        uint amountGtonAdd = quote(amountTokenAdd, reserveToken, reserveGton);
        //console.log("add liquidity", amountGtonAdd, amountTokenAdd);
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
        //console.log("add liquidity", amountA, amountB, liq);
        //log(pool, "===========   after add   ===========");
    }

    function retrieve(IUniswapV2Pair pool, address to) internal {
        //log(pool, "========== before retrieve ==========");
        pool.transfer(to, pool.balanceOf(address(this)));
        gton.transfer(to, gton.balanceOf(address(this)));
        //log(pool, "==========  after retrieve ==========");
    }

    // **** ESTIMATE FUNCTIONS ****
    function estimateNow(IUniswapV2Pair pool, uint256 liquidity, uint256 amountBuyback)
        external view returns (
        uint256 reserveGton,
        uint256 reserveToken,
        uint256 amountGton
    ) {
        IERC20 token = tokenFromPool(pool);
        (uint256 reserveGtonBefore,
         uint256 reserveTokenBefore) = getReserves(
            pool,
            address(gton),
            address(token)
        );
        uint256 totalSupplyBefore = pool.totalSupply();
        (reserveGton,
         reserveToken,
         amountGton) = estimate(
            reserveGtonBefore,
            reserveTokenBefore,
            totalSupplyBefore,
            liquidity,
            amountBuyback
        );
    }

    function estimate(
        uint256 reserveGtonBefore,
        uint256 reserveTokenBefore,
        uint256 totalSupplyBefore,
        uint256 liquidity,
        uint256 amountBuyback
    )
        public pure returns (
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
            totalSupplyBefore,
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
        uint256 totalSupply,
        uint256 liquidity
    )
        public pure returns (
        uint256 reserveGtonAfterRemove,
        uint256 reserveTokenAfterRemove,
        uint256 amountGtonAfterRemove,
        uint256 amountTokenAfterRemove
    ) {
        amountGtonAfterRemove = liquidity * reserveGton / totalSupply;
        amountTokenAfterRemove = liquidity * reserveToken / totalSupply;
        reserveGtonAfterRemove = reserveGton - amountGtonAfterRemove;
        reserveTokenAfterRemove = reserveToken - amountTokenAfterRemove;
        //console.log("after remove", reserveGtonAfterRemove, reserveTokenAfterRemove);
    }

    function estimateBuyback(
        uint256 reserveGton,
        uint256 reserveToken,
        uint256 amountBuyback
    )
        public pure returns (
        uint256 reserveGtonAfterBuyback,
        uint256 reserveTokenAfterBuyback,
        uint256 amountToken
    ) {
        amountToken = getAmountIn(
            amountBuyback,
            reserveToken,
            reserveGton
        );
        //console.log("swap gton for token", amountBuyback, amountToken);
        reserveGtonAfterBuyback = reserveGton - amountBuyback;
        reserveTokenAfterBuyback = reserveToken + amountToken;
        //console.log("after buyback", reserveGtonAfterBuyback, reserveTokenAfterBuyback);
    }

    function estimateAdd(
        uint256 reserveGton,
        uint256 reserveToken,
        uint256 amountTokenAdd
    ) public pure returns (
        uint256 reserveGtonAfterAdd,
        uint256 reserveTokenAfterAdd,
        uint256 amountGtonAdd
    ) {
        amountGtonAdd = quote(amountTokenAdd, reserveToken, reserveGton);
        reserveGtonAfterAdd = reserveGton + amountGtonAdd;
        reserveTokenAfterAdd = reserveToken + amountTokenAdd;
        //console.log("after add", reserveGtonAfterAdd, reserveTokenAfterAdd);
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
        IUniswapV2Pair pool,
        address tokenA,
        address tokenB
    ) public view returns (uint reserveA, uint reserveB) {
        (address token0,) = sortTokens(tokenA, tokenB);
        (uint reserve0, uint reserve1,) = pool.getReserves();
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

    function tokenFromPool(IUniswapV2Pair pool) public view returns (IERC20 token) {
        address token0 = pool.token0();
        address token1 = pool.token1();
        token = token0 == address(gton) ? IERC20(token1) : IERC20(token0);
    }

    // **** RECLAIM FUNCTION ****
    function reclaimERC20(IERC20 token, uint256 amount) external {
        require(msg.sender == owner, "ACW");
        token.transfer(msg.sender, amount);
    }

    function reclaimNative(uint256 amount) external {
        require(msg.sender == owner, "ACW");
        payable(msg.sender).transfer(amount);
    }

    // **** LOG FUNCTION ****
    // function log(IUniswapV2Pair pool, string memory s) internal {
        // IERC20 token = tokenFromPool(pool);
        //console.log(s);
        //console.log(
        //     "balances",
        //     gton.balanceOf(address(this)),
        //     token.balanceOf(address(this))
        // );
        //console.log(
        //     "reserves",
        //     gton.balanceOf(address(pool)),
        //     token.balanceOf(address(pool))
        // );
        // address[] memory pathToToken = new address[](2);
        // pathToToken[0] = address(gton);
        // pathToToken[1] = address(token);
        // uint[] memory quotes = router.getAmountsOut(1e10, pathToToken);
        //console.log("price");
        //console.log(quotes[1], "/", quotes[0], quotes[1]/quotes[0]);
        //console.log("=====================================");
    // }
}

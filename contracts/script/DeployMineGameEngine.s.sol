// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MineGameEngine} from "../src/MineGameEngine.sol";

/// @notice Deploys only the game engine after the o1-created B20 address is known.
/// @dev This script intentionally does not create a token, allocate funds, or launch liquidity.
contract DeployMineGameEngine is Script {
    function run() external returns (MineGameEngine engine) {
        address token = vm.envAddress("MINEGAME_TOKEN_ADDRESS");
        address owner = vm.envAddress("MINEGAME_SAFE_ADDRESS");
        address rewardsVault = vm.envAddress("MINEGAME_REWARDS_VAULT");
        uint256 overclockPrice = vm.envUint("MINEGAME_OVERCLOCK_PRICE_WEI");

        require(block.chainid == 8453 || block.chainid == 31337, "Base Mainnet or local Anvil only");
        require(token.code.length > 0, "MINEGAME token must be deployed");
        require(owner.code.length > 0, "owner must be a contract wallet");
        require(rewardsVault != address(0), "rewards vault required");

        vm.startBroadcast();
        engine = new MineGameEngine(owner, IERC20(token), rewardsVault, overclockPrice);
        vm.stopBroadcast();

        console2.log("MineGame engine:", address(engine));
        console2.log("MINEGAME token:", token);
        console2.log("Owner Safe:", owner);
        console2.log("Rewards vault:", rewardsVault);
    }
}

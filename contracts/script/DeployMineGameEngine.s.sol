// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {MineGameEngine} from "../src/MineGameEngine.sol";

/// @notice Deploys only the game engine after the o1-created B20 address is known.
/// @dev This script intentionally does not create a token, allocate funds, or launch liquidity.
contract DeployMineGameEngine is Script {
    uint256 internal constant EXPECTED_SUPPLY = 1_000_000_000 ether;
    uint256 internal constant MAX_OVERCLOCK_PRICE = 10_000 ether;

    function run() external returns (MineGameEngine engine) {
        address token = vm.envAddress("MINEGAME_TOKEN_ADDRESS");
        address owner = vm.envAddress("MINEGAME_SAFE_ADDRESS");
        address rewardsVault = vm.envAddress("MINEGAME_REWARDS_VAULT");
        uint256 overclockPrice = vm.envUint("MINEGAME_OVERCLOCK_PRICE_WEI");

        require(block.chainid == 8453 || block.chainid == 31337, "Base Mainnet or local Anvil only");
        require(token.code.length > 0, "MINEGAME token must be deployed");
        require(owner.code.length > 0, "owner must be a contract wallet");
        require(rewardsVault.code.length > 0, "rewards vault must be a contract wallet");
        require(rewardsVault != token, "rewards vault cannot be token");
        require(overclockPrice >= 1 ether, "overclock price below one token");
        require(overclockPrice <= MAX_OVERCLOCK_PRICE, "overclock price above maximum");

        IERC20Metadata minegameToken = IERC20Metadata(token);
        require(keccak256(bytes(minegameToken.name())) == keccak256(bytes("MineGame")), "wrong token name");
        require(keccak256(bytes(minegameToken.symbol())) == keccak256(bytes("MINEGAME")), "wrong token symbol");
        require(minegameToken.decimals() == 18, "wrong token decimals");
        require(minegameToken.totalSupply() == EXPECTED_SUPPLY, "wrong token supply");

        vm.startBroadcast();
        engine = new MineGameEngine(owner, minegameToken, rewardsVault, overclockPrice);
        vm.stopBroadcast();

        require(engine.owner() == owner, "owner assertion failed");
        require(address(engine.minegame()) == token, "token assertion failed");
        require(engine.rewardsVault() == rewardsVault, "vault assertion failed");
        require(engine.overclockPrice() == overclockPrice, "price assertion failed");

        console2.log("MineGame engine:", address(engine));
        console2.log("MINEGAME token:", token);
        console2.log("Owner Safe:", owner);
        console2.log("Rewards vault:", rewardsVault);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {MineGameEconomy} from "../src/MineGameEconomy.sol";

interface IBaseB20Preflight {
    function supplyCap() external view returns (uint256);
    function pausedFeatures() external view returns (uint8[] memory);
    function policyId(bytes32 policyScope) external view returns (uint64);
}

/// @notice Deploys the paused MINEGAME miner economy after the canonical o1 B20 exists.
/// @dev This script does not configure tiers, fund reserves, unpause, or launch the token.
contract DeployMineGameEconomy is Script {
    uint256 internal constant EXPECTED_SUPPLY = 1_000_000_000 ether;
    // Intentionally zero until the live Base B20 preflight report is reviewed.
    // Deployment remains impossible until this exact digest is pinned in a reviewed commit.
    bytes32 internal constant EXPECTED_B20_PREFLIGHT_DIGEST = bytes32(0);
    bytes32 internal constant TRANSFER_SENDER_POLICY = keccak256("TRANSFER_SENDER_POLICY");
    bytes32 internal constant TRANSFER_RECEIVER_POLICY = keccak256("TRANSFER_RECEIVER_POLICY");
    bytes32 internal constant TRANSFER_EXECUTOR_POLICY = keccak256("TRANSFER_EXECUTOR_POLICY");
    bytes32 internal constant MINT_RECEIVER_POLICY = keccak256("MINT_RECEIVER_POLICY");
    bytes32 internal constant SEIZE_HOLDER_POLICY = keccak256("SEIZE_HOLDER_POLICY");
    bytes32 internal constant SEIZE_RECEIVER_POLICY = keccak256("SEIZE_RECEIVER_POLICY");

    function run() external returns (MineGameEconomy economy) {
        address token = vm.envAddress("MINEGAME_TOKEN_ADDRESS");
        address owner = vm.envAddress("MINEGAME_SAFE_ADDRESS");
        address treasury = vm.envAddress("MINEGAME_TREASURY_SAFE_ADDRESS");
        uint256 roomPrice = vm.envUint("MINEGAME_ROOM_PRICE_WEI");
        uint256 rewardRate = vm.envUint("MINEGAME_REWARD_RATE_WEI_PER_SECOND");
        uint256 rewardRateCeiling = vm.envUint("MINEGAME_MAX_REWARD_RATE_WEI_PER_SECOND");
        uint256 gridCapacityPerRoom = vm.envUint("MINEGAME_GRID_CAPACITY_PER_ROOM");
        bytes32 b20PreflightDigest = vm.envBytes32("MINEGAME_B20_PREFLIGHT_DIGEST");

        require(block.chainid == 8453 || block.chainid == 31337, "Base Mainnet or local Anvil only");
        require(token.code.length > 0, "MINEGAME token must be deployed");
        require(owner.code.length > 0, "owner must be a contract wallet");
        require(treasury.code.length > 0, "treasury must be a contract wallet");
        require(owner != token && treasury != token, "Safe cannot be token");

        IERC20Metadata minegameToken = IERC20Metadata(token);
        require(keccak256(bytes(minegameToken.name())) == keccak256(bytes("MineGame")), "wrong token name");
        require(keccak256(bytes(minegameToken.symbol())) == keccak256(bytes("MINEGAME")), "wrong token symbol");
        require(minegameToken.decimals() == 18, "wrong token decimals");
        require(minegameToken.totalSupply() == EXPECTED_SUPPLY, "wrong token supply");
        require(
            EXPECTED_B20_PREFLIGHT_DIGEST != bytes32(0) && b20PreflightDigest == EXPECTED_B20_PREFLIGHT_DIGEST,
            "B20 preflight digest mismatch"
        );

        IBaseB20Preflight b20 = IBaseB20Preflight(token);
        require(b20.supplyCap() == EXPECTED_SUPPLY, "supply cap must equal supply");
        require(b20.pausedFeatures().length == 0, "B20 feature is paused");
        require(b20.policyId(TRANSFER_SENDER_POLICY) == 0, "sender policy enabled");
        require(b20.policyId(TRANSFER_RECEIVER_POLICY) == 0, "receiver policy enabled");
        require(b20.policyId(TRANSFER_EXECUTOR_POLICY) == 0, "executor policy enabled");
        require(b20.policyId(MINT_RECEIVER_POLICY) == 0, "mint policy enabled");
        require(b20.policyId(SEIZE_HOLDER_POLICY) == 0, "seize holder policy enabled");
        require(b20.policyId(SEIZE_RECEIVER_POLICY) == 0, "seize receiver policy enabled");

        vm.startBroadcast();
        economy = new MineGameEconomy(
            owner, minegameToken, treasury, roomPrice, rewardRate, rewardRateCeiling, gridCapacityPerRoom
        );
        vm.stopBroadcast();

        require(economy.owner() == owner, "owner assertion failed");
        require(address(economy.minegame()) == token, "token assertion failed");
        require(economy.treasury() == treasury, "treasury assertion failed");
        require(economy.paused(), "economy must deploy paused");
        require(economy.roomPrice() == roomPrice, "room price assertion failed");
        require(economy.rewardRatePerSecond() == rewardRate, "reward rate assertion failed");
        require(economy.maxRewardRatePerSecond() == rewardRateCeiling, "reward ceiling assertion failed");
        require(economy.gridCapacityPerRoom() == gridCapacityPerRoom, "grid capacity assertion failed");
        require(economy.isSolvent(), "initial solvency assertion failed");

        console2.log("MineGame economy:", address(economy));
        console2.log("MINEGAME token:", token);
        console2.log("Owner Safe:", owner);
        console2.log("Treasury Safe:", treasury);
        console2.log("Paused:", economy.paused());
        console2.logBytes32(b20PreflightDigest);
    }
}

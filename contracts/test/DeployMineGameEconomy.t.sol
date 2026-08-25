// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {DeployMineGameEconomy, IBaseB20Preflight} from "../script/DeployMineGameEconomy.s.sol";
import {B20PreflightMock, PreflightWallet} from "./B20PreflightMock.sol";

contract DeployMineGameEconomyHarness is DeployMineGameEconomy {
    function requireOptionalPolicy(address token, bytes32 policyScope) external view {
        _requireZeroOrUnsupportedPolicy(IBaseB20Preflight(token), policyScope, "optional policy enabled");
    }
}

contract DeployMineGameEconomyTest is Test {
    bytes32 internal constant SEIZE_HOLDER_POLICY = keccak256("SEIZE_HOLDER_POLICY");

    function testArbitraryNonzeroDigestCannotBypassPinnedPreflight() external {
        B20PreflightMock token = new B20PreflightMock(makeAddr("live-admin"));
        PreflightWallet owner = new PreflightWallet();
        PreflightWallet treasury = new PreflightWallet();

        vm.setEnv("MINEGAME_TOKEN_ADDRESS", vm.toString(address(token)));
        vm.setEnv("MINEGAME_SAFE_ADDRESS", vm.toString(address(owner)));
        vm.setEnv("MINEGAME_TREASURY_SAFE_ADDRESS", vm.toString(address(treasury)));
        vm.setEnv("MINEGAME_ROOM_PRICE_WEI", vm.toString(uint256(2_000 ether)));
        vm.setEnv("MINEGAME_REWARD_RATE_WEI_PER_SECOND", vm.toString(uint256(1 ether)));
        vm.setEnv("MINEGAME_MAX_REWARD_RATE_WEI_PER_SECOND", vm.toString(uint256(10 ether)));
        vm.setEnv("MINEGAME_GRID_CAPACITY_PER_ROOM", vm.toString(uint256(20_000)));
        vm.setEnv("MINEGAME_B20_PREFLIGHT_DIGEST", vm.toString(bytes32(uint256(1))));

        DeployMineGameEconomy deployer = new DeployMineGameEconomy();
        vm.expectRevert(bytes("B20 preflight digest mismatch"));
        deployer.run();
    }

    function testExactUnsupportedSeizePolicyIsAccepted() external {
        B20PreflightMock token = new B20PreflightMock(address(0));
        token.setPolicyBehavior(SEIZE_HOLDER_POLICY, 1);

        DeployMineGameEconomyHarness harness = new DeployMineGameEconomyHarness();
        harness.requireOptionalPolicy(address(token), SEIZE_HOLDER_POLICY);
    }

    function testSupportedNonzeroSeizePolicyIsRejected() external {
        B20PreflightMock token = new B20PreflightMock(address(0));
        token.setPolicy(SEIZE_HOLDER_POLICY, 1);

        DeployMineGameEconomyHarness harness = new DeployMineGameEconomyHarness();
        vm.expectRevert(bytes("optional policy enabled"));
        harness.requireOptionalPolicy(address(token), SEIZE_HOLDER_POLICY);
    }

    function testUnexpectedSeizePolicyFailureIsRejected() external {
        B20PreflightMock token = new B20PreflightMock(address(0));
        token.setPolicyBehavior(SEIZE_HOLDER_POLICY, 2);

        DeployMineGameEconomyHarness harness = new DeployMineGameEconomyHarness();
        vm.expectRevert(bytes("unexpected seize policy response"));
        harness.requireOptionalPolicy(address(token), SEIZE_HOLDER_POLICY);
    }
}

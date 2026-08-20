// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {MineGameEngine} from "../src/MineGameEngine.sol";
import {MockMineGame} from "./MockMineGame.sol";

contract MineGameEngineTest is Test {
    MockMineGame internal token;
    MineGameEngine internal engine;

    address internal owner = makeAddr("owner");
    address internal rewardsVault = makeAddr("rewardsVault");
    address internal alice = makeAddr("alice");

    uint256 internal constant STAKE = 1_000 ether;
    uint256 internal constant OVERCLOCK_PRICE = 100 ether;

    function setUp() external {
        token = new MockMineGame();
        engine = new MineGameEngine(owner, token, rewardsVault, OVERCLOCK_PRICE);
        token.transfer(alice, 10_000 ether);
        vm.prank(alice);
        token.approve(address(engine), type(uint256).max);
    }

    function testStakeAndBasePowerAccrual() external {
        _stakeAlice(STAKE);
        vm.warp(block.timestamp + 1 days);

        MineGameEngine.Position memory position = engine.positionOf(alice);
        assertGt(position.power, STAKE);
        assertLt(position.power, 1_003 ether);
        assertEq(position.staked, STAKE);
        assertEq(engine.totalStaked(), STAKE);
    }

    function testAgeBonusReachesTwoTimesAtOneYear() external {
        _stakeAlice(STAKE);
        vm.warp(block.timestamp + 365 days);
        assertEq(engine.ageBonusBps(alice), 10_000);

        vm.prank(alice);
        engine.accruePower();
        MineGameEngine.Position memory position = engine.positionOf(alice);
        assertApproxEqAbs(position.power, 547_500 ether, 2 ether);
    }

    function testNewStakeUsesWeightedStart() external {
        _stakeAlice(STAKE);
        uint256 originalStart = block.timestamp;
        vm.warp(block.timestamp + 100 days);

        vm.prank(alice);
        engine.stake(STAKE);
        MineGameEngine.Position memory position = engine.positionOf(alice);
        assertApproxEqAbs(position.weightedStart, originalStart + 50 days, 1);
    }

    function testOverclockDoublesPowerAndRecyclesTokens() external {
        _stakeAlice(STAKE);
        vm.prank(alice);
        engine.activateOverclock();
        assertEq(token.balanceOf(rewardsVault), OVERCLOCK_PRICE);

        vm.warp(block.timestamp + 1 days);
        MineGameEngine.Position memory position = engine.positionOf(alice);
        assertGt(position.power, 2_000 ether);
        assertLt(position.power, 2_003 ether);
    }

    function testOverclockSplitsAccrualAtExpiry() external {
        _stakeAlice(STAKE);
        vm.prank(alice);
        engine.activateOverclock();
        vm.warp(block.timestamp + 2 days);

        MineGameEngine.Position memory position = engine.positionOf(alice);
        assertGt(position.power, 3_000 ether);
        assertLt(position.power, 3_012 ether);
    }

    function testPurchaseAndEquipPartRaisesRate() external {
        vm.prank(owner);
        uint256 partId = engine.configurePart(0, 500 ether, 2_500, true, "ipfs://drill");
        _stakeAlice(STAKE);
        vm.warp(block.timestamp + 1 days);

        vm.startPrank(alice);
        engine.purchasePart(partId);
        engine.equipPart(partId);
        vm.warp(block.timestamp + 1 days);
        engine.accruePower();
        vm.stopPrank();

        MineGameEngine.Position memory position = engine.positionOf(alice);
        assertEq(position.partBonusBps, 2_500);
        assertGt(position.power, 1_750 ether);
    }

    function testPartConfigurationCannotChangeAfterPublication() external {
        vm.startPrank(owner);
        uint256 partId = engine.configurePart(0, 500 ether, 2_500, true, "ipfs://drill");
        vm.expectRevert(MineGameEngine.InvalidPart.selector);
        engine.configurePart(partId, 1 ether, 50_000, true, "ipfs://replacement");
        engine.setPartActive(partId, false);
        vm.stopPrank();

        (,, bool active,) = engine.parts(partId);
        assertFalse(active);
    }

    function testFullWithdrawalResetsAgeButPreservesPower() external {
        _stakeAlice(STAKE);
        vm.warp(block.timestamp + 10 days);
        vm.prank(alice);
        engine.withdraw(STAKE);

        MineGameEngine.Position memory position = engine.positionOf(alice);
        assertEq(position.staked, 0);
        assertEq(position.weightedStart, 0);
        assertEq(position.lastAccrual, 0);
        assertGt(position.power, 10_000 ether);
        assertEq(token.balanceOf(alice), 10_000 ether);
    }

    function testEmergencyWithdrawalWorksWhilePaused() external {
        _stakeAlice(STAKE);
        vm.prank(owner);
        engine.pause();

        vm.prank(alice);
        engine.emergencyWithdraw();
        assertEq(token.balanceOf(alice), 10_000 ether);
        assertEq(engine.totalStaked(), 0);
    }

    function testCannotReactivateRunningOverclock() external {
        _stakeAlice(STAKE);
        vm.startPrank(alice);
        engine.activateOverclock();
        vm.expectRevert(MineGameEngine.OverclockActive.selector);
        engine.activateOverclock();
        vm.stopPrank();
    }

    function testFuzzPendingPowerNeverFalls(uint96 rawStake, uint32 elapsedA, uint32 elapsedB) external {
        uint256 amount = bound(uint256(rawStake), 1 ether, 10_000 ether);
        uint256 first = bound(uint256(elapsedA), 1, 180 days);
        uint256 second = bound(uint256(elapsedB), 1, 180 days);
        _stakeAlice(amount);

        vm.warp(block.timestamp + first);
        uint256 powerA = engine.positionOf(alice).power;
        vm.warp(block.timestamp + second);
        uint256 powerB = engine.positionOf(alice).power;
        assertGe(powerB, powerA);
    }

    function _stakeAlice(uint256 amount) internal {
        vm.prank(alice);
        engine.stake(amount);
    }
}

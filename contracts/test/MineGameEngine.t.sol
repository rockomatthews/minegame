// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {MineGameEngine} from "../src/MineGameEngine.sol";
import {
    ContractWallet,
    FeeOnTransferMineGame,
    MockMineGame,
    ReentrantMineGame,
    SupplyShrinkingMineGame
} from "./MockMineGame.sol";

contract MineGameEngineTest is Test {
    MockMineGame internal token;
    MineGameEngine internal engine;

    address internal owner = makeAddr("owner");
    address internal rewardsVault;
    address internal alice = makeAddr("alice");

    uint256 internal constant STAKE = 1_000 ether;
    uint256 internal constant OVERCLOCK_PRICE = 100 ether;

    function setUp() external {
        token = new MockMineGame();
        rewardsVault = address(new ContractWallet());
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
        engine.activateOverclock(OVERCLOCK_PRICE);
        assertEq(token.balanceOf(rewardsVault), OVERCLOCK_PRICE);

        vm.warp(block.timestamp + 1 days);
        MineGameEngine.Position memory position = engine.positionOf(alice);
        assertGt(position.power, 2_000 ether);
        assertLt(position.power, 2_003 ether);
    }

    function testOverclockSplitsAccrualAtExpiry() external {
        _stakeAlice(STAKE);
        vm.prank(alice);
        engine.activateOverclock(OVERCLOCK_PRICE);
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
        engine.activateOverclock(OVERCLOCK_PRICE);
        vm.expectRevert(MineGameEngine.OverclockActive.selector);
        engine.activateOverclock(OVERCLOCK_PRICE);
        vm.stopPrank();
    }

    function testOverclockPriceBoundProtectsPendingActivation() external {
        _stakeAlice(STAKE);

        vm.prank(owner);
        engine.setOverclockPrice(1_000 ether);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(MineGameEngine.PriceExceedsMax.selector, 1_000 ether, OVERCLOCK_PRICE));
        engine.activateOverclock(OVERCLOCK_PRICE);

        assertEq(token.balanceOf(rewardsVault), 0);
        assertEq(engine.positionOf(alice).overclockUntil, 0);
    }

    function testOwnershipCannotBeRenounced() external {
        vm.prank(owner);
        vm.expectRevert(MineGameEngine.OwnershipRenunciationDisabled.selector);
        engine.renounceOwnership();
        assertEq(engine.owner(), owner);
    }

    function testConstructorRejectsInvalidRewardsVaults() external {
        vm.expectRevert(MineGameEngine.InvalidRewardsVault.selector);
        new MineGameEngine(owner, token, address(token), OVERCLOCK_PRICE);

        vm.expectRevert(MineGameEngine.InvalidRewardsVault.selector);
        new MineGameEngine(owner, token, makeAddr("eoaVault"), OVERCLOCK_PRICE);
    }

    function testEmergencyWithdrawalSocializesUnexpectedBalanceLoss() external {
        SupplyShrinkingMineGame shrinkingToken = new SupplyShrinkingMineGame();
        MineGameEngine shrinkingEngine =
            new MineGameEngine(owner, shrinkingToken, address(new ContractWallet()), OVERCLOCK_PRICE);
        address bob = makeAddr("bob");
        shrinkingToken.transfer(alice, STAKE);
        shrinkingToken.transfer(bob, STAKE);

        vm.prank(alice);
        shrinkingToken.approve(address(shrinkingEngine), STAKE);
        vm.prank(bob);
        shrinkingToken.approve(address(shrinkingEngine), STAKE);
        vm.prank(alice);
        shrinkingEngine.stake(STAKE);
        vm.prank(bob);
        shrinkingEngine.stake(STAKE);

        shrinkingToken.slash(address(shrinkingEngine), 1_500 ether);
        vm.prank(owner);
        shrinkingEngine.pause();

        vm.prank(alice);
        shrinkingEngine.emergencyWithdraw();
        vm.prank(bob);
        shrinkingEngine.emergencyWithdraw();

        assertEq(shrinkingToken.balanceOf(alice), 250 ether);
        assertEq(shrinkingToken.balanceOf(bob), 250 ether);
        assertEq(shrinkingEngine.totalStaked(), 0);
        assertEq(shrinkingToken.balanceOf(address(shrinkingEngine)), 0);
    }

    function testEmergencyWithdrawalClearsAccountingAfterTotalBalanceLoss() external {
        SupplyShrinkingMineGame shrinkingToken = new SupplyShrinkingMineGame();
        MineGameEngine shrinkingEngine =
            new MineGameEngine(owner, shrinkingToken, address(new ContractWallet()), OVERCLOCK_PRICE);
        shrinkingToken.transfer(alice, STAKE);
        vm.prank(alice);
        shrinkingToken.approve(address(shrinkingEngine), STAKE);
        vm.prank(alice);
        shrinkingEngine.stake(STAKE);

        shrinkingToken.slash(address(shrinkingEngine), STAKE);
        vm.prank(owner);
        shrinkingEngine.pause();
        vm.prank(alice);
        shrinkingEngine.emergencyWithdraw();

        assertEq(shrinkingEngine.totalStaked(), 0);
        assertEq(shrinkingEngine.positionOf(alice).staked, 0);
    }

    function testFeeOnTransferStakeIsRejected() external {
        FeeOnTransferMineGame feeToken = new FeeOnTransferMineGame();
        MineGameEngine feeEngine = new MineGameEngine(owner, feeToken, address(new ContractWallet()), OVERCLOCK_PRICE);
        uint256 amount = 900 ether;
        feeToken.transfer(alice, STAKE);
        vm.prank(alice);
        feeToken.approve(address(feeEngine), amount);

        vm.prank(alice);
        vm.expectRevert(MineGameEngine.UnsupportedTransferBehavior.selector);
        feeEngine.stake(amount);
        assertEq(feeEngine.totalStaked(), 0);
    }

    function testReentrantTokenCannotCorruptStakeAccounting() external {
        ReentrantMineGame reentrantToken = new ReentrantMineGame();
        MineGameEngine reentrantEngine =
            new MineGameEngine(owner, reentrantToken, address(new ContractWallet()), OVERCLOCK_PRICE);
        reentrantToken.setTarget(address(reentrantEngine));
        reentrantToken.transfer(alice, STAKE);
        vm.prank(alice);
        reentrantToken.approve(address(reentrantEngine), STAKE);

        vm.prank(alice);
        reentrantEngine.stake(STAKE);

        assertTrue(reentrantToken.callbackAttempted());
        assertTrue(reentrantToken.callbackBlocked());
        assertEq(reentrantEngine.totalStaked(), STAKE);
        assertEq(reentrantEngine.positionOf(alice).staked, STAKE);
        assertEq(reentrantToken.balanceOf(address(reentrantEngine)), STAKE);
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

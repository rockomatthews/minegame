// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {StdInvariant} from "forge-std/StdInvariant.sol";
import {Test} from "forge-std/Test.sol";
import {MineGameEngine} from "../src/MineGameEngine.sol";
import {ContractWallet, MockMineGame} from "./MockMineGame.sol";

contract MineGameEngineHandler is Test {
    MineGameEngine public immutable engine;
    MockMineGame public immutable token;
    address public immutable owner;
    uint256 public immutable partId;

    address[] internal _actors;

    constructor(
        MineGameEngine engine_,
        MockMineGame token_,
        address owner_,
        address[] memory actors_,
        uint256 partId_
    ) {
        engine = engine_;
        token = token_;
        owner = owner_;
        partId = partId_;
        _actors = actors_;
    }

    function advanceTime(uint32 rawElapsed) external {
        vm.warp(block.timestamp + bound(uint256(rawElapsed), 1, 30 days));
    }

    function stake(uint256 actorSeed, uint96 rawAmount) external {
        if (engine.paused()) return;
        address actor = _actor(actorSeed);
        uint256 balance = token.balanceOf(actor);
        if (balance == 0) return;
        uint256 amount = bound(uint256(rawAmount), 1, balance);
        vm.prank(actor);
        engine.stake(amount);
    }

    function withdraw(uint256 actorSeed, uint96 rawAmount) external {
        address actor = _actor(actorSeed);
        uint256 staked = engine.positionOf(actor).staked;
        if (staked == 0) return;
        uint256 amount = bound(uint256(rawAmount), 1, staked);
        vm.prank(actor);
        engine.withdraw(amount);
    }

    function accrue(uint256 actorSeed) external {
        if (engine.paused()) return;
        address actor = _actor(actorSeed);
        if (engine.positionOf(actor).staked == 0) return;
        vm.prank(actor);
        engine.accruePower();
    }

    function activateOverclock(uint256 actorSeed) external {
        if (engine.paused()) return;
        address actor = _actor(actorSeed);
        MineGameEngine.Position memory position = engine.positionOf(actor);
        uint256 price = engine.overclockPrice();
        if (position.staked == 0 || block.timestamp < position.overclockUntil || token.balanceOf(actor) < price) {
            return;
        }
        vm.prank(actor);
        engine.activateOverclock(price);
    }

    function purchaseAndEquipPart(uint256 actorSeed) external {
        if (engine.paused()) return;
        address actor = _actor(actorSeed);
        if (engine.ownsPart(actor, partId)) return;
        (uint256 powerCost,, bool active,) = engine.parts(partId);
        if (!active || engine.positionOf(actor).power < powerCost) return;

        vm.startPrank(actor);
        engine.purchasePart(partId);
        engine.equipPart(partId);
        vm.stopPrank();
    }

    function unequipPart(uint256 actorSeed) external {
        if (engine.paused()) return;
        address actor = _actor(actorSeed);
        if (!engine.equippedPart(actor, partId)) return;
        vm.prank(actor);
        engine.unequipPart(partId);
    }

    function emergencyWithdraw(uint256 actorSeed) external {
        address actor = _actor(actorSeed);
        if (engine.positionOf(actor).staked == 0) return;
        if (!engine.paused()) {
            vm.prank(owner);
            engine.pause();
        }
        vm.prank(actor);
        engine.emergencyWithdraw();
    }

    function togglePause() external {
        bool isPaused = engine.paused();
        vm.prank(owner);
        if (isPaused) engine.unpause();
        else engine.pause();
    }

    function actorCount() external view returns (uint256) {
        return _actors.length;
    }

    function actorAt(uint256 index) external view returns (address) {
        return _actors[index];
    }

    function _actor(uint256 seed) internal view returns (address) {
        return _actors[seed % _actors.length];
    }
}

contract MineGameEngineInvariantTest is StdInvariant, Test {
    MockMineGame internal token;
    MineGameEngine internal engine;
    MineGameEngineHandler internal handler;

    address internal owner = makeAddr("invariantOwner");
    address[] internal actors;

    function setUp() external {
        token = new MockMineGame();
        engine = new MineGameEngine(owner, token, address(new ContractWallet()), 100 ether);

        actors.push(makeAddr("alice"));
        actors.push(makeAddr("bob"));
        actors.push(makeAddr("carol"));

        for (uint256 i; i < actors.length; ++i) {
            token.transfer(actors[i], 1_000_000 ether);
            vm.prank(actors[i]);
            token.approve(address(engine), type(uint256).max);
        }

        vm.prank(owner);
        uint256 partId = engine.configurePart(0, 10 ether, 2_500, true, "ipfs://invariant-part");
        handler = new MineGameEngineHandler(engine, token, owner, actors, partId);

        bytes4[] memory selectors = new bytes4[](9);
        selectors[0] = handler.advanceTime.selector;
        selectors[1] = handler.stake.selector;
        selectors[2] = handler.withdraw.selector;
        selectors[3] = handler.accrue.selector;
        selectors[4] = handler.activateOverclock.selector;
        selectors[5] = handler.purchaseAndEquipPart.selector;
        selectors[6] = handler.unequipPart.selector;
        selectors[7] = handler.emergencyWithdraw.selector;
        selectors[8] = handler.togglePause.selector;
        targetContract(address(handler));
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }

    function invariantStakeAccountingRemainsSolvent() external view {
        uint256 stakeSum;
        for (uint256 i; i < actors.length; ++i) {
            stakeSum += engine.positionOf(actors[i]).staked;
        }
        assertEq(stakeSum, engine.totalStaked());
        assertLe(engine.totalStaked(), token.balanceOf(address(engine)));
    }

    function invariantPositionCapsHold() external view {
        for (uint256 i; i < actors.length; ++i) {
            MineGameEngine.Position memory position = engine.positionOf(actors[i]);
            assertLe(position.partBonusBps, engine.MAX_PART_BONUS_BPS());
            assertLe(position.equippedCount, engine.MAX_EQUIPPED_PARTS());
            assertLe(engine.ageBonusBps(actors[i]), engine.MAX_AGE_BONUS_BPS());
        }
    }
}

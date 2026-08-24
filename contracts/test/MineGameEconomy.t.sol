// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {MineGameEconomy} from "../src/MineGameEconomy.sol";
import {ContractWallet, FeeOnTransferMineGame, MockMineGame, ReentrantEconomyMineGame} from "./MockMineGame.sol";

contract MineGameEconomyTest is Test {
    MockMineGame internal token;
    MineGameEconomy internal economy;

    address internal owner;
    address internal treasury;
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    uint256 internal constant MINER_PRICE = 1_000 ether;
    uint256 internal constant ROOM_PRICE = 2_000 ether;
    uint256 internal constant REWARD_RATE = 1 ether;
    uint256 internal constant MAX_REWARD_RATE = 10 ether;
    uint256 internal constant GRID_CAPACITY = 10_000;
    uint256 internal constant TIER_ONE_HASHRATE = 100;
    uint256 internal constant TIER_ONE_GRID = 1_000;
    uint256 internal constant TIER_ONE_BUYBACK_BPS = 5_000;

    function setUp() external {
        token = new MockMineGame();
        owner = address(new ContractWallet());
        treasury = address(new ContractWallet());
        economy = new MineGameEconomy(owner, token, treasury, ROOM_PRICE, REWARD_RATE, MAX_REWARD_RATE, GRID_CAPACITY);

        vm.prank(owner);
        economy.configureTier(
            1,
            MINER_PRICE,
            uint128(TIER_ONE_HASHRATE),
            uint64(TIER_ONE_GRID),
            uint16(TIER_ONE_BUYBACK_BPS),
            "ipfs://tier-one"
        );
        vm.prank(owner);
        economy.unpause();

        token.transfer(alice, 10_000_000 ether);
        token.transfer(bob, 10_000_000 ether);
        vm.prank(alice);
        token.approve(address(economy), type(uint256).max);
        vm.prank(bob);
        token.approve(address(economy), type(uint256).max);
        token.approve(address(economy), type(uint256).max);
    }

    function testEveryMinerRequiresMinegamePayment() external {
        vm.prank(owner);
        vm.expectRevert(MineGameEconomy.InvalidConfiguration.selector);
        economy.configureTier(2, 0, 200, 1_000, 5_000, "ipfs://free");

        uint256 aliceBefore = token.balanceOf(alice);
        vm.prank(alice);
        uint256 minerId = economy.buyMiner(1, MINER_PRICE);

        assertEq(token.balanceOf(alice), aliceBefore - MINER_PRICE);
        assertEq(economy.playerMinerCount(alice), 1);
        assertEq(economy.playerActiveHashrate(alice), TIER_ONE_HASHRATE);
        assertEq(economy.totalActiveHashrate(), TIER_ONE_HASHRATE);
        assertEq(economy.playerGridDraw(alice), TIER_ONE_GRID);
        assertEq(economy.ownedMinerIds(alice)[0], minerId);
        (address minerOwner, uint256 tierId, uint256 buybackBasis,, bool listed) = economy.miners(minerId);
        assertEq(minerOwner, alice);
        assertEq(tierId, 1);
        assertEq(buybackBasis, MINER_PRICE);
        assertFalse(listed);
    }

    function testMinerPurchaseSplitsFundsAndRemainsSolvent() external {
        vm.prank(alice);
        economy.buyMiner(1, MINER_PRICE);

        assertEq(economy.rewardReserve(), 350 ether);
        assertEq(economy.buybackReserve(), 550 ether);
        assertEq(token.balanceOf(treasury), 100 ether);
        assertEq(token.balanceOf(address(economy)), 900 ether);
        assertEq(economy.accountedTokenBalance(), 900 ether);
        assertTrue(economy.isSolvent());
    }

    function testFiveMinerRoomCapacityAndPaidExpansion() external {
        for (uint256 i; i < 5; ++i) {
            vm.prank(alice);
            economy.buyMiner(1, MINER_PRICE);
        }

        vm.prank(alice);
        vm.expectRevert(MineGameEconomy.RoomCapacityExceeded.selector);
        economy.buyMiner(1, MINER_PRICE);

        vm.prank(alice);
        economy.buyRoom(ROOM_PRICE);
        assertEq(economy.roomsOf(alice), 2);

        vm.prank(alice);
        economy.buyMiner(1, MINER_PRICE);
        assertEq(economy.playerMinerCount(alice), 6);
    }

    function testGridCapacityAppliesSeparatelyFromSlotCapacity() external {
        vm.prank(owner);
        economy.configureTier(2, MINER_PRICE, 500, uint64(GRID_CAPACITY + 1), 5_000, "ipfs://too-large");

        vm.prank(alice);
        vm.expectRevert(MineGameEconomy.GridCapacityExceeded.selector);
        economy.buyMiner(2, MINER_PRICE);
    }

    function testCallerMaximumPriceProtectsMinerAndRoomPurchases() external {
        vm.prank(owner);
        economy.setTierPrice(1, 1_500 ether);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(MineGameEconomy.PriceExceedsMax.selector, 1_500 ether, MINER_PRICE));
        economy.buyMiner(1, MINER_PRICE);

        vm.prank(owner);
        economy.setRoomPrice(3_000 ether);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(MineGameEconomy.PriceExceedsMax.selector, 3_000 ether, ROOM_PRICE));
        economy.buyRoom(ROOM_PRICE);
    }

    function testSingleMinerEarnsRealMinegameFromCappedReserve() external {
        vm.prank(alice);
        economy.buyMiner(1, MINER_PRICE);
        economy.fundRewards(1_000 ether);
        vm.warp(block.timestamp + 100);

        assertEq(economy.pendingRewards(alice), 100 ether);
        uint256 balanceBefore = token.balanceOf(alice);
        vm.prank(alice);
        uint256 claimed = economy.claimMinegame();

        assertEq(claimed, 100 ether);
        assertEq(token.balanceOf(alice), balanceBefore + 100 ether);
        assertEq(economy.pendingMinegame(alice), 0);
        assertEq(economy.rewardLiability(), 0);
        assertTrue(economy.isSolvent());
    }

    function testRewardsAreProportionalToActiveHashrate() external {
        vm.prank(owner);
        economy.configureTier(2, MINER_PRICE, 300, 1_000, 5_000, "ipfs://tier-two");
        vm.prank(alice);
        economy.buyMiner(1, MINER_PRICE);
        vm.prank(bob);
        economy.buyMiner(2, MINER_PRICE);
        economy.fundRewards(1_000 ether);
        vm.warp(block.timestamp + 100);

        assertEq(economy.pendingRewards(alice), 25 ether);
        assertEq(economy.pendingRewards(bob), 75 ether);
    }

    function testRewardReserveCapsEmissionAndReportsRunway() external {
        vm.prank(alice);
        economy.buyMiner(1, MINER_PRICE);
        vm.warp(block.timestamp + 1_000);

        assertEq(economy.pendingRewards(alice), 350 ether);
        assertEq(economy.rewardRunwaySeconds(), 350);
        vm.prank(alice);
        assertEq(economy.claimMinegame(), 350 ether);
        assertEq(economy.rewardReserve(), 0);
    }

    function testListingStopsMiningAndMarketplaceTransfersOwnership() external {
        vm.prank(alice);
        uint256 minerId = economy.buyMiner(1, MINER_PRICE);
        economy.fundRewards(1_000 ether);
        vm.warp(block.timestamp + 100);

        vm.prank(alice);
        economy.listMiner(minerId, 500 ether);
        assertEq(economy.playerActiveHashrate(alice), 0);
        assertEq(economy.pendingRewards(alice), 100 ether);

        vm.warp(block.timestamp + 100);
        assertEq(economy.pendingRewards(alice), 100 ether);
        uint256 aliceBefore = token.balanceOf(alice);
        vm.prank(bob);
        economy.buyListedMiner(minerId, 500 ether);

        assertEq(token.balanceOf(alice), aliceBefore + 475 ether);
        assertEq(economy.rewardReserve(), 1_275 ether);
        assertEq(economy.playerMinerCount(alice), 0);
        assertEq(economy.playerMinerCount(bob), 1);
        assertEq(economy.playerActiveHashrate(bob), TIER_ONE_HASHRATE);
        (address minerOwner,,,,) = economy.miners(minerId);
        assertEq(minerOwner, bob);
    }

    function testListingPurchaseHasCallerPriceBound() external {
        vm.prank(alice);
        uint256 minerId = economy.buyMiner(1, MINER_PRICE);
        vm.prank(alice);
        economy.listMiner(minerId, 500 ether);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(MineGameEconomy.PriceExceedsMax.selector, 500 ether, 499 ether));
        economy.buyListedMiner(minerId, 499 ether);
    }

    function testProtocolSellbackUsesImmutableBasisAndMinimumPayout() external {
        vm.prank(alice);
        uint256 minerId = economy.buyMiner(1, MINER_PRICE);
        vm.prank(owner);
        economy.setTierPrice(1, 5_000 ether);
        vm.warp(block.timestamp + economy.SELLBACK_COOLDOWN());

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(MineGameEconomy.PayoutBelowMinimum.selector, 500 ether, 501 ether));
        economy.sellMinerBack(minerId, 501 ether);

        uint256 balanceBefore = token.balanceOf(alice);
        vm.prank(alice);
        economy.sellMinerBack(minerId, 500 ether);
        assertEq(token.balanceOf(alice), balanceBefore + 500 ether);
        assertEq(economy.buybackReserve(), 50 ether);
        assertEq(economy.playerMinerCount(alice), 0);
        assertEq(economy.playerActiveHashrate(alice), 0);
        (address deletedMinerOwner,,,,) = economy.miners(minerId);
        assertEq(deletedMinerOwner, address(0));
        assertTrue(economy.isSolvent());
    }

    function testSellbackCooldownResetsAfterMarketplaceSale() external {
        vm.prank(alice);
        uint256 minerId = economy.buyMiner(1, MINER_PRICE);
        vm.warp(block.timestamp + economy.SELLBACK_COOLDOWN());
        vm.prank(alice);
        economy.listMiner(minerId, 500 ether);
        vm.prank(bob);
        economy.buyListedMiner(minerId, 500 ether);

        uint256 availableAt = block.timestamp + economy.SELLBACK_COOLDOWN();
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(MineGameEconomy.SellbackCooldownActive.selector, availableAt));
        economy.sellMinerBack(minerId, 0);
    }

    function testMarketplaceDiscountReducesProtocolBuybackBasis() external {
        vm.prank(alice);
        uint256 minerId = economy.buyMiner(1, MINER_PRICE);
        vm.prank(alice);
        economy.listMiner(minerId, 100 ether);
        vm.prank(bob);
        economy.buyListedMiner(minerId, 100 ether);

        (,, uint256 buybackBasis,,) = economy.miners(minerId);
        assertEq(buybackBasis, 100 ether);
        vm.warp(block.timestamp + economy.SELLBACK_COOLDOWN());

        uint256 balanceBefore = token.balanceOf(bob);
        vm.prank(bob);
        economy.sellMinerBack(minerId, 50 ether);
        assertEq(token.balanceOf(bob), balanceBefore + 50 ether);
    }

    function testMarketplacePremiumDoesNotIncreaseProtocolBuybackBasis() external {
        vm.prank(alice);
        uint256 minerId = economy.buyMiner(1, MINER_PRICE);
        vm.prank(alice);
        economy.listMiner(minerId, 2_000 ether);
        vm.prank(bob);
        economy.buyListedMiner(minerId, 2_000 ether);

        (,, uint256 buybackBasis,,) = economy.miners(minerId);
        assertEq(buybackBasis, MINER_PRICE);
    }

    function testClaimsRemainAvailableWhilePausedButEmissionStops() external {
        vm.prank(alice);
        economy.buyMiner(1, MINER_PRICE);
        economy.fundRewards(1_000 ether);
        vm.warp(block.timestamp + 100);
        vm.prank(owner);
        economy.pause();
        vm.warp(block.timestamp + 100);

        vm.prank(alice);
        assertEq(economy.claimMinegame(), 100 ether);
        vm.prank(owner);
        economy.unpause();
        vm.warp(block.timestamp + 100);
        assertEq(economy.pendingRewards(alice), 100 ether);
    }

    function testDeploymentStartsPausedAndOwnerMustExplicitlyUnpause() external {
        MineGameEconomy fresh =
            new MineGameEconomy(owner, token, treasury, ROOM_PRICE, REWARD_RATE, MAX_REWARD_RATE, GRID_CAPACITY);
        assertTrue(fresh.paused());

        vm.prank(alice);
        vm.expectRevert();
        fresh.buyRoom(ROOM_PRICE);

        vm.prank(owner);
        fresh.unpause();
        assertFalse(fresh.paused());
    }

    function testConstructorRejectsEOAOwnerAndTreasury() external {
        vm.expectRevert(MineGameEconomy.InvalidContractWallet.selector);
        new MineGameEconomy(alice, token, treasury, ROOM_PRICE, REWARD_RATE, MAX_REWARD_RATE, GRID_CAPACITY);

        vm.expectRevert(MineGameEconomy.InvalidContractWallet.selector);
        new MineGameEconomy(owner, token, bob, ROOM_PRICE, REWARD_RATE, MAX_REWARD_RATE, GRID_CAPACITY);

        vm.expectRevert(MineGameEconomy.InvalidContractWallet.selector);
        new MineGameEconomy(owner, token, address(token), ROOM_PRICE, REWARD_RATE, MAX_REWARD_RATE, GRID_CAPACITY);
    }

    function testRoomCountCannotExceedTwenty() external {
        for (uint256 i = 1; i < economy.MAX_ROOMS(); ++i) {
            vm.prank(alice);
            economy.buyRoom(ROOM_PRICE);
        }
        assertEq(economy.roomsOf(alice), economy.MAX_ROOMS());

        vm.prank(alice);
        vm.expectRevert(MineGameEconomy.MaximumRoomsReached.selector);
        economy.buyRoom(ROOM_PRICE);
    }

    function testRewardRateChangeDoesNotRepriceElapsedTime() external {
        vm.prank(alice);
        economy.buyMiner(1, MINER_PRICE);
        economy.fundRewards(1_000 ether);
        vm.warp(block.timestamp + 100);
        vm.prank(owner);
        economy.setRewardRate(2 ether);
        vm.warp(block.timestamp + 100);

        assertEq(economy.pendingRewards(alice), 300 ether);
    }

    function testRewardsDoNotBackpayTimeBeforeFirstMiner() external {
        economy.fundRewards(1_000 ether);
        vm.warp(block.timestamp + 100);
        vm.prank(alice);
        economy.buyMiner(1, MINER_PRICE);
        vm.warp(block.timestamp + 100);

        assertEq(economy.pendingRewards(alice), 100 ether);
    }

    function testSellbackAndListingCancellationRemainAvailableWhilePaused() external {
        vm.prank(alice);
        uint256 sellbackMinerId = economy.buyMiner(1, MINER_PRICE);
        vm.prank(alice);
        uint256 listedMinerId = economy.buyMiner(1, MINER_PRICE);
        vm.prank(alice);
        economy.listMiner(listedMinerId, 500 ether);
        vm.warp(block.timestamp + economy.SELLBACK_COOLDOWN());
        vm.prank(owner);
        economy.pause();

        vm.prank(alice);
        economy.cancelListing(listedMinerId);
        vm.prank(alice);
        economy.sellMinerBack(sellbackMinerId, 500 ether);

        assertEq(economy.playerMinerCount(alice), 1);
        assertEq(economy.playerActiveHashrate(alice), TIER_ONE_HASHRATE);
    }

    function testFeeOnTransferTokenPurchaseIsRejected() external {
        FeeOnTransferMineGame feeToken = new FeeOnTransferMineGame();
        MineGameEconomy feeEconomy =
            new MineGameEconomy(owner, feeToken, treasury, ROOM_PRICE, REWARD_RATE, MAX_REWARD_RATE, GRID_CAPACITY);
        vm.prank(owner);
        feeEconomy.configureTier(1, MINER_PRICE, 100, 1_000, 5_000, "ipfs://tier-one");
        vm.prank(owner);
        feeEconomy.unpause();
        feeToken.transfer(alice, 2_000 ether);
        vm.prank(alice);
        feeToken.approve(address(feeEconomy), type(uint256).max);

        vm.prank(alice);
        vm.expectRevert(MineGameEconomy.UnsupportedTransferBehavior.selector);
        feeEconomy.buyMiner(1, MINER_PRICE);
        assertEq(feeEconomy.playerMinerCount(alice), 0);
    }

    function testReentrantTokenCallbackIsBlocked() external {
        ReentrantEconomyMineGame reentrantToken = new ReentrantEconomyMineGame();
        MineGameEconomy reentrantEconomy = new MineGameEconomy(
            owner, reentrantToken, treasury, ROOM_PRICE, REWARD_RATE, MAX_REWARD_RATE, GRID_CAPACITY
        );
        vm.startPrank(owner);
        reentrantEconomy.configureTier(1, MINER_PRICE, 100, 1_000, 5_000, "ipfs://tier-one");
        reentrantEconomy.unpause();
        vm.stopPrank();
        reentrantToken.transfer(alice, MINER_PRICE);
        reentrantToken.setTarget(address(reentrantEconomy));
        vm.prank(alice);
        reentrantToken.approve(address(reentrantEconomy), MINER_PRICE);

        vm.prank(alice);
        reentrantEconomy.buyMiner(1, MINER_PRICE);

        assertTrue(reentrantToken.callbackAttempted());
        assertTrue(reentrantToken.callbackBlocked());
        assertEq(reentrantEconomy.playerMinerCount(alice), 1);
    }

    function testOwnerConfigurationBounds() external {
        uint256 excessiveMinerPrice = economy.MAX_MINER_PRICE() + 1;
        vm.startPrank(owner);
        vm.expectRevert(MineGameEconomy.InvalidConfiguration.selector);
        economy.setRewardRate(MAX_REWARD_RATE + 1);
        vm.expectRevert(MineGameEconomy.InvalidConfiguration.selector);
        economy.setRoomPrice(0);
        vm.expectRevert(MineGameEconomy.InvalidConfiguration.selector);
        economy.setTierPrice(1, excessiveMinerPrice);
        vm.stopPrank();
    }

    function testTierCannotDisableSellbackWithZeroBuybackBps() external {
        vm.prank(owner);
        vm.expectRevert(MineGameEconomy.InvalidConfiguration.selector);
        economy.configureTier(2, MINER_PRICE, 100, 1_000, 0, "ipfs://zero-buyback");
    }

    function testSellbackCannotDestroyMinerForRoundedZeroPayout() external {
        vm.prank(owner);
        economy.configureTier(2, 1, 100, 1_000, 1, "ipfs://dust-buyback");
        vm.prank(alice);
        uint256 minerId = economy.buyMiner(2, 1);
        vm.warp(block.timestamp + economy.SELLBACK_COOLDOWN());

        vm.prank(alice);
        vm.expectRevert(MineGameEconomy.ZeroPayout.selector);
        economy.sellMinerBack(minerId, 0);
        (address minerOwner,,,,) = economy.miners(minerId);
        assertEq(minerOwner, alice);
    }

    function testRewardAccountingConservesAcrossRepeatedCheckpointsAndBothClaims() external {
        vm.prank(owner);
        economy.configureTier(2, 2_000 ether, 250, 2_000, 5_000, "ipfs://tier-two");
        vm.prank(alice);
        economy.buyMiner(1, MINER_PRICE);
        vm.prank(bob);
        economy.buyMiner(2, 2_000 ether);

        for (uint256 round; round < 6; ++round) {
            vm.warp(block.timestamp + 1 days);
            economy.checkpointRewards();
            assertLe(
                economy.pendingRewards(alice) + economy.pendingRewards(bob),
                economy.rewardLiability(),
                "player credits exceed recorded liability"
            );
        }

        vm.prank(alice);
        economy.claimMinegame();
        vm.prank(bob);
        economy.claimMinegame();
        assertEq(economy.rewardLiability(), 0);
    }

    function testLastClaimStillWorksAfterEmissionStops() external {
        vm.prank(owner);
        economy.configureTier(2, 2_000 ether, 250, 2_000, 5_000, "ipfs://tier-two");
        vm.prank(alice);
        economy.buyMiner(1, MINER_PRICE);
        vm.prank(bob);
        economy.buyMiner(2, 2_000 ether);

        for (uint256 round; round < 6; ++round) {
            vm.warp(block.timestamp + 1 days);
            economy.checkpointRewards();
        }
        vm.prank(alice);
        economy.claimMinegame();
        vm.startPrank(owner);
        economy.setRewardRate(0);
        economy.pause();
        vm.stopPrank();

        vm.warp(block.timestamp + 3650 days);
        uint256 expected = economy.pendingRewards(bob);
        vm.prank(bob);
        assertEq(economy.claimMinegame(), expected);
        assertEq(economy.rewardLiability(), 0);
    }

    function testFuzzPlayerCreditsNeverExceedLiability(uint8 rawRounds) external {
        uint256 rounds = bound(uint256(rawRounds), 2, 200);
        vm.prank(owner);
        economy.configureTier(2, 2_000 ether, 250, 2_000, 5_000, "ipfs://tier-two");
        vm.prank(alice);
        economy.buyMiner(1, MINER_PRICE);
        vm.prank(bob);
        economy.buyMiner(2, 2_000 ether);

        for (uint256 i; i < rounds; ++i) {
            vm.warp(block.timestamp + 1 days);
            economy.checkpointRewards();
        }
        assertLe(economy.pendingRewards(alice) + economy.pendingRewards(bob), economy.rewardLiability());
    }

    function testOwnershipCannotBeRenounced() external {
        vm.prank(owner);
        vm.expectRevert(MineGameEconomy.OwnershipRenunciationDisabled.selector);
        economy.renounceOwnership();
        assertEq(economy.owner(), owner);
    }

    function testFuzzPurchaseAllocationAlwaysBalances(uint128 rawPrice) external {
        uint256 price = bound(uint256(rawPrice), 1 ether, 100_000_000 ether);
        vm.prank(owner);
        economy.setTierPrice(1, price);
        token.transfer(alice, price);

        uint256 treasuryBefore = token.balanceOf(treasury);
        vm.prank(alice);
        economy.buyMiner(1, price);

        uint256 rewardAmount = price * 3_500 / 10_000;
        uint256 buybackAmount = price * 5_500 / 10_000;
        uint256 treasuryAmount = price - rewardAmount - buybackAmount;
        assertEq(economy.rewardReserve(), rewardAmount);
        assertEq(economy.buybackReserve(), buybackAmount);
        assertEq(token.balanceOf(treasury) - treasuryBefore, treasuryAmount);
        assertEq(economy.accountedTokenBalance(), token.balanceOf(address(economy)));
    }
}

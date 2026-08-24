// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {MineGameEconomy} from "../src/MineGameEconomy.sol";
import {ContractWallet, MockMineGame} from "./MockMineGame.sol";

contract MineGameEconomyHandler is Test {
    MineGameEconomy internal immutable economy;
    MockMineGame internal immutable token;
    address internal immutable owner;
    address[4] internal actors;

    constructor(MineGameEconomy economy_, MockMineGame token_, address owner_, address[4] memory actors_) {
        economy = economy_;
        token = token_;
        owner = owner_;
        actors = actors_;
    }

    function buyMiner(uint256 actorSeed, uint256 tierSeed) external {
        address actor = actors[actorSeed % actors.length];
        uint256 tierId = (tierSeed % 2) + 1;
        (uint256 price,, uint64 gridDraw,,,) = economy.tiers(tierId);
        if (token.balanceOf(actor) < price) return;
        if (economy.playerMinerCount(actor) >= economy.roomsOf(actor) * economy.ROOM_CAPACITY()) return;
        if (economy.playerGridDraw(actor) + gridDraw > economy.roomsOf(actor) * economy.gridCapacityPerRoom()) return;
        vm.prank(actor);
        economy.buyMiner(tierId, price);
    }

    function buyRoom(uint256 actorSeed) external {
        address actor = actors[actorSeed % actors.length];
        uint256 price = economy.roomPrice();
        if (token.balanceOf(actor) < price || economy.roomsOf(actor) >= economy.MAX_ROOMS()) return;
        vm.prank(actor);
        economy.buyRoom(price);
    }

    function listMiner(uint256 actorSeed, uint256 minerSeed, uint96 rawPrice) external {
        address actor = actors[actorSeed % actors.length];
        uint256[] memory ids = economy.ownedMinerIds(actor);
        if (ids.length == 0) return;
        uint256 minerId = ids[minerSeed % ids.length];
        (,,,, bool listed) = economy.miners(minerId);
        if (listed) return;
        uint256 price = bound(uint256(rawPrice), 1 ether, 10_000 ether);
        vm.prank(actor);
        economy.listMiner(minerId, price);
    }

    function cancelListing(uint256 actorSeed, uint256 minerSeed) external {
        address actor = actors[actorSeed % actors.length];
        uint256[] memory ids = economy.ownedMinerIds(actor);
        if (ids.length == 0) return;
        uint256 minerId = ids[minerSeed % ids.length];
        (address minerOwner, uint256 tierId,,, bool listed) = economy.miners(minerId);
        if (!listed || minerOwner != actor) return;
        (,, uint64 gridDraw,,,) = economy.tiers(tierId);
        if (economy.playerGridDraw(actor) + gridDraw > economy.roomsOf(actor) * economy.gridCapacityPerRoom()) return;
        vm.prank(actor);
        economy.cancelListing(minerId);
    }

    function buyListing(uint256 buyerSeed, uint256 sellerSeed, uint256 minerSeed) external {
        address buyer = actors[buyerSeed % actors.length];
        address seller = actors[sellerSeed % actors.length];
        if (buyer == seller) return;
        uint256[] memory ids = economy.ownedMinerIds(seller);
        if (ids.length == 0) return;
        uint256 minerId = ids[minerSeed % ids.length];
        (address minerOwner, uint256 tierId,,, bool listed) = economy.miners(minerId);
        if (!listed || minerOwner != seller) return;
        (, uint256 price) = economy.listings(minerId);
        (,, uint64 gridDraw,,,) = economy.tiers(tierId);
        if (token.balanceOf(buyer) < price) return;
        if (economy.playerMinerCount(buyer) >= economy.roomsOf(buyer) * economy.ROOM_CAPACITY()) return;
        if (economy.playerGridDraw(buyer) + gridDraw > economy.roomsOf(buyer) * economy.gridCapacityPerRoom()) return;
        vm.prank(buyer);
        economy.buyListedMiner(minerId, price);
    }

    function sellBack(uint256 actorSeed, uint256 minerSeed) external {
        address actor = actors[actorSeed % actors.length];
        uint256[] memory ids = economy.ownedMinerIds(actor);
        if (ids.length == 0) return;
        uint256 minerId = ids[minerSeed % ids.length];
        (address minerOwner, uint256 tierId, uint256 basis, uint64 acquiredAt, bool listed) = economy.miners(minerId);
        if (listed || minerOwner != actor || block.timestamp < uint256(acquiredAt) + economy.SELLBACK_COOLDOWN()) {
            return;
        }
        (,,, uint16 buybackBps,,) = economy.tiers(tierId);
        uint256 payout = basis * buybackBps / economy.BPS();
        if (economy.buybackReserve() < payout) return;
        vm.prank(actor);
        economy.sellMinerBack(minerId, payout);
    }

    function claim(uint256 actorSeed) external {
        address actor = actors[actorSeed % actors.length];
        if (economy.pendingRewards(actor) == 0) return;
        vm.prank(actor);
        economy.claimMinegame();
    }

    function warp(uint32 rawElapsed) external {
        vm.warp(block.timestamp + bound(uint256(rawElapsed), 1, 3 days));
    }
}

contract MineGameEconomyInvariantTest is StdInvariant, Test {
    MockMineGame internal token;
    MineGameEconomy internal economy;
    MineGameEconomyHandler internal handler;
    address internal owner;
    address internal treasury;
    address[4] internal actors;

    function setUp() external {
        token = new MockMineGame();
        owner = address(new ContractWallet());
        treasury = address(new ContractWallet());
        economy = new MineGameEconomy(owner, token, treasury, 2_000 ether, 1 ether, 10 ether, 20_000);
        vm.startPrank(owner);
        economy.configureTier(1, 1_000 ether, 100, 1_000, 5_000, "ipfs://tier-one");
        economy.configureTier(2, 2_000 ether, 250, 2_000, 5_000, "ipfs://tier-two");
        economy.unpause();
        vm.stopPrank();

        actors = [makeAddr("alice"), makeAddr("bob"), makeAddr("carol"), makeAddr("dave")];
        for (uint256 i; i < actors.length; ++i) {
            token.transfer(actors[i], 1_000_000 ether);
            vm.prank(actors[i]);
            token.approve(address(economy), type(uint256).max);
        }
        token.approve(address(economy), type(uint256).max);
        economy.fundRewards(10_000_000 ether);
        economy.fundBuybacks(10_000_000 ether);

        handler = new MineGameEconomyHandler(economy, token, owner, actors);
        targetContract(address(handler));
    }

    function invariantAccountedReservesAreAlwaysSolvent() external view {
        assertGe(token.balanceOf(address(economy)), economy.accountedTokenBalance());
        assertTrue(economy.isSolvent());
    }

    function invariantGlobalHashrateEqualsActorHashrateSum() external view {
        uint256 actorHashrate;
        for (uint256 i; i < actors.length; ++i) {
            actorHashrate += economy.playerActiveHashrate(actors[i]);
        }
        assertEq(economy.totalActiveHashrate(), actorHashrate);
    }

    function invariantOwnershipCapacityGridAndHashrateStayConsistent() external view {
        for (uint256 i; i < actors.length; ++i) {
            address actor = actors[i];
            uint256[] memory ids = economy.ownedMinerIds(actor);
            assertEq(ids.length, economy.playerMinerCount(actor));
            assertLe(ids.length, economy.roomsOf(actor) * economy.ROOM_CAPACITY());
            assertLe(economy.playerGridDraw(actor), economy.roomsOf(actor) * economy.gridCapacityPerRoom());

            uint256 expectedActiveHashrate;
            uint256 expectedGridDraw;
            for (uint256 j; j < ids.length; ++j) {
                (address minerOwner, uint256 tierId,,, bool listed) = economy.miners(ids[j]);
                assertEq(minerOwner, actor);
                (, uint128 baseHashrate, uint64 gridDraw,,,) = economy.tiers(tierId);
                if (!listed) {
                    expectedActiveHashrate += baseHashrate;
                    expectedGridDraw += gridDraw;
                }
            }
            assertEq(economy.playerActiveHashrate(actor), expectedActiveHashrate);
            assertEq(economy.playerGridDraw(actor), expectedGridDraw);
        }
    }
}

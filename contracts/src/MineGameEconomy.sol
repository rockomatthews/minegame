// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title MineGameEconomy
/// @notice MINEGAME-only virtual miner economy with capped emissions, rooms,
/// marketplace resale, and reserve-backed protocol sellback.
/// @dev Hashrate, grid draw, condition, and POWER-like values are metrics only.
/// The only economic asset accepted or paid by this contract is MINEGAME.
contract MineGameEconomy is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;
    uint256 public constant ACC_REWARD_PRECISION = 1e36;
    uint256 public constant ROOM_CAPACITY = 5;
    uint256 public constant MAX_ROOMS = 20;
    uint256 public constant SELLBACK_COOLDOWN = 7 days;
    uint256 public constant MAX_MINER_PRICE = 100_000_000 ether;
    uint256 public constant MAX_ROOM_PRICE = 10_000_000 ether;
    uint256 public constant MAX_LISTING_PRICE = 100_000_000 ether;

    uint256 public constant MINER_REWARD_SHARE_BPS = 3_500;
    uint256 public constant MINER_BUYBACK_SHARE_BPS = 5_500;
    uint256 public constant MINER_TREASURY_SHARE_BPS = 1_000;
    uint256 public constant ROOM_REWARD_SHARE_BPS = 8_000;
    uint256 public constant ROOM_TREASURY_SHARE_BPS = 2_000;
    uint256 public constant MARKETPLACE_FEE_BPS = 500;
    uint256 public constant MAX_BUYBACK_BPS = 5_000;

    IERC20 public immutable minegame;
    address public immutable treasury;
    uint256 public immutable maxRewardRatePerSecond;
    uint256 public immutable gridCapacityPerRoom;

    uint256 public roomPrice;
    uint256 public rewardRatePerSecond;
    uint256 public rewardReserve;
    uint256 public buybackReserve;
    uint256 public rewardLiability;
    uint256 public totalActiveHashrate;
    uint256 public accRewardPerHash;
    uint64 public lastRewardTime;
    uint256 public nextTierId = 1;
    uint256 public nextMinerId = 1;

    struct Tier {
        uint256 price;
        uint128 baseHashrate;
        uint64 gridDraw;
        uint16 buybackBps;
        bool active;
        string metadataURI;
    }

    struct Miner {
        address owner;
        uint256 tierId;
        uint256 buybackBasis;
        uint64 acquiredAt;
        bool listed;
    }

    struct Listing {
        address seller;
        uint256 price;
    }

    mapping(uint256 tierId => Tier) public tiers;
    mapping(uint256 tierId => bool) public tierExists;
    mapping(uint256 minerId => Miner) public miners;
    mapping(uint256 minerId => Listing) public listings;
    mapping(address player => uint256) private _roomCount;
    mapping(address player => uint256) public playerMinerCount;
    mapping(address player => uint256) public playerActiveHashrate;
    mapping(address player => uint256) public playerGridDraw;
    mapping(address player => uint256) public pendingMinegame;
    mapping(address player => uint256) public rewardPerHashPaid;
    mapping(address player => uint256[]) private _ownedMinerIds;
    mapping(uint256 minerId => uint256) private _ownedMinerIndexPlusOne;

    error ZeroAddress();
    error ZeroAmount();
    error InvalidContractWallet();
    error InvalidConfiguration();
    error InvalidTier();
    error TierInactive();
    error InvalidMiner();
    error NotMinerOwner();
    error PriceExceedsMax(uint256 currentPrice, uint256 maxPrice);
    error PayoutBelowMinimum(uint256 payout, uint256 minimumPayout);
    error RoomCapacityExceeded();
    error GridCapacityExceeded();
    error MaximumRoomsReached();
    error AlreadyListed();
    error NotListed();
    error SelfPurchase();
    error SellbackCooldownActive(uint256 availableAt);
    error InsufficientBuybackReserve(uint256 available, uint256 required);
    error NothingToClaim();
    error ZeroPayout();
    error UnsupportedTransferBehavior();
    error OwnershipRenunciationDisabled();

    event TierConfigured(
        uint256 indexed tierId,
        uint256 price,
        uint256 baseHashrate,
        uint256 gridDraw,
        uint256 buybackBps,
        string metadataURI
    );
    event TierPriceUpdated(uint256 indexed tierId, uint256 oldPrice, uint256 newPrice);
    event TierAvailabilityUpdated(uint256 indexed tierId, bool active);
    event MinerPurchased(address indexed player, uint256 indexed minerId, uint256 indexed tierId, uint256 price);
    event MinerListed(address indexed seller, uint256 indexed minerId, uint256 price);
    event MinerListingCancelled(address indexed seller, uint256 indexed minerId);
    event MinerMarketSale(
        address indexed seller, address indexed buyer, uint256 indexed minerId, uint256 price, uint256 fee
    );
    event MinerSoldBack(address indexed player, uint256 indexed minerId, uint256 payout);
    event RoomPurchased(address indexed player, uint256 roomCount, uint256 price);
    event RewardsFunded(address indexed funder, uint256 amount);
    event BuybacksFunded(address indexed funder, uint256 amount);
    event MinegameClaimed(address indexed player, uint256 amount);
    event RewardRateUpdated(uint256 oldRate, uint256 newRate);
    event RoomPriceUpdated(uint256 oldPrice, uint256 newPrice);

    constructor(
        address initialOwner,
        IERC20 minegameToken,
        address treasuryDestination,
        uint256 initialRoomPrice,
        uint256 initialRewardRatePerSecond,
        uint256 rewardRateCeiling,
        uint256 roomGridCapacity
    ) Ownable(initialOwner) {
        if (initialOwner == address(0) || address(minegameToken) == address(0) || treasuryDestination == address(0)) {
            revert ZeroAddress();
        }
        if (
            initialOwner.code.length == 0 || address(minegameToken).code.length == 0
                || treasuryDestination.code.length == 0 || treasuryDestination == address(this)
                || treasuryDestination == address(minegameToken)
        ) {
            revert InvalidContractWallet();
        }
        if (
            initialRoomPrice == 0 || initialRoomPrice > MAX_ROOM_PRICE || rewardRateCeiling == 0
                || initialRewardRatePerSecond > rewardRateCeiling || roomGridCapacity == 0
        ) {
            revert InvalidConfiguration();
        }

        minegame = minegameToken;
        treasury = treasuryDestination;
        roomPrice = initialRoomPrice;
        rewardRatePerSecond = initialRewardRatePerSecond;
        maxRewardRatePerSecond = rewardRateCeiling;
        gridCapacityPerRoom = roomGridCapacity;
        lastRewardTime = uint64(block.timestamp);
        _pause();
    }

    function configureTier(
        uint256 tierId,
        uint256 price,
        uint128 baseHashrate,
        uint64 gridDraw,
        uint16 buybackBps,
        string calldata metadataURI
    ) external onlyOwner returns (uint256 configuredTierId) {
        configuredTierId = tierId;
        if (configuredTierId == 0) {
            configuredTierId = nextTierId++;
        } else {
            if (tierExists[configuredTierId]) revert InvalidTier();
            if (configuredTierId >= nextTierId) nextTierId = configuredTierId + 1;
        }
        if (
            price == 0 || price > MAX_MINER_PRICE || baseHashrate == 0 || gridDraw == 0 || buybackBps == 0
                || buybackBps > MAX_BUYBACK_BPS || bytes(metadataURI).length == 0
        ) {
            revert InvalidConfiguration();
        }

        tiers[configuredTierId] = Tier({
            price: price,
            baseHashrate: baseHashrate,
            gridDraw: gridDraw,
            buybackBps: buybackBps,
            active: true,
            metadataURI: metadataURI
        });
        tierExists[configuredTierId] = true;
        emit TierConfigured(configuredTierId, price, baseHashrate, gridDraw, buybackBps, metadataURI);
    }

    function setTierPrice(uint256 tierId, uint256 newPrice) external onlyOwner {
        if (!tierExists[tierId]) revert InvalidTier();
        if (newPrice == 0 || newPrice > MAX_MINER_PRICE) revert InvalidConfiguration();
        uint256 oldPrice = tiers[tierId].price;
        tiers[tierId].price = newPrice;
        emit TierPriceUpdated(tierId, oldPrice, newPrice);
    }

    function setTierActive(uint256 tierId, bool active) external onlyOwner {
        if (!tierExists[tierId]) revert InvalidTier();
        tiers[tierId].active = active;
        emit TierAvailabilityUpdated(tierId, active);
    }

    function buyMiner(uint256 tierId, uint256 maxPrice) external nonReentrant whenNotPaused returns (uint256 minerId) {
        Tier storage tier = tiers[tierId];
        if (!tierExists[tierId]) revert InvalidTier();
        if (!tier.active) revert TierInactive();
        uint256 price = tier.price;
        if (price > maxPrice) revert PriceExceedsMax(price, maxPrice);
        _requireCapacity(msg.sender, tier.gridDraw);

        _updatePool();
        _accruePlayer(msg.sender);

        minerId = nextMinerId++;
        miners[minerId] = Miner({
            owner: msg.sender, tierId: tierId, buybackBasis: price, acquiredAt: uint64(block.timestamp), listed: false
        });
        _addOwnedMiner(msg.sender, minerId);
        playerMinerCount[msg.sender] += 1;
        _addActiveMetrics(msg.sender, tier.baseHashrate, tier.gridDraw);

        _collectExact(msg.sender, price);
        _allocateMinerPurchase(price);
        emit MinerPurchased(msg.sender, minerId, tierId, price);
    }

    function buyRoom(uint256 maxPrice) external nonReentrant whenNotPaused {
        uint256 price = roomPrice;
        if (price > maxPrice) revert PriceExceedsMax(price, maxPrice);
        uint256 currentRooms = roomsOf(msg.sender);
        if (currentRooms >= MAX_ROOMS) revert MaximumRoomsReached();

        _updatePool();
        _accruePlayer(msg.sender);
        _roomCount[msg.sender] = currentRooms + 1;

        _collectExact(msg.sender, price);
        uint256 rewardAmount = Math.mulDiv(price, ROOM_REWARD_SHARE_BPS, BPS);
        uint256 treasuryAmount = price - rewardAmount;
        rewardReserve += rewardAmount;
        _sendExact(treasury, treasuryAmount);
        emit RoomPurchased(msg.sender, currentRooms + 1, price);
    }

    function listMiner(uint256 minerId, uint256 price) external nonReentrant whenNotPaused {
        Miner storage miner = _ownedMiner(msg.sender, minerId);
        if (miner.listed) revert AlreadyListed();
        if (price == 0 || price > MAX_LISTING_PRICE) revert InvalidConfiguration();

        Tier storage tier = tiers[miner.tierId];
        _updatePool();
        _accruePlayer(msg.sender);
        miner.listed = true;
        listings[minerId] = Listing({seller: msg.sender, price: price});
        _removeActiveMetrics(msg.sender, tier.baseHashrate, tier.gridDraw);
        emit MinerListed(msg.sender, minerId, price);
    }

    function cancelListing(uint256 minerId) external nonReentrant {
        Miner storage miner = _ownedMiner(msg.sender, minerId);
        if (!miner.listed) revert NotListed();
        Tier storage tier = tiers[miner.tierId];
        _requireGridCapacity(msg.sender, tier.gridDraw);

        _updatePool();
        _accruePlayer(msg.sender);
        miner.listed = false;
        delete listings[minerId];
        _addActiveMetrics(msg.sender, tier.baseHashrate, tier.gridDraw);
        emit MinerListingCancelled(msg.sender, minerId);
    }

    function buyListedMiner(uint256 minerId, uint256 maxPrice) external nonReentrant whenNotPaused {
        Miner storage miner = miners[minerId];
        if (miner.owner == address(0)) revert InvalidMiner();
        if (!miner.listed) revert NotListed();
        Listing memory listing = listings[minerId];
        if (listing.seller == msg.sender) revert SelfPurchase();
        if (listing.price > maxPrice) revert PriceExceedsMax(listing.price, maxPrice);

        Tier storage tier = tiers[miner.tierId];
        _requireCapacity(msg.sender, tier.gridDraw);
        _updatePool();
        _accruePlayer(listing.seller);
        _accruePlayer(msg.sender);

        _removeOwnedMiner(listing.seller, minerId);
        _addOwnedMiner(msg.sender, minerId);
        playerMinerCount[listing.seller] -= 1;
        playerMinerCount[msg.sender] += 1;
        miner.owner = msg.sender;
        if (listing.price < miner.buybackBasis) miner.buybackBasis = listing.price;
        miner.acquiredAt = uint64(block.timestamp);
        miner.listed = false;
        delete listings[minerId];
        _addActiveMetrics(msg.sender, tier.baseHashrate, tier.gridDraw);

        _collectExact(msg.sender, listing.price);
        uint256 fee = Math.mulDiv(listing.price, MARKETPLACE_FEE_BPS, BPS);
        uint256 sellerProceeds = listing.price - fee;
        rewardReserve += fee;
        _sendExact(listing.seller, sellerProceeds);
        emit MinerMarketSale(listing.seller, msg.sender, minerId, listing.price, fee);
    }

    function sellMinerBack(uint256 minerId, uint256 minimumPayout) external nonReentrant {
        Miner storage miner = _ownedMiner(msg.sender, minerId);
        if (miner.listed) revert AlreadyListed();
        uint256 availableAt = uint256(miner.acquiredAt) + SELLBACK_COOLDOWN;
        if (block.timestamp < availableAt) revert SellbackCooldownActive(availableAt);

        Tier storage tier = tiers[miner.tierId];
        uint256 payout = Math.mulDiv(miner.buybackBasis, tier.buybackBps, BPS);
        if (payout == 0) revert ZeroPayout();
        if (payout < minimumPayout) revert PayoutBelowMinimum(payout, minimumPayout);
        if (buybackReserve < payout) revert InsufficientBuybackReserve(buybackReserve, payout);

        _updatePool();
        _accruePlayer(msg.sender);
        _removeActiveMetrics(msg.sender, tier.baseHashrate, tier.gridDraw);
        _removeOwnedMiner(msg.sender, minerId);
        playerMinerCount[msg.sender] -= 1;
        delete miners[minerId];
        buybackReserve -= payout;

        _sendExact(msg.sender, payout);
        emit MinerSoldBack(msg.sender, minerId, payout);
    }

    function claimMinegame() external nonReentrant returns (uint256 amount) {
        _updatePool();
        _accruePlayer(msg.sender);
        amount = pendingMinegame[msg.sender];
        if (amount == 0) revert NothingToClaim();

        pendingMinegame[msg.sender] = 0;
        rewardLiability -= amount;
        _sendExact(msg.sender, amount);
        emit MinegameClaimed(msg.sender, amount);
    }

    function fundRewards(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        _updatePool();
        _collectExact(msg.sender, amount);
        rewardReserve += amount;
        emit RewardsFunded(msg.sender, amount);
    }

    function fundBuybacks(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        _collectExact(msg.sender, amount);
        buybackReserve += amount;
        emit BuybacksFunded(msg.sender, amount);
    }

    function checkpointRewards() external {
        _updatePool();
    }

    function setRewardRate(uint256 newRate) external onlyOwner {
        if (newRate > maxRewardRatePerSecond) revert InvalidConfiguration();
        _updatePool();
        uint256 oldRate = rewardRatePerSecond;
        rewardRatePerSecond = newRate;
        emit RewardRateUpdated(oldRate, newRate);
    }

    function setRoomPrice(uint256 newPrice) external onlyOwner {
        if (newPrice == 0 || newPrice > MAX_ROOM_PRICE) revert InvalidConfiguration();
        uint256 oldPrice = roomPrice;
        roomPrice = newPrice;
        emit RoomPriceUpdated(oldPrice, newPrice);
    }

    function pause() external onlyOwner {
        _updatePool();
        _pause();
    }

    function unpause() external onlyOwner {
        lastRewardTime = uint64(block.timestamp);
        _unpause();
    }

    function renounceOwnership() public view override onlyOwner {
        revert OwnershipRenunciationDisabled();
    }

    function roomsOf(address player) public view returns (uint256) {
        uint256 storedRooms = _roomCount[player];
        return storedRooms == 0 ? 1 : storedRooms;
    }

    function ownedMinerIds(address player) external view returns (uint256[] memory) {
        return _ownedMinerIds[player];
    }

    function pendingRewards(address player) external view returns (uint256) {
        uint256 simulatedAcc = accRewardPerHash;
        if (!paused() && block.timestamp > lastRewardTime && totalActiveHashrate > 0 && rewardReserve > 0) {
            uint256 requested = (block.timestamp - uint256(lastRewardTime)) * rewardRatePerSecond;
            uint256 available = requested < rewardReserve ? requested : rewardReserve;
            uint256 increment = Math.mulDiv(available, ACC_REWARD_PRECISION, totalActiveHashrate);
            simulatedAcc += increment;
        }

        uint256 paid = rewardPerHashPaid[player];
        uint256 newlyAccrued = simulatedAcc > paid
            ? Math.mulDiv(playerActiveHashrate[player], simulatedAcc - paid, ACC_REWARD_PRECISION)
            : 0;
        return pendingMinegame[player] + newlyAccrued;
    }

    function rewardRunwaySeconds() external view returns (uint256) {
        return rewardRatePerSecond == 0 ? type(uint256).max : rewardReserve / rewardRatePerSecond;
    }

    function accountedTokenBalance() public view returns (uint256) {
        return rewardReserve + buybackReserve + rewardLiability;
    }

    function isSolvent() external view returns (bool) {
        return minegame.balanceOf(address(this)) >= accountedTokenBalance();
    }

    function _allocateMinerPurchase(uint256 price) internal {
        uint256 rewardAmount = Math.mulDiv(price, MINER_REWARD_SHARE_BPS, BPS);
        uint256 buybackAmount = Math.mulDiv(price, MINER_BUYBACK_SHARE_BPS, BPS);
        uint256 treasuryAmount = price - rewardAmount - buybackAmount;
        rewardReserve += rewardAmount;
        buybackReserve += buybackAmount;
        _sendExact(treasury, treasuryAmount);
    }

    function _updatePool() internal {
        uint256 currentTime = block.timestamp;
        uint256 previousTime = lastRewardTime;
        if (currentTime <= previousTime) return;
        lastRewardTime = uint64(currentTime);
        if (paused() || totalActiveHashrate == 0 || rewardRatePerSecond == 0 || rewardReserve == 0) return;

        uint256 requested = (currentTime - previousTime) * rewardRatePerSecond;
        uint256 available = requested < rewardReserve ? requested : rewardReserve;
        uint256 increment = Math.mulDiv(available, ACC_REWARD_PRECISION, totalActiveHashrate);
        if (increment == 0) return;
        accRewardPerHash += increment;
        rewardReserve -= available;
        rewardLiability += available;
    }

    function _accruePlayer(address player) internal {
        uint256 paid = rewardPerHashPaid[player];
        uint256 current = accRewardPerHash;
        if (current > paid && playerActiveHashrate[player] > 0) {
            pendingMinegame[player] += Math.mulDiv(playerActiveHashrate[player], current - paid, ACC_REWARD_PRECISION);
        }
        rewardPerHashPaid[player] = current;
    }

    function _addActiveMetrics(address player, uint256 hashrate, uint256 gridDraw) internal {
        totalActiveHashrate += hashrate;
        playerActiveHashrate[player] += hashrate;
        playerGridDraw[player] += gridDraw;
        rewardPerHashPaid[player] = accRewardPerHash;
    }

    function _removeActiveMetrics(address player, uint256 hashrate, uint256 gridDraw) internal {
        totalActiveHashrate -= hashrate;
        playerActiveHashrate[player] -= hashrate;
        playerGridDraw[player] -= gridDraw;
        rewardPerHashPaid[player] = accRewardPerHash;
    }

    function _requireCapacity(address player, uint256 addedGridDraw) internal view {
        if (playerMinerCount[player] >= roomsOf(player) * ROOM_CAPACITY) revert RoomCapacityExceeded();
        _requireGridCapacity(player, addedGridDraw);
    }

    function _requireGridCapacity(address player, uint256 addedGridDraw) internal view {
        if (playerGridDraw[player] + addedGridDraw > roomsOf(player) * gridCapacityPerRoom) {
            revert GridCapacityExceeded();
        }
    }

    function _ownedMiner(address player, uint256 minerId) internal view returns (Miner storage miner) {
        miner = miners[minerId];
        if (miner.owner == address(0)) revert InvalidMiner();
        if (miner.owner != player) revert NotMinerOwner();
    }

    function _addOwnedMiner(address player, uint256 minerId) internal {
        _ownedMinerIds[player].push(minerId);
        _ownedMinerIndexPlusOne[minerId] = _ownedMinerIds[player].length;
    }

    function _removeOwnedMiner(address player, uint256 minerId) internal {
        uint256 indexPlusOne = _ownedMinerIndexPlusOne[minerId];
        if (indexPlusOne == 0) revert InvalidMiner();
        uint256 index = indexPlusOne - 1;
        uint256 lastIndex = _ownedMinerIds[player].length - 1;
        if (index != lastIndex) {
            uint256 lastMinerId = _ownedMinerIds[player][lastIndex];
            _ownedMinerIds[player][index] = lastMinerId;
            _ownedMinerIndexPlusOne[lastMinerId] = index + 1;
        }
        _ownedMinerIds[player].pop();
        delete _ownedMinerIndexPlusOne[minerId];
    }

    function _collectExact(address from, uint256 amount) internal {
        uint256 balanceBefore = minegame.balanceOf(address(this));
        minegame.safeTransferFrom(from, address(this), amount);
        if (minegame.balanceOf(address(this)) - balanceBefore != amount) revert UnsupportedTransferBehavior();
    }

    function _sendExact(address to, uint256 amount) internal {
        if (amount == 0) return;
        uint256 balanceBefore = minegame.balanceOf(to);
        minegame.safeTransfer(to, amount);
        if (minegame.balanceOf(to) - balanceBefore != amount) revert UnsupportedTransferBehavior();
    }
}

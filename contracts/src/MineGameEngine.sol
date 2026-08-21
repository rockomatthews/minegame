// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title MineGameEngine
/// @notice A non-custodial-exit staking game for a fixed-supply MINEGAME token.
/// @dev POWER is internal accounting and is intentionally not transferable. The
/// public MINEGAME B20 is created separately by o1 Launchpad on Base.
contract MineGameEngine is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;
    uint256 public constant POWER_DAY = 1 days;
    uint256 public constant AGE_BONUS_PERIOD = 365 days;
    uint256 public constant MAX_AGE_BONUS_BPS = 10_000;
    uint256 public constant OVERCLOCK_DURATION = 1 days;
    uint256 public constant OVERCLOCK_BONUS_BPS = 10_000;
    uint256 public constant MAX_PART_BONUS_BPS = 50_000;
    uint256 public constant MAX_EQUIPPED_PARTS = 8;
    uint256 public constant MAX_OVERCLOCK_PRICE = 10_000 ether;

    IERC20 public immutable minegame;
    address public immutable rewardsVault;

    uint256 public totalStaked;
    uint256 public overclockPrice;
    uint256 public nextPartId = 1;

    struct Position {
        uint256 staked;
        uint256 power;
        uint256 lifetimePower;
        uint64 weightedStart;
        uint64 lastAccrual;
        uint64 overclockUntil;
        uint32 partBonusBps;
        uint8 equippedCount;
    }

    struct Part {
        uint256 powerCost;
        uint32 boostBps;
        bool active;
        string metadataURI;
    }

    mapping(address player => Position) private _positions;
    mapping(uint256 partId => Part) public parts;
    mapping(uint256 partId => bool) public partExists;
    mapping(address player => mapping(uint256 partId => bool)) public ownsPart;
    mapping(address player => mapping(uint256 partId => bool)) public equippedPart;

    error ZeroAddress();
    error ZeroAmount();
    error InvalidRewardsVault();
    error InvalidOverclockPrice();
    error PriceExceedsMax(uint256 currentPrice, uint256 maxPrice);
    error OwnershipRenunciationDisabled();
    error InvalidPart();
    error InvalidPartBoost();
    error InsufficientStake();
    error InsufficientPower();
    error OverclockActive();
    error PartAlreadyOwned();
    error PartNotOwned();
    error PartAlreadyEquipped();
    error PartNotEquipped();
    error EquipmentLimitReached();
    error UnsupportedTransferBehavior();

    event Staked(address indexed player, uint256 amount, uint256 newStake, uint256 weightedStart);
    event Withdrawn(address indexed player, uint256 amount, uint256 remainingStake);
    event EmergencyWithdrawn(address indexed player, uint256 accountedAmount, uint256 payoutAmount);
    event PowerAccrued(address indexed player, uint256 amount, uint256 balance, uint256 lifetimePower);
    event OverclockActivated(address indexed player, uint256 price, uint256 activeUntil);
    event OverclockPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event PartConfigured(uint256 indexed partId, uint256 powerCost, uint256 boostBps, bool active, string metadataURI);
    event PartAvailabilityUpdated(uint256 indexed partId, bool active);
    event PartPurchased(address indexed player, uint256 indexed partId, uint256 powerCost);
    event PartEquipped(address indexed player, uint256 indexed partId, uint256 totalPartBonusBps);
    event PartUnequipped(address indexed player, uint256 indexed partId, uint256 totalPartBonusBps);

    constructor(address initialOwner, IERC20 minegameToken, address rewardDestination, uint256 initialOverclockPrice)
        Ownable(initialOwner)
    {
        if (initialOwner == address(0) || address(minegameToken) == address(0) || rewardDestination == address(0)) {
            revert ZeroAddress();
        }
        if (
            rewardDestination == address(this) || rewardDestination == address(minegameToken)
                || rewardDestination.code.length == 0
        ) {
            revert InvalidRewardsVault();
        }
        if (initialOverclockPrice == 0 || initialOverclockPrice > MAX_OVERCLOCK_PRICE) {
            revert InvalidOverclockPrice();
        }

        minegame = minegameToken;
        rewardsVault = rewardDestination;
        overclockPrice = initialOverclockPrice;
    }

    /// @notice Locks MINEGAME in the game and starts or adds to a miner position.
    /// @dev New stake receives the current timestamp; existing age is combined by
    /// amount-weighted average so a tiny old deposit cannot age a large new one.
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();

        Position storage position = _positions[msg.sender];
        _accrue(msg.sender, position);

        uint256 oldStake = position.staked;
        uint256 newStake = oldStake + amount;
        uint256 nowTimestamp = block.timestamp;

        if (oldStake == 0) {
            position.weightedStart = uint64(nowTimestamp);
            position.lastAccrual = uint64(nowTimestamp);
        } else {
            position.weightedStart =
                uint64(((oldStake * uint256(position.weightedStart)) + (amount * nowTimestamp)) / newStake);
        }

        uint256 balanceBefore = minegame.balanceOf(address(this));
        minegame.safeTransferFrom(msg.sender, address(this), amount);
        if (minegame.balanceOf(address(this)) - balanceBefore != amount) revert UnsupportedTransferBehavior();

        position.staked = newStake;
        totalStaked += amount;

        emit Staked(msg.sender, amount, newStake, position.weightedStart);
    }

    /// @notice Withdraws locked MINEGAME. A full withdrawal resets holding age.
    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        Position storage position = _positions[msg.sender];
        if (amount > position.staked) revert InsufficientStake();
        _accrue(msg.sender, position);

        position.staked -= amount;
        totalStaked -= amount;

        if (position.staked == 0) {
            position.weightedStart = 0;
            position.lastAccrual = 0;
            position.overclockUntil = 0;
        }

        minegame.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount, position.staked);
    }

    /// @notice Allows principal recovery during a pause without depending on game calculations.
    /// @dev Pending POWER is intentionally forfeited. If the engine token balance has
    /// unexpectedly shrunk, payout is pro rata so the remaining balance cannot be won
    /// by the first account to exit.
    function emergencyWithdraw() external nonReentrant whenPaused {
        Position storage position = _positions[msg.sender];
        uint256 amount = position.staked;
        if (amount == 0) revert InsufficientStake();

        uint256 balance = minegame.balanceOf(address(this));
        uint256 payout = balance >= totalStaked ? amount : Math.mulDiv(amount, balance, totalStaked);

        position.staked = 0;
        position.weightedStart = 0;
        position.lastAccrual = 0;
        position.overclockUntil = 0;
        totalStaked -= amount;

        if (payout > 0) minegame.safeTransfer(msg.sender, payout);
        emit EmergencyWithdrawn(msg.sender, amount, payout);
    }

    /// @notice Materializes pending, nontransferable POWER into the player's balance.
    function accruePower() external whenNotPaused returns (uint256 accrued) {
        accrued = _accrue(msg.sender, _positions[msg.sender]);
    }

    /// @notice Pays MINEGAME into the rewards vault to double POWER production for 24 hours.
    function activateOverclock(uint256 maxPrice) external nonReentrant whenNotPaused {
        Position storage position = _positions[msg.sender];
        if (position.staked == 0) revert InsufficientStake();
        if (block.timestamp < position.overclockUntil) revert OverclockActive();

        uint256 price = overclockPrice;
        if (price > maxPrice) revert PriceExceedsMax(price, maxPrice);
        _accrue(msg.sender, position);

        uint256 balanceBefore = minegame.balanceOf(rewardsVault);
        minegame.safeTransferFrom(msg.sender, rewardsVault, price);
        if (minegame.balanceOf(rewardsVault) - balanceBefore != price) revert UnsupportedTransferBehavior();

        position.overclockUntil = uint64(block.timestamp + OVERCLOCK_DURATION);
        emit OverclockActivated(msg.sender, price, position.overclockUntil);
    }

    function purchasePart(uint256 partId) external whenNotPaused {
        Part storage part = parts[partId];
        if (!partExists[partId] || !part.active) revert InvalidPart();
        if (ownsPart[msg.sender][partId]) revert PartAlreadyOwned();

        Position storage position = _positions[msg.sender];
        _accrue(msg.sender, position);
        if (position.power < part.powerCost) revert InsufficientPower();

        position.power -= part.powerCost;
        ownsPart[msg.sender][partId] = true;
        emit PartPurchased(msg.sender, partId, part.powerCost);
    }

    function equipPart(uint256 partId) external whenNotPaused {
        if (!ownsPart[msg.sender][partId]) revert PartNotOwned();
        if (equippedPart[msg.sender][partId]) revert PartAlreadyEquipped();

        Position storage position = _positions[msg.sender];
        if (position.equippedCount >= MAX_EQUIPPED_PARTS) revert EquipmentLimitReached();
        _accrue(msg.sender, position);

        Part storage part = parts[partId];
        uint256 newBonus = uint256(position.partBonusBps) + part.boostBps;
        if (newBonus > MAX_PART_BONUS_BPS) revert InvalidPartBoost();

        equippedPart[msg.sender][partId] = true;
        position.equippedCount += 1;
        position.partBonusBps = uint32(newBonus);
        emit PartEquipped(msg.sender, partId, newBonus);
    }

    function unequipPart(uint256 partId) external whenNotPaused {
        if (!equippedPart[msg.sender][partId]) revert PartNotEquipped();

        Position storage position = _positions[msg.sender];
        _accrue(msg.sender, position);

        equippedPart[msg.sender][partId] = false;
        position.equippedCount -= 1;
        position.partBonusBps -= parts[partId].boostBps;
        emit PartUnequipped(msg.sender, partId, position.partBonusBps);
    }

    function configurePart(uint256 partId, uint256 powerCost, uint32 boostBps, bool active, string calldata metadataURI)
        external
        onlyOwner
        returns (uint256 configuredPartId)
    {
        configuredPartId = partId;
        if (configuredPartId == 0) {
            configuredPartId = nextPartId++;
        } else {
            if (partExists[configuredPartId]) revert InvalidPart();
            if (configuredPartId >= nextPartId) nextPartId = configuredPartId + 1;
        }
        if (powerCost == 0 || boostBps == 0 || boostBps > MAX_PART_BONUS_BPS || bytes(metadataURI).length == 0) {
            revert InvalidPart();
        }

        parts[configuredPartId] =
            Part({powerCost: powerCost, boostBps: boostBps, active: active, metadataURI: metadataURI});
        partExists[configuredPartId] = true;
        emit PartConfigured(configuredPartId, powerCost, boostBps, active, metadataURI);
    }

    /// @notice Stops or resumes new purchases without changing owned/equipped part math.
    function setPartActive(uint256 partId, bool active) external onlyOwner {
        if (!partExists[partId]) revert InvalidPart();
        parts[partId].active = active;
        emit PartAvailabilityUpdated(partId, active);
    }

    function setOverclockPrice(uint256 newPrice) external onlyOwner {
        if (newPrice == 0 || newPrice > MAX_OVERCLOCK_PRICE) revert InvalidOverclockPrice();
        uint256 oldPrice = overclockPrice;
        overclockPrice = newPrice;
        emit OverclockPriceUpdated(oldPrice, newPrice);
    }

    /// @notice Ownership must remain recoverable so pause cannot permanently brick gameplay.
    function renounceOwnership() public pure override {
        revert OwnershipRenunciationDisabled();
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function positionOf(address player) external view returns (Position memory position) {
        position = _positions[player];
        uint256 pending = _pendingPower(position, block.timestamp);
        position.power += pending;
        position.lifetimePower += pending;
    }

    function pendingPower(address player) external view returns (uint256) {
        return _pendingPower(_positions[player], block.timestamp);
    }

    function ageBonusBps(address player) external view returns (uint256) {
        return _ageBonusAt(_positions[player].weightedStart, block.timestamp);
    }

    /// @notice A deterministic cosmetic progression value for the web renderer.
    function minerLevel(address player) external view returns (uint256) {
        Position memory position = _positions[player];
        uint256 lifetime = position.lifetimePower + _pendingPower(position, block.timestamp);
        return 1 + _sqrt(lifetime / 1 ether);
    }

    function _accrue(address player, Position storage position) internal returns (uint256 accrued) {
        accrued = _pendingPower(position, block.timestamp);
        if (position.staked > 0) position.lastAccrual = uint64(block.timestamp);
        if (accrued == 0) return 0;

        position.power += accrued;
        position.lifetimePower += accrued;
        emit PowerAccrued(player, accrued, position.power, position.lifetimePower);
    }

    function _pendingPower(Position memory position, uint256 toTimestamp) internal pure returns (uint256) {
        if (position.staked == 0 || position.lastAccrual == 0 || toTimestamp <= position.lastAccrual) return 0;

        uint256 fromTimestamp = position.lastAccrual;
        uint256 overclockEnd = position.overclockUntil;

        if (overclockEnd <= fromTimestamp || overclockEnd >= toTimestamp) {
            return _powerForInterval(position, fromTimestamp, toTimestamp, overclockEnd > fromTimestamp);
        }

        return _powerForInterval(position, fromTimestamp, overclockEnd, true)
            + _powerForInterval(position, overclockEnd, toTimestamp, false);
    }

    function _powerForInterval(Position memory position, uint256 fromTimestamp, uint256 toTimestamp, bool overclocked)
        internal
        pure
        returns (uint256)
    {
        if (toTimestamp <= fromTimestamp) return 0;
        uint256 elapsed = toTimestamp - fromTimestamp;
        uint256 multiplierBpsSeconds = (BPS + uint256(position.partBonusBps)) * elapsed
            + _ageBonusIntegral(position.weightedStart, fromTimestamp, toTimestamp);
        if (overclocked) multiplierBpsSeconds += OVERCLOCK_BONUS_BPS * elapsed;

        return (position.staked * multiplierBpsSeconds) / BPS / POWER_DAY;
    }

    function _ageBonusIntegral(uint256 startedAt, uint256 fromTimestamp, uint256 toTimestamp)
        internal
        pure
        returns (uint256)
    {
        if (startedAt == 0 || toTimestamp <= fromTimestamp || toTimestamp <= startedAt) return 0;

        uint256 start = fromTimestamp < startedAt ? startedAt : fromTimestamp;
        uint256 capTimestamp = startedAt + AGE_BONUS_PERIOD;
        if (start >= capTimestamp) return MAX_AGE_BONUS_BPS * (toTimestamp - start);

        uint256 linearEnd = toTimestamp < capTimestamp ? toTimestamp : capTimestamp;
        uint256 bonusAtStart = _ageBonusAt(startedAt, start);
        uint256 bonusAtEnd = _ageBonusAt(startedAt, linearEnd);
        uint256 integral = ((bonusAtStart + bonusAtEnd) * (linearEnd - start)) / 2;

        if (toTimestamp > capTimestamp) integral += MAX_AGE_BONUS_BPS * (toTimestamp - capTimestamp);
        return integral;
    }

    function _ageBonusAt(uint256 startedAt, uint256 timestamp) internal pure returns (uint256) {
        if (startedAt == 0 || timestamp <= startedAt) return 0;
        uint256 age = timestamp - startedAt;
        if (age >= AGE_BONUS_PERIOD) return MAX_AGE_BONUS_BPS;
        return (age * MAX_AGE_BONUS_BPS) / AGE_BONUS_PERIOD;
    }

    function _sqrt(uint256 x) internal pure returns (uint256 z) {
        if (x == 0) return 0;
        z = 1;
        uint256 y = x;
        if (y >= 2 ** 128) {
            y >>= 128;
            z <<= 64;
        }
        if (y >= 2 ** 64) {
            y >>= 64;
            z <<= 32;
        }
        if (y >= 2 ** 32) {
            y >>= 32;
            z <<= 16;
        }
        if (y >= 2 ** 16) {
            y >>= 16;
            z <<= 8;
        }
        if (y >= 2 ** 8) {
            y >>= 8;
            z <<= 4;
        }
        if (y >= 2 ** 4) {
            y >>= 4;
            z <<= 2;
        }
        if (y >= 2 ** 2) z <<= 1;
        for (uint256 i; i < 7; ++i) {
            z = (z + x / z) >> 1;
        }
        uint256 roundedDown = x / z;
        return z < roundedDown ? z : roundedDown;
    }
}

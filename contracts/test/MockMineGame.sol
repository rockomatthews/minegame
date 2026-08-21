// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IStakeTarget {
    function stake(uint256 amount) external;
}

contract MockMineGame is ERC20 {
    constructor() ERC20("MineGame", "MINEGAME") {
        _mint(msg.sender, 1_000_000_000 ether);
    }
}

contract SupplyShrinkingMineGame is ERC20 {
    constructor() ERC20("MineGame", "MINEGAME") {
        _mint(msg.sender, 1_000_000_000 ether);
    }

    function slash(address account, uint256 amount) external {
        _burn(account, amount);
    }
}

contract FeeOnTransferMineGame is ERC20 {
    constructor() ERC20("MineGame", "MINEGAME") {
        _mint(msg.sender, 1_000_000_000 ether);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) {
            uint256 fee = value / 100;
            super._update(from, address(0), fee);
            value -= fee;
        }
        super._update(from, to, value);
    }
}

contract ReentrantMineGame is ERC20 {
    address public target;
    bool public callbackAttempted;
    bool public callbackBlocked;

    constructor() ERC20("MineGame", "MINEGAME") {
        _mint(msg.sender, 1_000_000_000 ether);
    }

    function setTarget(address newTarget) external {
        target = newTarget;
    }

    function transferFrom(address from, address to, uint256 value) public override returns (bool) {
        if (msg.sender == target && !callbackAttempted) {
            callbackAttempted = true;
            (bool succeeded,) = target.call(abi.encodeCall(IStakeTarget.stake, (1)));
            callbackBlocked = !succeeded;
        }
        return super.transferFrom(from, to, value);
    }
}

contract ContractWallet {}

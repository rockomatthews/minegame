// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

contract B20PreflightMock {
    string public name = "MineGame";
    string public symbol = "MINEGAME";
    uint8 public decimals = 18;
    uint256 public totalSupply = 1_000_000_000 ether;
    uint256 public supplyCap = 1_000_000_000 ether;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(bytes32 => mapping(address => bool)) private _roles;
    mapping(bytes32 => uint64) private _policyId;
    uint8[] private _pausedFeatures;

    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(address admin) {
        balanceOf[msg.sender] = totalSupply;
        if (admin != address(0)) {
            _roles[bytes32(0)][admin] = true;
            emit RoleGranted(bytes32(0), admin, msg.sender);
            _roles[keccak256("SEIZE_ROLE")][admin] = true;
            emit RoleGranted(keccak256("SEIZE_ROLE"), admin, msg.sender);
        }
    }

    function hasRole(bytes32 role, address account) external view returns (bool) {
        return _roles[role][account];
    }

    function policyId(bytes32 policyScope) external view returns (uint64) {
        return _policyId[policyScope];
    }

    function pausedFeatures() external view returns (uint8[] memory) {
        return _pausedFeatures;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        allowance[from][msg.sender] -= value;
        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
        return true;
    }
}

contract PreflightWallet {
    receive() external payable {}
}

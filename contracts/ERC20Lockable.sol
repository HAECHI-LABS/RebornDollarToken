pragma solidity 0.5.11;

import "./ERC20.sol";
import "./library/Ownable.sol";

contract ERC20Lockable is ERC20, Ownable {
    struct LockInfo {
        uint256 amount;
        uint256 due;
    }

    mapping(address => LockInfo) internal _locks;

    event Lock(address indexed from, uint256 amount, uint256 due);
    event Unlock(address indexed from, uint256 amount);

    function _lock(address from, uint256 amount, uint256 due)
        internal
        returns (bool success)
    {
        require(due > now, "ERC20Lockable/lock : Cannot set due to past");
        require(
            _locks[from].amount == 0,
            "ERC20Lockable/lock : Cannot have more than one lock"
        );
        _balances[from] = _balances[from].sub(
            amount,
            "ERC20Lockable/lock : Cannot lock more than balance"
        );
        _locks[from] = LockInfo(amount, due);
        emit Lock(from, amount, due);
        success = true;
    }

    function _unlock(address from) internal returns (bool success) {
        LockInfo storage lock = _locks[from];
        _balances[from] = _balances[from].add(lock.amount);
        emit Unlock(from, lock.amount);
        delete _locks[from];
        success = true;
    }

    function unlock(address from) external returns (bool success) {
        require(
            _locks[from].due < now,
            "ERC20Lockable/unlock : Cannot unlock before due"
        );
        _unlock(from);
        success = true;
    }

    function releaseLock(address from)
        external
        onlyOwner
        returns (bool success)
    {
        _unlock(from);
        success = true;
    }

    function transferWithLockUp(address recipient, uint256 amount, uint256 due)
        external
        returns (bool success)
    {
        require(
            recipient != address(0x00),
            "ERC20Lockable/transferWithLockUp : Cannot send to zero address"
        );
        _transfer(msg.sender, recipient, amount);
        _lock(recipient, amount, due);
        success = true;
    }

    function lockInfo(address locked)
        external
        view
        returns (uint256 amount, uint256 due)
    {
        amount = _locks[locked].amount;
        due = _locks[locked].due;
    }
}

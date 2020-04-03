pragma solidity 0.5.11;

import "./Ownable.sol";

contract Pausable is Ownable {
    bool internal _paused;

    event Paused();
    event Unpaused();

    modifier whenPaused() {
        require(_paused);
        _;
    }

    modifier whenNotPaused() {
        require(!_paused);
        _;
    }

    function pause() external onlyOwner whenNotPaused returns (bool success) {
        _paused = true;
        emit Paused();
        success = true;
    }

    function unPause() external onlyOwner whenPaused returns (bool success) {
        _paused = false;
        emit Unpaused();
        success = true;
    }

    function paused() external view returns (bool) {
        return _paused;
    }
}

pragma solidity 0.5.11;

import "./ERC20.sol";
import "./library/Pausable.sol";

contract ERC20Mintable is ERC20, Pausable {
    event Mint(address indexed receiver, uint256 amount);

    ///@dev mint token
    ///only owner can call this function
    function mint(address receiver, uint256 amount)
        external
        onlyOwner
        whenNotPaused
        returns (bool success)
    {
        require(
            receiver != address(0x00),
            "ERC20Mintable/mint : Should not mint to zero address"
        );
        _mint(receiver, amount);
        emit Mint(receiver, amount);
        success = true;
    }
}

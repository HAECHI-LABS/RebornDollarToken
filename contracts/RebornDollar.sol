pragma solidity 0.5.11;

import "./ERC20Lockable.sol";
import "./ERC20Burnable.sol";
import "./ERC20Mintable.sol";
import "./library/Pausable.sol";
import "./library/Freezable.sol";

contract RebornDollar is
    ERC20Lockable,
    ERC20Burnable,
    ERC20Mintable,
    Freezable
{
    string constant private _name = "Reborn dollar";
    string constant private _symbol = "REBD";
    uint8 constant private _decimals = 18;
    uint256 constant private _initial_supply = 2_000_000_000;

    constructor() public Ownable() {
        _mint(msg.sender, _initial_supply * (10**uint256(_decimals)));
    }

    function transfer(address to, uint256 amount)
        external
        whenNotFrozen(msg.sender)
        whenNotPaused
        returns (bool success)
    {
        require(
            to != address(0x00),
            "REBD/transfer : Should not send to zero address"
        );
        _transfer(msg.sender, to, amount);
        success = true;
    }

    function transferFrom(address from, address to, uint256 amount)
        external
        whenNotFrozen(from)
        whenNotPaused
        returns (bool success)
    {
        require(
            to != address(0x00),
            "REBD/transferFrom : Should not send to zero address"
        );
        _transfer(from, to, amount);
        _approve(
            from,
            msg.sender,
            _allowances[from][msg.sender].sub(
                amount,
                "REBD/transferFrom : Cannot send more than allowance"
            )
        );
        success = true;
    }

    function approve(address spender, uint256 amount)
        external
        returns (bool success)
    {
        require(
            spender != address(0x00),
            "REBD/approve : Should not approve zero address"
        );
        _approve(msg.sender, spender, amount);
        success = true;
    }

    function name() external view returns (string memory tokenName) {
        tokenName = _name;
    }

    function symbol() external view returns (string memory tokenSymbol) {
        tokenSymbol = _symbol;
    }

    function decimals() external view returns (uint8 tokenDecimals) {
        tokenDecimals = _decimals;
    }
}

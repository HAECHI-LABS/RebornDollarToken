pragma solidity 0.5.11;

contract Ownable {
    address private _owner;

    event OwnershipTransferred(
        address indexed currentOwner,
        address indexed newOwner
    );

    constructor() internal {
        _owner = msg.sender;
        emit OwnershipTransferred(address(0x00), msg.sender);
    }

    modifier onlyOwner() {
        require(
            msg.sender == _owner,
            "Ownable : Function called by unauthorized user."
        );
        _;
    }

    function owner() external view returns (address ownerAddress) {
        ownerAddress = _owner;
    }

    function transferOwnership(address newOwner)
        public
        onlyOwner
        returns (bool success)
    {
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
        success = true;
    }

    function renounceOwnership() external onlyOwner returns (bool success) {
        success = transferOwnership(address(0x00));
    }
}

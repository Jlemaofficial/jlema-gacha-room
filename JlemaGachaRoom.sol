// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address owner) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IERC721 {
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
    function tokenURI(uint256 tokenId) external view returns (string memory);
}

contract JlemaGachaRoom {
    address public owner;
    IERC20 public cleanToken;
    IERC721 public jlemaNFT;

    // price in smallest unit (e.g. if CLEAN has 18 decimals, price = 10000 * 1e18)
    uint256 public pricePerNFT;
    uint256 private nonce;

    // available NFTs stored in the contract
    uint256[] private availableTokenIds;
    mapping(uint256 => uint256) private tokenIndex; // tokenId => index+1 (0 means not present)

    event DepositedNFT(address indexed owner, uint256 tokenId);
    event Swapped(address indexed user, uint256 tokenId);
    event Withdrawn(address indexed owner, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "owner only");
        _;
    }

    constructor(address _cleanToken, address _jlemaNFT, uint256 _pricePerNFT) {
        owner = msg.sender;
        cleanToken = IERC20(_cleanToken);
        jlemaNFT = IERC721(_jlemaNFT);
        pricePerNFT = _pricePerNFT;
    }

    // Owner can change price if needed
    function setPricePerNFT(uint256 _newPrice) external onlyOwner {
        pricePerNFT = _newPrice;
    }

    // Owner deposits NFTs into contract. Owner must approve contract to transfer their NFTs first or call transfer manually.
    function depositNFTs(uint256[] calldata tokenIds) external onlyOwner {
        for (uint i = 0; i < tokenIds.length; i++) {
            uint256 t = tokenIds[i];
            // transfer NFT from owner to contract
            jlemaNFT.transferFrom(msg.sender, address(this), t);
            // add to available list
            availableTokenIds.push(t);
            tokenIndex[t] = availableTokenIds.length; // index+1
            emit DepositedNFT(msg.sender, t);
        }
    }

    // Owner can withdraw any NFTs in contract (e.g., to remove some from gacha)
    function withdrawNFTs(uint256[] calldata tokenIds, address to) external onlyOwner {
        for (uint i = 0; i < tokenIds.length; i++) {
            uint256 t = tokenIds[i];
            require(tokenIndex[t] != 0, "token not available");
            _removeTokenById(t);
            jlemaNFT.safeTransferFrom(address(this), to, t);
        }
    }

    // User performs swap: transfer CLEAN from user -> contract, then transfer NFT -> user
    function swap() external {
        require(availableTokenIds.length > 0, "no NFTs available");
        // transfer CLEAN from user to contract. User must approve first.
        bool ok = cleanToken.transferFrom(msg.sender, address(this), pricePerNFT);
        require(ok, "token transfer failed");

        // choose pseudo-random index
        uint256 idx = _randomIndex() % availableTokenIds.length;
        uint256 tokenId = availableTokenIds[idx];

        // remove tokenId from array (swap-with-last)
        _removeTokenAtIndex(idx);

        // transfer NFT to user
        jlemaNFT.safeTransferFrom(address(this), msg.sender, tokenId);

        emit Swapped(msg.sender, tokenId);
    }

    // Preview a pseudo-random NFT for a given user (view)
    function previewRandom(address user) external view returns (uint256 tokenId, string memory tokenUri) {
        uint256 len = availableTokenIds.length;
        require(len > 0, "no NFTs available");
        // pseudo-random deterministically from block.timestamp + user (note: view can't access future blockhash)
        uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, user))) ;
        uint256 idx = seed % len;
        tokenId = availableTokenIds[idx];
        tokenUri = jlemaNFT.tokenURI(tokenId);
    }

    // Owner withdraws accumulated CLEAN tokens to owner wallet
    function withdrawClean() external onlyOwner {
        uint256 bal = cleanToken.balanceOf(address(this));
        require(bal > 0, "no tokens");
        bool ok = cleanToken.transfer(owner, bal);
        require(ok, "withdraw failed");
        emit Withdrawn(owner, bal);
    }

    // Helper getters
    function getAvailableCount() external view returns (uint256) {
        return availableTokenIds.length;
    }

    function getAvailableTokenIds() external view returns (uint256[] memory) {
        return availableTokenIds;
    }

    // Remove by id internal
    function _removeTokenById(uint256 tokenId) internal {
        uint256 idxPlus = tokenIndex[tokenId];
        require(idxPlus != 0, "not found");
        uint256 idx = idxPlus - 1;
        _removeTokenAtIndex(idx);
    }

    // Remove at index internal (swap-with-last)
    function _removeTokenAtIndex(uint256 idx) internal {
        uint256 lastIndex = availableTokenIds.length - 1;
        uint256 lastTokenId = availableTokenIds[lastIndex];

        if (idx != lastIndex) {
            uint256 tokenId = availableTokenIds[idx];
            availableTokenIds[idx] = lastTokenId;
            tokenIndex[lastTokenId] = idx + 1;
            // clear mapping for removed token later
            tokenIndex[tokenId] = 0;
        } else {
            uint256 tokenId = availableTokenIds[idx];
            tokenIndex[tokenId] = 0;
        }

        availableTokenIds.pop();
    }

    // pseudo-random helper
    function _randomIndex() internal returns (uint256) {
        nonce++;
        return uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, nonce)));
    }

    // ownership transfer
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // Accept incoming safe transfers
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        // required magic value
        return 0x150b7a02;
    }
}

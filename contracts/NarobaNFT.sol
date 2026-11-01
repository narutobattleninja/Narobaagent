// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Naroba Pixel Identity Archive
/// @notice 10,000 ERC-721 identities with a closed-by-default, three-stage BNB mint.
contract NarobaNFT is ERC721, Ownable, ReentrancyGuard {
    uint256 public constant MAX_SUPPLY = 10_000;
    uint256 public constant FREE_SUPPLY = 1_000;
    uint256 public constant PASSAGE_SUPPLY_END = 9_000;
    uint256 public constant PASSAGE_PRICE = 0.000222 ether;
    uint256 public constant OPEN_PRICE = 0.001 ether;

    uint256 public totalMinted;
    bool public mintEnabled;
    string private _baseTokenURI;

    event MintStatusChanged(bool enabled);
    event BaseURIUpdated(string baseURI);
    event IdentityMinted(address indexed recipient, uint256 indexed tokenId, uint256 price);
    event ProceedsWithdrawn(address indexed owner, uint256 amount);

    constructor() ERC721("Naroba Pixel Identity Archive", "NRB") Ownable(msg.sender) {}

    /// @notice Mint exactly one token. Price is determined by the next token ID.
    function mint() external payable nonReentrant returns (uint256 tokenId) {
        require(mintEnabled, "Mint is closed");
        require(bytes(_baseTokenURI).length != 0, "Base URI not set");
        require(totalMinted < MAX_SUPPLY, "Supply exhausted");

        tokenId = totalMinted + 1;
        uint256 price = mintPriceForToken(tokenId);
        require(msg.value == price, "Incorrect BNB amount");

        totalMinted = tokenId;
        _safeMint(msg.sender, tokenId);
        emit IdentityMinted(msg.sender, tokenId, price);
    }

    /// @notice Returns the mint price for a valid token ID.
    function mintPriceForToken(uint256 tokenId) public pure returns (uint256) {
        require(tokenId > 0 && tokenId <= MAX_SUPPLY, "Token ID out of range");
        if (tokenId <= FREE_SUPPLY) return 0;
        if (tokenId <= PASSAGE_SUPPLY_END) return PASSAGE_PRICE;
        return OPEN_PRICE;
    }

    /// @notice Owner sets a directory URI ending in `/`, e.g. an IPFS metadata CID.
    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        bytes memory uri = bytes(newBaseURI);
        require(uri.length > 0 && uri[uri.length - 1] == "/", "Base URI must end with slash");
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    function baseURI() external view returns (string memory) {
        return _baseTokenURI;
    }

    /// @notice Deployment does not open mint; only the owner can change this flag.
    function setMintEnabled(bool enabled) external onlyOwner {
        if (enabled) {
            require(bytes(_baseTokenURI).length != 0, "Set base URI first");
            require(totalMinted < MAX_SUPPLY, "Supply exhausted");
        }
        mintEnabled = enabled;
        emit MintStatusChanged(enabled);
    }

    /// @notice Send all accumulated mint proceeds to the contract owner.
    function withdrawProceeds() external onlyOwner nonReentrant {
        uint256 amount = address(this).balance;
        require(amount > 0, "No proceeds to withdraw");
        address payable recipient = payable(owner());
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "BNB transfer failed");
        emit ProceedsWithdrawn(recipient, amount);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "URI query for nonexistent token");
        if (bytes(_baseTokenURI).length == 0) return "";
        return string.concat(_baseTokenURI, _padTokenId(tokenId), ".json");
    }

    function _padTokenId(uint256 tokenId) private pure returns (string memory) {
        if (tokenId >= 1_000) return _toString(tokenId);
        if (tokenId >= 100) return string.concat("0", _toString(tokenId));
        if (tokenId >= 10) return string.concat("00", _toString(tokenId));
        return string.concat("000", _toString(tokenId));
    }

    function _toString(uint256 value) private pure returns (string memory) {
        if (value == 0) return "0";
        uint256 digits;
        uint256 temp = value;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + (value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}

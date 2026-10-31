// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Drop-in metadata URI helper for an ERC-721 Naroba contract.
/// Set the metadata CID after pinning the generated collection to IPFS.
abstract contract NarobaMetadataURI {
    string private _narobaBaseURI;

    event NarobaBaseURIUpdated(string baseURI);

    function _setNarobaBaseURI(string memory baseURI_) internal {
        _narobaBaseURI = baseURI_;
        emit NarobaBaseURIUpdated(baseURI_);
    }

    function narobaBaseURI() public view returns (string memory) {
        return _narobaBaseURI;
    }

    /// @dev Assumes metadata files are named 0001.json, 0002.json, etc.
    function _narobaTokenURI(uint256 tokenId) internal view returns (string memory) {
        return string.concat(_narobaBaseURI, _padTokenId(tokenId), ".json");
    }

    function _padTokenId(uint256 tokenId) private pure returns (string memory) {
        if (tokenId >= 1000) return _toString(tokenId);
        if (tokenId >= 100) return string.concat("0", _toString(tokenId));
        if (tokenId >= 10) return string.concat("00", _toString(tokenId));
        return string.concat("000", _toString(tokenId));
    }

    function _toString(uint256 value) private pure returns (string memory) {
        if (value == 0) return "0";
        uint256 digits;
        uint256 temp = value;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract SignaturePrescriptionOnChain is ERC721, Ownable {
    using Strings for uint256;
    using ECDSA for bytes32;

    /// @notice Doctor / backend signer address
    address public signer;

    uint256 public counter;

    error InvalidSignature();
    error InvalidTokenId(uint256);

    event Prescribed(address indexed to, uint256 indexed tokenId);

    /// @notice Prescription stored fully on-chain
    struct Prescription {
        string medication;
        string dosage;
        string instructions;
    }

    mapping(uint256 => Prescription) public prescriptions;

    constructor(
        string memory _name,
        string memory _symbol,
        address _signer
    ) ERC721(_name, _symbol) Ownable(msg.sender) { // specify initial owner here
        signer = _signer;
    }

    /// @notice Update the signing address (doctor rotates keys)
    function setSigner(address _signer) external onlyOwner {
        signer = _signer;
    }

    /**
     * @notice Mint using signature authorization (on-chain prescription)
     */
    function mintWithSignature(
        address recipient,
        string calldata medication,
        string calldata dosage,
        string calldata instructions,
        bytes calldata signature
    ) external returns (uint256) {
        bytes32 messageHash = keccak256(
            abi.encodePacked(recipient, medication, dosage, instructions)
        );
        bytes32 ethSigned = MessageHashUtils.toEthSignedMessageHash(messageHash);

        address recovered = ECDSA.recover(ethSigned, signature);
        if (recovered != signer) revert InvalidSignature();

        counter++;
        uint256 tokenId = counter;

        prescriptions[tokenId] = Prescription({
            medication: medication,
            dosage: dosage,
            instructions: instructions
        });

        _safeMint(recipient, tokenId);

        emit Prescribed(recipient, tokenId);
        return tokenId;
    }

    /// @notice tokenURI returns JSON containing the prescription data
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (ownerOf(tokenId) == address(0)) revert InvalidTokenId(tokenId);

        Prescription storage p = prescriptions[tokenId];

        string memory json = string(
            abi.encodePacked(
                '{"name":"Prescription #', tokenId.toString(),
                '","description":"On-chain prescription NFT.",',
                '"attributes":[{"trait_type":"medication","value":"', p.medication,
                '"},{"trait_type":"dosage","value":"', p.dosage,
                '"},{"trait_type":"instructions","value":"', p.instructions,
                '"}]}'
            )
        );

        return string(abi.encodePacked("data:application/json,", json));
    }
}

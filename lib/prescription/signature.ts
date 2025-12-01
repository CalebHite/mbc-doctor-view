import { ethers } from "ethers";

/**
 * Sign prescription data for on-chain storage
 * Matches the contract's message hash: keccak256(abi.encodePacked(recipient, medication, dosage, instructions))
 * The contract uses MessageHashUtils.toEthSignedMessageHash which adds the Ethereum message prefix
 */
export async function doctorSignPrescription(
  provider: ethers.BrowserProvider,
  recipient: string,
  medication: string,
  dosage: string,
  instructions: string
) {
  const signer = await provider.getSigner();

  // Match the contract's encoding: keccak256(abi.encodePacked(recipient, medication, dosage, instructions))
  const encoded = ethers.solidityPacked(
    ["address", "string", "string", "string"],
    [recipient, medication, dosage, instructions]
  );

  // Get the hash (bytes32) - this matches the contract's messageHash
  const messageHash = ethers.keccak256(encoded);

  // The contract uses: MessageHashUtils.toEthSignedMessageHash(messageHash)
  // This creates: keccak256("\x19Ethereum Signed Message:\n32" + messageHash)
  // 
  // When we use signMessage with the hash bytes, ethers.js will:
  // 1. Take the hash bytes (32 bytes)
  // 2. Add prefix "\x19Ethereum Signed Message:\n32" + hash bytes
  // 3. Hash again
  // 4. Sign
  //
  // This matches exactly what the contract does!
  // We pass the hash as hex string, and signMessage will handle the prefix correctly
  const signature = await signer.signMessage(ethers.getBytes(messageHash));

  return signature;
}

import { ethers } from "ethers";
import { SignaturePrescriptionABI } from "./abi";

export function getPrescriptionContract(
  address: string,
  signerOrProvider: ethers.Signer | ethers.Provider
) {
  return new ethers.Contract(address, SignaturePrescriptionABI, signerOrProvider);
}

export async function mintPrescription(
  contract: ethers.Contract,
  recipient: string,
  medication: string,
  dosage: string,
  instructions: string,
  signature: string
) {
  const tx = await contract.mintWithSignature(
    recipient,
    medication,
    dosage,
    instructions,
    signature
  );
  return await tx.wait();
}

export async function getPrescriptionInfo(
  contract: ethers.Contract,
  tokenId: number
) {
  const prescription = await contract.prescriptions(tokenId);
  const tokenURI = await contract.tokenURI(tokenId);

  return {
    medication: prescription.medication,
    dosage: prescription.dosage,
    instructions: prescription.instructions,
    tokenURI,
  };
}

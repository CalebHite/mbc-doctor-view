import { getPrescriptionInfo } from "./contract";

export async function viewPrescription(
  contract: any,
  tokenId: number
) {
  const { medication, dosage, instructions, tokenURI } = await getPrescriptionInfo(contract, tokenId);

  // Parse the tokenURI (it's a data URI with JSON)
  let metadata = null;
  if (tokenURI.startsWith("data:application/json,")) {
    try {
      const jsonString = decodeURIComponent(tokenURI.replace("data:application/json,", ""));
      metadata = JSON.parse(jsonString);
    } catch (e) {
      console.error("Failed to parse tokenURI:", e);
    }
  }

  return {
    tokenId,
    medication,
    dosage,
    instructions,
    tokenURI,
    metadata,
  };
}

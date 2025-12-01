/**
 * Upload prescription data to IPFS using Filebase
 * Filebase provides IPFS storage via their API
 */
export async function uploadPrescriptionToIPFS(
  data: Record<string, any>,
  apiToken: string,
  bucketName: string
): Promise<string> {
  const jsonData = JSON.stringify(data, null, 2);
  const filename = `prescription-${Date.now()}.json`;
  
  // Filebase IPFS API endpoint
  // Using their IPFS add endpoint which returns the CID
  const formData = new FormData();
  const blob = new Blob([jsonData], { type: "application/json" });
  formData.append("file", blob, filename);
  
  // Filebase IPFS API endpoint
  // Endpoint format: https://api.filebase.io/v1/ipfs/pins
  // Or use: https://s3.filebase.com/{bucket}/{key} with proper auth
  // For IPFS Pinning Service API (IPFS Pinning Service standard)
  const res = await fetch("https://api.filebase.io/v1/ipfs/pins", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    let errorMessage = "Filebase upload failed";
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorJson.message || errorText;
    } catch {
      errorMessage = errorText || `HTTP ${res.status}: ${res.statusText}`;
    }
    throw new Error(`Filebase upload failed: ${errorMessage}`);
  }

  const json = await res.json();
  // Filebase IPFS Pinning Service returns CID in pin.cid
  return json.pin?.cid || json.cid || json.IpfsHash;
}
  
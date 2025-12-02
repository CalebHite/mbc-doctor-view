"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function PrescriptionSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tokenId = searchParams.get("tokenId");
  const patientName = searchParams.get("patientName");
  const patientId = searchParams.get("patientId");
  const medication = searchParams.get("medication");
  const dosage = searchParams.get("dosage");
  const instructions = searchParams.get("instructions");
  const date = searchParams.get("date") || new Date().toLocaleString();

  const handleBackToDashboard = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#00ff88] rounded-full mb-4">
            <svg
              className="w-10 h-10 text-black"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-2">Prescription Minted Successfully!</h1>
          <p className="text-gray-400">Your prescription has been created and stored on-chain</p>
        </div>

        {/* Receipt Card */}
        <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 p-8 mb-6">
          <div className="border-b border-gray-700 pb-4 mb-6">
            <h2 className="text-2xl font-semibold mb-2">Prescription Receipt</h2>
            <p className="text-gray-400 text-sm">Transaction Date: {date}</p>
          </div>

          <div className="space-y-6">
            {/* Token ID Section */}
            {tokenId && (
              <div className="bg-[#252525] rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">NFT Token ID</p>
                    <p className="text-xl font-mono font-semibold text-[#00ff88]">{tokenId}</p>
                  </div>
                  <div className="px-3 py-1 bg-[#00ff88] bg-opacity-20 text-[#00ff88] rounded-lg text-sm font-medium">
                    On-Chain
                  </div>
                </div>
              </div>
            )}

            {/* Patient Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-300">Patient Information</h3>
              <div className="bg-[#252525] rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Name:</span>
                  <span className="font-medium">{patientName || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Patient ID:</span>
                  <span className="font-medium">{patientId || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Prescription Details */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-300">Prescription Details</h3>
              <div className="bg-[#252525] rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-gray-400">Medication:</span>
                  <span className="font-medium text-right">{medication || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Dosage:</span>
                  <span className="font-medium">{dosage || "N/A"}</span>
                </div>
                {instructions && (
                  <div className="pt-2 border-t border-gray-700">
                    <p className="text-gray-400 mb-2">Instructions:</p>
                    <p className="text-gray-300 whitespace-pre-wrap">{instructions}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Doctor Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-300">Prescribing Physician</h3>
              <div className="bg-[#252525] rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    CD
                  </div>
                  <div>
                    <p className="font-medium">Dr. Charlie Doherty</p>
                    <p className="text-sm text-gray-400">Licensed Physician</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Receipt Footer */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-xs text-gray-500 text-center">
              This prescription has been securely stored on the blockchain as an NFT.
              <br />
              The token ID above can be used to verify and access this prescription.
            </p>
          </div>
        </div>

        {/* Back Button */}
        <div className="flex justify-center">
          <button
            onClick={handleBackToDashboard}
            className="px-8 py-3 bg-[#00ff88] text-black rounded-lg hover:bg-[#00e677] transition-colors font-medium text-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PrescriptionSuccess() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#00ff88] mb-4"></div>
          <p className="text-gray-400">Loading receipt...</p>
        </div>
      </div>
    }>
      <PrescriptionSuccessContent />
    </Suspense>
  );
}


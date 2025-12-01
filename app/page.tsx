"use client";

import { useState } from "react";
import { ethers } from "ethers";

import { doctorSignPrescription } from "@/lib/prescription/signature";
import { getPrescriptionContract, mintPrescription } from "@/lib/prescription/contract";

interface Patient {
  id: string;
  name: string;
  dob: string;
  address: string;
}

export default function PrescriptionDashboard() {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [patients] = useState<Patient[]>([
    { id: "1", name: "John Doe", dob: "01/15/1985", address: "123 Main St, City, State 12345" },
    { id: "2", name: "Jane Smith", dob: "03/22/1990", address: "456 Oak Ave, City, State 12345" },
    { id: "3", name: "Bob Johnson", dob: "07/10/1978", address: "789 Pine Rd, City, State 12345" },
  ]);

  // Prescription form state
  const [patientName, setPatientName] = useState("");
  const [patientId, setPatientId] = useState("");
  const [medication, setMedication] = useState("");
  const [amount, setAmount] = useState(50);
  const [notes, setNotes] = useState("");

  async function handleMint() {
    setLoading(true);
    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask or another Web3 wallet");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      const signer = await provider.getSigner();

      const contractAddress = process.env.NEXT_PUBLIC_PRESCRIPTION_CONTRACT;

      if (!contractAddress) {
        throw new Error("Missing contract address. Please check your .env.local file.");
      }

      if (!patientName || !medication || !notes) {
        throw new Error("Please fill in all required fields");
      }

      const contract = getPrescriptionContract(contractAddress, signer);

      // Format prescription data
      const dosage = `${amount}mg`;
      const instructions = notes;

      // 1. Doctor signs the prescription data
      const signature = await doctorSignPrescription(
        provider,
        signer.address,
        medication,
        dosage,
        instructions
      );

      // 2. Mint NFT with on-chain prescription data
      const receipt = await mintPrescription(
        contract,
        signer.address,
        medication,
        dosage,
        instructions,
        signature
      );

      // Get the token ID from the event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === "Prescribed";
        } catch {
          return false;
        }
      });

      let tokenId = null;
      if (event) {
        const parsed = contract.interface.parseLog(event);
        tokenId = parsed?.args[1]?.toString();
      }

      alert(`Prescription minted successfully!${tokenId ? ` Token ID: ${tokenId}` : ""}`);
      
      // Reset form and close modal
      setPatientName("");
      setPatientId("");
      setMedication("");
      setAmount(50);
      setNotes("");
      setShowModal(false);
    } catch (error) {
      console.error("Error minting prescription:", error);
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-400">Manage patient prescriptions</p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Patient List */}
          <div className="lg:col-span-2 bg-[#1a1a1a] rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Patients</h2>
              <button
                onClick={() => setShowModal(true)}
                className="px-6 py-2 bg-transparent border-2 border-[#00ff88] text-[#00ff88] rounded-lg hover:bg-[#00ff88] hover:text-black transition-colors font-medium"
              >
                Create Prescription
              </button>
            </div>

            {/* Patient Table */}
            <div className="bg-[#252525] rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 text-gray-300 font-medium">Name</th>
                    <th className="text-left p-4 text-gray-300 font-medium">DOB</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Address</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="border-b border-gray-800 hover:bg-[#2a2a2a] cursor-pointer transition-colors"
                      onClick={() => {
                        setPatientName(patient.name);
                        setPatientId(patient.id);
                        setShowModal(true);
                      }}
                    >
                      <td className="p-4">{patient.name}</td>
                      <td className="p-4 text-gray-400">{patient.dob}</td>
                      <td className="p-4 text-gray-400">{patient.address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* User Profile */}
            <div className="mt-8 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                CD
              </div>
              <div>
                <p className="font-medium">Dr. Charlie Doherty</p>
                <p className="text-sm text-gray-400">Licensed Physician</p>
              </div>
            </div>
          </div>

          {/* Right Column - Stats or Info */}
          <div className="bg-[#1a1a1a] rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">Statistics</h3>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm">Total Prescriptions</p>
                <p className="text-3xl font-bold text-[#00ff88]">{patients.length}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Active Patients</p>
                <p className="text-3xl font-bold text-blue-500">{patients.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prescription Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-lg p-8 max-w-md w-full border border-gray-800">
            <h2 className="text-3xl font-bold mb-6">New Prescription</h2>

            <div className="space-y-4">
              {/* Patient Name */}
              <div>
                <input
                  type="text"
                  placeholder="Patient Name"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-[#252525] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff88]"
                />
              </div>

              {/* Patient ID */}
              <div>
                <input
                  type="text"
                  placeholder="Patient ID Number"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full bg-[#252525] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff88]"
                />
              </div>

              {/* Medication */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Medication"
                  value={medication}
                  onChange={(e) => setMedication(e.target.value)}
                  className="w-full bg-[#252525] border border-gray-700 rounded-lg px-4 py-3 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff88]"
                />
                <svg
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              {/* Amount Slider */}
              <div>
                <label className="block text-white mb-2">Amount: {amount}mg</label>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="10"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full h-2 bg-[#252525] rounded-lg appearance-none cursor-pointer accent-[#00ff88]"
                />
              </div>

              {/* Notes */}
              <div>
                <textarea
                  placeholder="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full bg-[#252525] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff88] resize-none"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setPatientName("");
                  setPatientId("");
                  setMedication("");
                  setAmount(50);
                  setNotes("");
                }}
                className="flex-1 px-6 py-3 bg-[#252525] text-white rounded-lg hover:bg-[#2a2a2a] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMint}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-[#00ff88] text-black rounded-lg hover:bg-[#00e677] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Minting..." : "Mint Prescription"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

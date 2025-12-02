"use client";

import { useState, useRef, useEffect } from "react";
import { ethers } from "ethers";

import { doctorSignPrescription } from "@/lib/prescription/signature";
import { getPrescriptionContract, mintPrescription } from "@/lib/prescription/contract";

const COMMON_MEDICATIONS = [
  "Acetaminophen",
  "Amoxicillin",
  "Aspirin",
  "Atorvastatin",
  "Azithromycin",
  "Ciprofloxacin",
  "Clopidogrel",
  "Doxycycline",
  "Gabapentin",
  "Hydrocodone",
  "Ibuprofen",
  "Lisinopril",
  "Losartan",
  "Metformin",
  "Metoprolol",
  "Omeprazole",
  "Oxycodone",
  "Pantoprazole",
  "Prednisone",
  "Sertraline",
  "Simvastatin",
  "Tramadol",
  "Trazodone",
  "Warfarin",
  "Albuterol",
  "Amlodipine",
  "Citalopram",
  "Diazepam",
  "Fluoxetine",
  "Levothyroxine",
  "Lorazepam",
  "Montelukast",
  "Metronidazole",
  "Sildenafil",
  "Tamsulosin",
  "Venlafaxine",
  "Zolpidem",
];

interface Patient {
  id: string;
  name: string;
  dob: string;
  address: string;
}

interface ReceiptData {
  tokenId: string | null;
  patientName: string;
  patientId: string;
  medication: string;
  dosage: string;
  instructions: string;
  date: string;
}

export default function PrescriptionDashboard() {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [patients] = useState<Patient[]>([
    { id: "1", name: "John Doe", dob: "01/15/1985", address: "123 Main St, City, State 12345" },
    { id: "2", name: "Jane Smith", dob: "03/22/1990", address: "456 Oak Ave, City, State 12345" },
    { id: "3", name: "Bob Johnson", dob: "07/10/1978", address: "789 Pine Rd, City, State 12345" },
  ]);
  const [numPrescriptions, setNumPrescriptions] = useState(patients.length);

  // Prescription form state
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [medication, setMedication] = useState("");
  const [medicationSearch, setMedicationSearch] = useState("");
  const [showMedicationDropdown, setShowMedicationDropdown] = useState(false);
  const [amount, setAmount] = useState(50);
  const [amountInput, setAmountInput] = useState("50");
  const [notes, setNotes] = useState("");
  const medicationInputRef = useRef<HTMLDivElement>(null);
  const patientDropdownRef = useRef<HTMLDivElement>(null);

  // Filter medications based on search
  const filteredMedications = COMMON_MEDICATIONS.filter((med) =>
    med.toLowerCase().includes(medicationSearch.toLowerCase())
  );

  // Handle clicks outside the dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        medicationInputRef.current &&
        !medicationInputRef.current.contains(event.target as Node)
      ) {
        setShowMedicationDropdown(false);
      }
      if (
        patientDropdownRef.current &&
        !patientDropdownRef.current.contains(event.target as Node)
      ) {
        setShowPatientDropdown(false);
      }
    }

    if (showMedicationDropdown || showPatientDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMedicationDropdown, showPatientDropdown]);

  // Handle medication selection
  const handleMedicationSelect = (med: string) => {
    setMedication(med);
    setMedicationSearch(med);
    setShowMedicationDropdown(false);
  };

  // Handle patient selection
  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowPatientDropdown(false);
  };

  // Handle amount input change
  const handleAmountInputChange = (value: string) => {
    setAmountInput(value);
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 1000) {
      setAmount(numValue);
    }
  };

  // Handle amount slider change
  const handleAmountSliderChange = (value: number) => {
    setAmount(value);
    setAmountInput(value.toString());
  };

  // Check if form is valid
  const isFormValid = selectedPatient && medication && notes && amount > 0;

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

      if (!selectedPatient || !medication || !notes || amount <= 0) {
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

      // Update prescription count
      setNumPrescriptions(numPrescriptions + 1);

      // Store receipt data and show success view
      setReceiptData({
        tokenId: tokenId,
        patientName: selectedPatient?.name || "",
        patientId: selectedPatient?.id || "",
        medication: medication || "",
        dosage: `${amount}mg`,
        instructions: notes || "",
        date: new Date().toLocaleString(),
      });

      // Reset form and close modal
      setSelectedPatient(null);
      setMedication("");
      setMedicationSearch("");
      setAmount(50);
      setAmountInput("50");
      setNotes("");
      setShowMedicationDropdown(false);
      setShowPatientDropdown(false);
      setShowModal(false);

      // Show success view
      setShowSuccess(true);
    } catch (error) {
      console.error("Error minting prescription:", error);
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  // Show success/receipt view
  if (showSuccess && receiptData) {
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
              <p className="text-gray-400 text-sm">Transaction Date: {receiptData.date}</p>
            </div>

            <div className="space-y-6">
              {/* Token ID Section */}
              {receiptData.tokenId && (
                <div className="bg-[#252525] rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">NFT Token ID</p>
                      <p className="text-xl font-mono font-semibold text-[#00ff88]">{receiptData.tokenId}</p>
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
                    <span className="font-medium">{receiptData.patientName || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Patient ID:</span>
                    <span className="font-medium">{receiptData.patientId || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Prescription Details */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-300">Prescription Details</h3>
                <div className="bg-[#252525] rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-gray-400">Medication:</span>
                    <span className="font-medium text-right">{receiptData.medication || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Dosage:</span>
                    <span className="font-medium">{receiptData.dosage || "N/A"}</span>
                  </div>
                  {receiptData.instructions && (
                    <div className="pt-2 border-t border-gray-700">
                      <p className="text-gray-400 mb-2">Instructions:</p>
                      <p className="text-gray-300 whitespace-pre-wrap">{receiptData.instructions}</p>
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
              onClick={() => setShowSuccess(false)}
              className="px-8 py-3 bg-[#00ff88] text-black rounded-lg hover:bg-[#00e677] transition-colors font-medium text-lg"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show dashboard view
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
                        setSelectedPatient(patient);
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
                <p className="text-3xl font-bold text-[#00ff88]">{ numPrescriptions }</p>
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
              {/* Patient Selection Dropdown */}
              <div className="relative" ref={patientDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowPatientDropdown(!showPatientDropdown)}
                  className="w-full bg-[#252525] border border-gray-700 rounded-lg px-4 py-3 text-left text-white focus:outline-none focus:border-[#00ff88] flex items-center justify-between"
                >
                  <span className={selectedPatient ? "text-white" : "text-gray-500"}>
                    {selectedPatient ? `${selectedPatient.name} (ID: ${selectedPatient.id})` : "Select Patient"}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${showPatientDropdown ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showPatientDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-[#252525] border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {patients.map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() => handlePatientSelect(patient)}
                        className="w-full text-left px-4 py-3 text-white hover:bg-[#1a1a1a] transition-colors first:rounded-t-lg last:rounded-b-lg"
                      >
                        <div className="font-medium">{patient.name}</div>
                        <div className="text-sm text-gray-400">ID: {patient.id} • DOB: {patient.dob}</div>
                        <div className="text-sm text-gray-400">{patient.address}</div>
                      </button>
                    ))}
                  </div>
                )}
                {/* Display selected patient info */}
                {selectedPatient && (
                  <div className="mt-2 p-3 bg-[#252525] border border-gray-700 rounded-lg">
                    <div className="text-sm text-gray-300 space-y-1">
                      <div><span className="text-gray-500">ID:</span> {selectedPatient.id}</div>
                      <div><span className="text-gray-500">DOB:</span> {selectedPatient.dob}</div>
                      <div><span className="text-gray-500">Address:</span> {selectedPatient.address}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Medication - Only show when patient is selected */}
              {selectedPatient && (
                <div className="relative" ref={medicationInputRef}>
                  <input
                    type="text"
                    placeholder="Search medication..."
                    value={medicationSearch}
                    onChange={(e) => {
                      setMedicationSearch(e.target.value);
                      setMedication(e.target.value);
                      setShowMedicationDropdown(true);
                    }}
                    onFocus={() => setShowMedicationDropdown(true)}
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
                  {showMedicationDropdown && filteredMedications.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-[#252525] border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredMedications.map((med) => (
                        <button
                          key={med}
                          type="button"
                          onClick={() => handleMedicationSelect(med)}
                          className="w-full text-left px-4 py-2 text-white hover:bg-[#1a1a1a] transition-colors first:rounded-t-lg last:rounded-b-lg"
                        >
                          {med}
                        </button>
                      ))}
                    </div>
                  )}
                  {showMedicationDropdown && medicationSearch && filteredMedications.length === 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-[#252525] border border-gray-700 rounded-lg shadow-lg px-4 py-3 text-gray-400">
                      No medications found
                    </div>
                  )}
                </div>
              )}

              {/* Amount - Only show when medication is selected */}
              {medication && (
                <div>
                  <label className="block text-white mb-2">Amount (mg)</label>
                  <div className="flex gap-4 items-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={amountInput}
                      onChange={(e) => handleAmountInputChange(e.target.value)}
                      className="w-18 bg-[#252525] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#00ff88] disabled:opacity-50"
                    />
                    <div className="flex-1 bg-[#252525] border border-gray-700 rounded-lg p-3">
                      <input
                        type="range"
                        min="0"
                        max="1000"
                        step="10"
                        value={amount}
                        onChange={(e) => handleAmountSliderChange(Number(e.target.value))}
                        className="w-full h-2 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer accent-[#00ff88]"
                        style={{
                          background: `linear-gradient(to right, #00ff88 0%, #00ff88 ${(amount / 1000) * 100}%, #1a1a1a ${(amount / 1000) * 100}%, #1a1a1a 100%)`
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Notes - Only show when medication is selected */}
              {medication && (
                <div>
                  <textarea
                    placeholder="Notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full bg-[#252525] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff88] resize-none"
                  />
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedPatient(null);
                  setMedication("");
                  setMedicationSearch("");
                  setAmount(50);
                  setAmountInput("50");
                  setNotes("");
                  setShowMedicationDropdown(false);
                  setShowPatientDropdown(false);
                }}
                className="flex-1 px-6 py-3 bg-[#252525] text-white rounded-lg hover:bg-[#2a2a2a] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMint}
                disabled={loading || !isFormValid}
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

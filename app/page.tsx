"use client";
import { useState } from 'react';
// Note: The import path uses "@/utils" which points to your root folder
import { calculateFinancialRisk } from './riskCalculator';

export default function Home() {
  const [domain, setDomain] = useState('');
  const [industry, setIndustry] = useState('marketing');
  const [employees, setEmployees] = useState(5);
  
  const [showResults, setShowResults] = useState(false);
  const [riskScore, setRiskScore] = useState(0);
  const [financialLoss, setFinancialLoss] = useState(0);

  const handleScan = () => {
    // MOCK DATA: Simulating a result similar to your "Risk Report" PDF
    const mockScore = 45; 
    const loss = calculateFinancialRisk(industry, employees, mockScore);
    
    setRiskScore(mockScore);
    setFinancialLoss(loss);
    setShowResults(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-800">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 p-6">
          <h1 className="text-2xl font-bold text-white">Collective Vision</h1>
          <p className="text-slate-400">Prospect Intelligence Tool</p>
        </div>

        {/* Input Form */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Prospect Domain</label>
            <input 
              type="text" 
              placeholder="company.com" 
              className="w-full p-2 border rounded"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Industry</label>
              <select 
                className="w-full p-2 border rounded"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              >
                <option value="marketing">Marketing & Advertising</option>
                <option value="finance">Finance</option>
                <option value="retail">Retail</option>
                <option value="manufacturing">Manufacturing</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Employees</label>
              <select 
                className="w-full p-2 border rounded"
                value={employees}
                onChange={(e) => setEmployees(Number(e.target.value))}
              >
                <option value="5">1 - 10</option>
                <option value="25">11 - 50</option>
                <option value="100">50+</option>
              </select>
            </div>
          </div>

          <button 
            onClick={handleScan}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded transition"
          >
            Generate Insights
          </button>
        </div>

        {/* Results Section */}
        {showResults && (
          <div className="bg-slate-100 p-6 border-t">
            <h2 className="text-xl font-bold mb-4">Initial Findings for {domain}</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white p-4 rounded shadow">
                <p className="text-sm text-slate-500">Security Score</p>
                <p className="text-3xl font-bold text-red-500">{riskScore}/100</p>
                <p className="text-xs text-red-600 font-semibold mt-1">HIGH RISK</p>
              </div>
              <div className="bg-white p-4 rounded shadow">
                <p className="text-sm text-slate-500">Est. Financial Exposure</p>
                <p className="text-3xl font-bold text-slate-900">£{financialLoss.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-1">Based on industry avg</p>
              </div>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-sm text-yellow-800">
                <strong>Insight:</strong> Similar companies in {industry} face an average breach cost of 
                <strong> £{(4500000).toLocaleString()}</strong>. 
                Your current exposure is manageable but requires immediate attention.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
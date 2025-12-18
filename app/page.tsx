"use client";
import { useState } from 'react';
import Image from 'next/image';
import { calculateFinancialRisk } from './riskCalculator';
import { scanDomain } from './actions';

export default function Home() {
  const [domain, setDomain] = useState('');
  const [industry, setIndustry] = useState('marketing');
  const [employees, setEmployees] = useState(5);
  
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  // State for metrics
  const [riskScore, setRiskScore] = useState(0);
  const [financialLoss, setFinancialLoss] = useState(0);
  const [issues, setIssues] = useState<string[]>([]);
  const [passes, setPasses] = useState<string[]>([]);

  const handleScan = async () => {
    if (!domain) return;
    setLoading(true);
    setShowResults(false);

    // 1. Run the Real Engine
    const result = await scanDomain(domain);
    
    // 2. Calculate Financials
    const loss = calculateFinancialRisk(industry, employees, result.score);
    
    setRiskScore(result.score);
    setFinancialLoss(loss);
    setIssues(result.issues);
    setPasses(result.passes);
    
    setLoading(false);
    setShowResults(true);
  };

  return (
    // BRANDING: Main background changed to Dark Slate (Cyber aesthetic)
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      
      {/* Top Navigation Bar - UPDATED: CENTERED TITLE */}
      <nav className="border-b border-slate-700 bg-slate-950 p-4">
        <div className="max-w-6xl mx-auto relative flex items-center justify-between h-16">
          
          {/* Left: Logo (Wider container) */}
          <div className="relative h-16 w-48 shrink-0">
             <Image 
               src="/logo.png" 
               alt="Collective Security Logo"
               fill
               className="object-contain object-left"
               priority
             />
          </div>

          {/* Center: Collective Vision Title */}
          {/* Absolute positioning locks it to the center of the bar */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <h1 className="text-2xl md:text-3xl font-bold tracking-widest uppercase whitespace-nowrap">
              COLLECTIVE <span className="text-emerald-400">VISION</span>
            </h1>
          </div>

          {/* Right: Subtitle (Hidden on mobile to prevent overlap) */}
          <span className="hidden md:block text-xs font-mono text-slate-500 uppercase tracking-widest">
            Prospect Intelligence
          </span>
          
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-8">
        
        {/* Input Card */}
        <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-1 md:col-span-3">
              <label className="block text-xs font-bold text-emerald-400 uppercase mb-2 tracking-wider">Target Domain</label>
              <input 
                type="text" 
                placeholder="company.com" 
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Industry Sector</label>
              <select 
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-emerald-500 outline-none"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              >
                <option value="marketing">Marketing & Advertising</option>
                <option value="finance">Finance & Legal</option>
                <option value="retail">Retail & E-commerce</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="other">Other Services</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Company Size</label>
              <select 
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-emerald-500 outline-none"
                value={employees}
                onChange={(e) => setEmployees(Number(e.target.value))}
              >
                <option value="5">1 - 10 Employees</option>
                <option value="25">11 - 50 Employees</option>
                <option value="100">50+ Employees</option>
              </select>
            </div>
            <div className="flex items-end">
              <button 
                onClick={handleScan}
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold py-3 rounded-lg shadow-lg transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Initializing Scanner..." : "RUN DIAGNOSTIC"}
              </button>
            </div>
          </div>
        </div>

        {/* Results Dashboard */}
        {showResults && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Top Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: Risk Score */}
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${riskScore < 70 ? 'from-red-500/20' : 'from-emerald-500/20'} rounded-bl-full`}></div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Security Posture</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-5xl font-black ${riskScore < 70 ? 'text-red-500' : 'text-emerald-400'}`}>
                    {riskScore}
                  </span>
                  <span className="text-slate-500">/100</span>
                </div>
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700">
                  <div className={`w-2 h-2 rounded-full ${riskScore < 70 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                  <span className={`text-xs font-bold ${riskScore < 70 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {riskScore < 70 ? 'CRITICAL ATTENTION NEEDED' : 'OPTIMAL CONFIGURATION'}
                  </span>
                </div>
              </div>

              {/* Card 2: Financial Impact */}
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Est. Financial Exposure</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">
                    £{financialLoss.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                  Projected loss based on {industry} industry averages and {issues.length} detected vulnerabilities.
                </p>
              </div>

              {/* Card 3: Dark Web Teaser */}
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col justify-between relative">
                {/* Lock Overlay */}
                <div className="absolute top-4 right-4 text-slate-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Dark Web Surveillance</p>
                  <p className="text-lg font-semibold text-white">Credential Check</p>
                </div>
                <div className="mt-4 bg-slate-900/50 rounded p-3 border border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-1">Status:</p>
                  <p className="text-sm text-yellow-500 font-mono">⚠ PENDING AUTHENTICATION</p>
                </div>
                <button className="mt-4 w-full text-xs bg-slate-700 hover:bg-slate-600 text-white py-2 rounded transition font-bold uppercase">
                  Request Deep Scan
                </button>
              </div>
            </div>

            {/* Detailed Findings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Failed Checks */}
              {issues.length > 0 && (
                <div className="bg-slate-800 rounded-xl border-l-4 border-red-500 p-6 shadow-lg">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Security Gaps Detected
                  </h3>
                  <ul className="space-y-3">
                    {issues.map((issue, index) => (
                      <li key={index} className="flex items-start gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                        <span className="mt-1 w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></span>
                        <span className="text-sm text-red-200 font-medium">{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Passed Checks */}
              <div className="bg-slate-800 rounded-xl border-l-4 border-emerald-500 p-6 shadow-lg">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Secured Perimeters
                </h3>
                {passes.length > 0 ? (
                  <ul className="space-y-3">
                    {passes.map((pass, index) => (
                      <li key={index} className="flex items-start gap-3 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                        <span className="mt-1 w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0"></span>
                        <span className="text-sm text-emerald-100 font-medium">{pass}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500 text-sm italic">No secured assets detected yet.</p>
                )}
              </div>
            </div>

            {/* Call to Action Footer */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-8 text-center">
              <h3 className="text-xl font-bold text-white mb-2">Full Security Audit Available</h3>
              <p className="text-slate-400 text-sm max-w-2xl mx-auto mb-6">
                This report represents a non-intrusive external scan. Deep inspection of endpoints, dark web credentials, and internal vulnerabilities requires authorization.
              </p>
              <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-emerald-500/20 transition">
                Generate Full Client Report
              </button>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}
"use client";
import { useState } from 'react';
import Image from 'next/image';
import { calculateFinancialRisk } from './riskCalculator';
import { scanDomain } from './actions';

interface FixData {
  title: string;
  type: string;
  code: string;
  explanation: string;
  steps: string[];
}

// 1. Advice Database for CMS Platforms
const cmsAdvice: Record<string, string> = {
  "WordPress": "WordPress is the most targeted CMS in the world. Ensure you are using a security plugin (like Wordfence), change the default 'admin' username, and keep all plugins auto-updated.",
  "Shopify": "Shopify is generally secure, but risk lies in third-party apps. Audit your installed apps regularly and ensure Two-Factor Authentication (2FA) is enforced for all staff accounts.",
  "Wix": "Wix manages most security for you, but you are vulnerable to social engineering. Ensure your domain DNS is locked and 2FA is active on your Wix account.",
  "Squarespace": "Squarespace is a closed ecosystem. Your main risk is weak passwords. Enforce strong password policies for all contributors and limit permissions.",
  "Joomla": "Joomla requires strict maintenance. Rename your 'htaccess.txt' to '.htaccess' to activate built-in firewall rules and remove unused extensions immediately.",
  "Drupal": "Drupal is powerful but complex. Ensure you are subscribed to Drupal Security Advisories and apply core security patches within hours of release.",
  "Unknown": "We could not identify a specific CMS. This often means a custom build, which requires a manual code audit to ensure no hidden vulnerabilities exist."
};

export default function Home() {
  const [domain, setDomain] = useState('');
  const [industry, setIndustry] = useState('marketing');
  const [employees, setEmployees] = useState(5);
  
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  const [riskScore, setRiskScore] = useState(0);
  const [financialLoss, setFinancialLoss] = useState(0);
  const [issues, setIssues] = useState<string[]>([]);
  const [passes, setPasses] = useState<string[]>([]);
  const [detectedCMS, setDetectedCMS] = useState<string | null>(null);

  const [selectedFix, setSelectedFix] = useState<FixData | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleScan = async () => {
    if (!domain) return;
    setLoading(true);
    setShowResults(false);
    setSelectedFix(null);
    setCopySuccess(false);

    const result = await scanDomain(domain);
    const loss = calculateFinancialRisk(industry, employees, result.score);
    
    setRiskScore(result.score);
    setFinancialLoss(loss);
    setIssues(result.issues);
    setPasses(result.passes);
    setDetectedCMS(result.cms);
    
    setLoading(false);
    setShowResults(true);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const generateFix = (issue: string) => {
    setCopySuccess(false);
    if (issue.includes("DMARC")) {
      setSelectedFix({
        title: "DMARC Implementation Guide",
        type: "TXT Record",
        code: `Host: _dmarc\nValue: v=DMARC1; p=none; rua=mailto:admin@${domain}`,
        explanation: "This record puts your email domain into 'Monitoring Mode'. It does not block any emails yet (so it is safe to install), but it will start sending you reports on who is sending email as your company.",
        steps: [
            "Log in to your DNS Provider.",
            "Go to 'DNS Management'.",
            "Add a new record: Select 'TXT' as the type.",
            "Paste '_dmarc' into the Host/Name field.",
            "Paste the code below into the Value/Content field.",
            "⚠ IMPORTANT: Change 'admin@...' to the actual IT email address.",
            "Save. Changes can take up to 48 hours to propagate."
        ]
      });
    }
    else if (issue.includes("SPF")) {
      setSelectedFix({
        title: "SPF Record Template",
        type: "TXT Record",
        code: `Host: @\nValue: v=spf1 include:_spf.google.com include:spf.protection.outlook.com ~all`,
        explanation: "This template lists exactly which services are allowed to send email for you. This template authorizes Google and Outlook.",
        steps: [
            "Log in to your DNS Provider.",
            "Go to 'DNS Management'.",
            "Add a new record: Select 'TXT' as the type.",
            "Type '@' into the Host/Name field.",
            "Paste the code below into the Value field.",
            "⚠ IMPORTANT: If you use Mailchimp or HubSpot, ask IT to add them to this list."
        ]
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      
      {/* Top Navigation */}
      <nav className="border-b border-slate-700 bg-slate-950 p-4">
        <div className="max-w-6xl mx-auto relative flex items-center justify-between h-16">
          <div className="relative h-16 w-32 md:w-48 shrink-0">
             <Image src="/logo.png" alt="Collective Security Logo" fill className="object-contain object-left" priority />
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center hidden md:block">
            <h1 className="text-2xl md:text-3xl font-bold tracking-widest uppercase whitespace-nowrap">
              COLLECTIVE <span className="text-emerald-400">VISION</span>
            </h1>
          </div>
          {showResults && (
            <button onClick={() => window.print()} className="text-xs bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 px-4 py-2 rounded flex items-center gap-2 transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              <span className="hidden sm:inline">Export PDF</span>
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-8">
        
        {/* Input Card */}
        <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700 mb-8 input-card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-1 md:col-span-3">
              <label className="block text-xs font-bold text-emerald-400 uppercase mb-2 tracking-wider">Target Domain</label>
              <input type="text" placeholder="company.com" className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition" value={domain} onChange={(e) => setDomain(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Industry Sector</label>
              <select className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-emerald-500 outline-none" value={industry} onChange={(e) => setIndustry(e.target.value)}>
                <option value="marketing">Marketing & Advertising</option>
                <option value="finance">Finance & Legal</option>
                <option value="retail">Retail & E-commerce</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="other">Other Services</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Company Size</label>
              <select className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-emerald-500 outline-none" value={employees} onChange={(e) => setEmployees(Number(e.target.value))}>
                <option value="5">1 - 10 Employees</option>
                <option value="25">11 - 50 Employees</option>
                <option value="100">50+ Employees</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={handleScan} disabled={loading} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold py-3 rounded-lg shadow-lg transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
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

              {/* Card 3: Technology Intelligence (CMS) */}
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col justify-between relative">
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Technology Intelligence</p>
                  <p className="text-xl font-bold text-white mb-1">
                    {detectedCMS ? detectedCMS : "Unknown Platform"}
                  </p>
                  <div className="w-full h-1 bg-slate-700 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-blue-500 w-2/3"></div>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {detectedCMS ? cmsAdvice[detectedCMS] : cmsAdvice["Unknown"]}
                  </p>
                </div>
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
                      <li key={index} className="flex flex-col gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                        <div className="flex items-start gap-3">
                            <span className="mt-1 w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></span>
                            <span className="text-sm text-red-200 font-medium">{issue}</span>
                        </div>
                        {(issue.includes("DMARC") || issue.includes("SPF")) && (
                            <button onClick={() => generateFix(issue)} className="ml-5 text-xs bg-red-500/20 hover:bg-red-500/40 text-red-200 py-1 px-3 rounded border border-red-500/30 w-fit transition flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                GENERATE DNS FIX
                            </button>
                        )}
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

            {/* REMEDIATION BOX */}
            {selectedFix && (
                <div className="bg-slate-800 rounded-xl border border-slate-600 p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-2 scroll-mt-6" id="fix-box">
                    <div className="flex justify-between items-start mb-4 border-b border-slate-700 pb-4">
                        <div>
                            <h3 className="text-emerald-400 font-bold text-lg">{selectedFix.title}</h3>
                            <p className="text-slate-400 text-sm mt-1">{selectedFix.explanation}</p>
                        </div>
                        <button onClick={() => setSelectedFix(null)} className="text-slate-500 hover:text-white p-2">✕</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Configuration Record</p>
                            <div className="bg-slate-950 p-4 rounded-lg border border-slate-700 font-mono text-sm text-emerald-300 break-all relative group">
                                {selectedFix.code}
                                <button onClick={() => handleCopy(selectedFix.code)} className={`absolute top-2 right-2 text-xs px-2 py-1 rounded transition font-bold border ${copySuccess ? "bg-emerald-500 text-white border-emerald-500" : "bg-slate-800 text-white border-slate-600 opacity-0 group-hover:opacity-100"}`}>
                                    {copySuccess ? "Copied! ✓" : "Copy"}
                                </button>
                            </div>
                            {selectedFix.title.includes("DMARC") && <p className="text-xs text-yellow-500 mt-2">⚠ <strong>Action Required:</strong> Change <strong>admin@{domain}</strong> to a valid email.</p>}
                            {selectedFix.title.includes("SPF") && <p className="text-xs text-yellow-500 mt-2">⚠ Note: Add any other email services (Mailchimp/HubSpot) before saving.</p>}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Implementation Steps</p>
                            <ol className="list-decimal pl-4 space-y-2 text-sm text-slate-300">{selectedFix.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-8 text-center">
              <h3 className="text-xl font-bold text-white mb-2">Full Security Audit Available</h3>
              <p className="text-slate-400 text-sm max-w-2xl mx-auto mb-6">This report represents a non-intrusive external scan. Deep inspection requires authorization.</p>
              <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-emerald-500/20 transition">Generate Full Client Report</button>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}
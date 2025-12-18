// app/actions.ts
"use server";

import dns from 'dns/promises';

export async function scanDomain(domain: string) {
  const cleanDomain = domain.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];
  
  let score = 100;
  const issues: string[] = [];
  const passes: string[] = [];

  // --- PART 1: EMAIL SECURITY (DNS) ---
  try {
    const txtRecords = await dns.resolveTxt(cleanDomain).catch(() => []);
    
    // Check SPF
    const spfRecord = txtRecords.flat().find(r => r.includes("v=spf1"));
    if (!spfRecord) {
      score -= 20;
      issues.push("Missing SPF Record (High Phishing Risk)");
    } else if (spfRecord.includes("+all")) {
      score -= 20;
      issues.push("SPF Record allows 'anyone' to send email (Critical Risk)");
    } else {
      passes.push("SPF Record Detected (Email Identity)");
    }

    // Check DMARC
    const dmarcRecords = await dns.resolveTxt(`_dmarc.${cleanDomain}`).catch(() => []);
    const dmarcRecord = dmarcRecords.flat().find(r => r.includes("v=DMARC1"));
    if (!dmarcRecord) {
      score -= 30;
      issues.push("Missing DMARC Record (Email Spoofing Possible)");
    } else if (dmarcRecord.includes("p=none")) {
      score -= 10;
      issues.push("DMARC Policy is weak ('p=none')");
    } else {
      passes.push("DMARC Record Active (Spoofing Protection)");
    }
  } catch (error) {
    issues.push("DNS Lookup failed");
  }

  // --- PART 2: WEB SECURITY (Headers & SSL) ---
  try {
    const response = await fetch(`https://${cleanDomain}`, { 
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store', // <--- This ensures every scan is fresh
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    // 1. HSTS Check
    if (!response.headers.get('strict-transport-security')) {
      score -= 10;
      issues.push("Missing HSTS Header (Vulnerable to Downgrade Attacks)");
    } else {
      passes.push("HSTS Enabled (Secure Connections Only)");
    }

    // 2. Content Sniffing Check
    if (!response.headers.get('x-content-type-options')) {
      score -= 5;
      issues.push("Missing X-Content-Type-Options (File Execution Risk)");
    } else {
      passes.push("Content Sniffing Protection Active");
    }

    // 3. Clickjacking Check
    const xFrame = response.headers.get('x-frame-options');
    const csp = response.headers.get('content-security-policy');
    const hasFrameProtection = xFrame || (csp && csp.includes('frame-ancestors'));

    if (!hasFrameProtection) {
      score -= 5;
      issues.push("Missing Clickjacking Protection (X-Frame-Options or CSP)");
    } else {
      passes.push("Clickjacking Protection Active");
    }

  } catch (error) {
    // We only penalize slightly here as some sites just block scanners
    issues.push("Could not scan Website Headers (Site may be blocking bots)");
  }

  return { 
    score: Math.max(0, score), 
    issues,
    passes 
  };
}
// app/actions.ts
"use server";

import dns from 'dns/promises';

export async function scanDomain(domain: string) {
  // Clean the domain input (remove http:// or www)
  const cleanDomain = domain.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];

  let score = 100; // Start with a perfect score
  const issues = [];

  try {
    // 1. Check SPF Record (Sender Policy Framework)
    // We look for TXT records starting with "v=spf1"
    const txtRecords = await dns.resolveTxt(cleanDomain).catch(() => []);
    const spfRecord = txtRecords.flat().find(r => r.includes("v=spf1"));

    if (!spfRecord) {
      score -= 20;
      issues.push("Missing SPF Record (High Phishing Risk)");
    } else if (spfRecord.includes("-all")) {
      // Best practice: Hard Fail
    } else {
      score -= 5;
      issues.push("Weak SPF Record (Soft Fail allowed)");
    }

    // 2. Check DMARC Record
    // We look for a TXT record at _dmarc.domain.com
    const dmarcRecords = await dns.resolveTxt(`_dmarc.${cleanDomain}`).catch(() => []);
    const dmarcRecord = dmarcRecords.flat().find(r => r.includes("v=DMARC1"));

    if (!dmarcRecord) {
      score -= 30;
      issues.push("Missing DMARC Record (Email Spoofing Possible)");
    } else if (dmarcRecord.includes("p=none")) {
      score -= 15;
      issues.push("DMARC set to 'None' (Monitoring only, not blocking)");
    }

    // Return the real results
    return { 
      score: Math.max(0, score), // Ensure score doesn't go below 0
      issues 
    };

  } catch (error) {
    // If the domain doesn't exist or DNS fails
    return { 
      score: 0, 
      issues: ["Domain lookup failed or invalid domain"] 
    };
  }
}
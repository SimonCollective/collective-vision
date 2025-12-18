"use server";

import dns from 'dns/promises';
import tls from 'tls';

// Helper: Check SSL Details
async function getSSLDetails(domain: string) {
  return new Promise<{ daysRemaining: number, valid: boolean, issuer: string } | null>((resolve) => {
    try {
      const socket = tls.connect({
        host: domain,
        port: 443,
        servername: domain, // SNI: Required for modern hosting
        rejectUnauthorized: false, // We want to see the cert even if it's expired
        timeout: 3000 // 3 second timeout
      }, () => {
        const cert = socket.getPeerCertificate();
        if (!cert || Object.keys(cert).length === 0) {
          socket.end();
          resolve(null);
          return;
        }
        
        const validTo = new Date(cert.valid_to);
        const daysRemaining = Math.floor((validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        socket.end();
        resolve({
          daysRemaining,
          valid: daysRemaining > 0,
          issuer: cert.issuer.O || "Unknown Issuer"
        });
      });

      socket.on('error', () => resolve(null));
      socket.on('timeout', () => { socket.destroy(); resolve(null); });
    } catch (e) {
      resolve(null);
    }
  });
}

export async function scanDomain(domain: string) {
  // 1. Clean the domain
  const cleanDomain = domain.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];
  
  let score = 100;
  const issues: string[] = [];
  const passes: string[] = [];

  // --- PART 1: SSL CERTIFICATE CHECK (NEW) ---
  const sslData = await getSSLDetails(cleanDomain);
  
  if (sslData) {
    if (!sslData.valid) {
      score -= 20;
      issues.push(`SSL Certificate has EXPIRED (Critical Security Risk)`);
    } else if (sslData.daysRemaining < 14) {
      score -= 10;
      issues.push(`SSL Expires soon (${sslData.daysRemaining} days remaining) - Renew Immediately`);
    } else {
      passes.push(`SSL Certificate Valid (${sslData.daysRemaining} days remaining)`);
    }
  } else {
    // If we can't connect via SSL at all
    score -= 20;
    issues.push("No SSL/TLS Certificate found (Not Secure)");
  }

  // --- PART 2: EMAIL SECURITY (DNS) ---
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

  // --- PART 3: WEB SECURITY (Headers) ---
  try {
    const response = await fetch(`https://${cleanDomain}`, { 
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
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
    // If fetch failed but SSL Check (Part 1) worked, it might just be a 403/404 error, which is fine.
    // If SSL check also failed, we already deducted points there.
  }

  return { 
    score: Math.max(0, score), 
    issues,
    passes 
  };
}
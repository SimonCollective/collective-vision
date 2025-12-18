"use server";

import dns from 'dns/promises';
import tls from 'tls';
import net from 'net';

// Helper 1: Check SSL Details
async function getSSLDetails(domain: string) {
  return new Promise<{ daysRemaining: number, valid: boolean, issuer: string } | null>((resolve) => {
    try {
      const socket = tls.connect({
        host: domain,
        port: 443,
        servername: domain,
        rejectUnauthorized: false,
        timeout: 3000
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

// Helper 2: Check Single Port
async function checkPort(domain: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(2500); // 2.5s timeout

        socket.on('connect', () => {
            socket.destroy();
            resolve(true); // Connection SUCCESS means the port is OPEN (Bad news)
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve(false); // Timeout means firewall dropped it (Good news)
        });

        socket.on('error', () => {
            socket.destroy();
            resolve(false); // Connection refused (Good news)
        });

        socket.connect(port, domain);
    });
}

export async function scanDomain(domain: string) {
  // 1. Clean the domain
  const cleanDomain = domain.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];
  
  let score = 100;
  const issues: string[] = [];
  const passes: string[] = [];

  // --- PART 1: PORT SCANNING (NEW) ---
  // We run these in parallel (Promise.all) so it doesn't slow down the app
  const portsToCheck = [
      { port: 21, service: "FTP (File Transfer)", risk: "High" },
      { port: 22, service: "SSH (Admin Access)", risk: "Medium" },
      { port: 3389, service: "RDP (Remote Desktop)", risk: "Critical" },
      { port: 3306, service: "MySQL Database", risk: "Critical" },
      { port: 5432, service: "PostgreSQL Database", risk: "Critical" },
  ];

  try {
      const portResults = await Promise.all(
          portsToCheck.map(async (target) => {
              const isOpen = await checkPort(cleanDomain, target.port);
              return { ...target, isOpen };
          })
      );

      let openPortsFound = 0;

      portResults.forEach(res => {
          if (res.isOpen) {
              openPortsFound++;
              score -= (res.risk === "Critical" ? 20 : 10); // Deduct points
              issues.push(`Open Port Detected: ${res.port} - ${res.service}`);
          }
      });

      if (openPortsFound === 0) {
          passes.push("Critical Ports (Database/RDP) are Closed/Firewalled");
      }

  } catch (error) {
      // If port scan fails completely (rare), we just ignore it
  }

  // --- PART 2: SSL CERTIFICATE CHECK ---
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
    score -= 20;
    issues.push("No SSL/TLS Certificate found (Not Secure)");
  }

  // --- PART 3: EMAIL SECURITY (DNS) ---
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

  // --- PART 4: WEB SECURITY (Headers) ---
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
    // Silent fail for web headers if site is down
  }

  return { 
    score: Math.max(0, score), 
    issues,
    passes 
  };
}
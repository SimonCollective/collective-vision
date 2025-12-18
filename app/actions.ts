"use server";

import dns from 'dns/promises';
import tls from 'tls';
import net from 'net';

// --- HELPER 1: SSL CHECKER ---
async function getSSLDetails(domain: string) {
  return new Promise<{ daysRemaining: number, valid: boolean, issuer: string } | null>((resolve) => {
    try {
      const socket = tls.connect({
        host: domain,
        port: 443,
        servername: domain,
        rejectUnauthorized: false, // Allow us to see expired certs without crashing
        timeout: 4000
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
        resolve({ daysRemaining, valid: daysRemaining > 0, issuer: cert.issuer.O || "Unknown" });
      });
      socket.on('error', () => resolve(null));
      socket.on('timeout', () => { socket.destroy(); resolve(null); });
    } catch (e) { resolve(null); }
  });
}

// --- HELPER 2: PORT SCANNER ---
async function checkPort(domain: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(2500);
        socket.on('connect', () => { socket.destroy(); resolve(true); });
        socket.on('timeout', () => { socket.destroy(); resolve(false); });
        socket.on('error', () => { socket.destroy(); resolve(false); });
        socket.connect(port, domain);
    });
}

// --- HELPER 3: ADVANCED CMS DETECTOR (New) ---
// This function looks for multiple clues, not just one.
function identifyCMS(html: string, headers: Headers): string | null {
  const lowerHtml = html.toLowerCase();
  
  // 1. WordPress (Multiple Checks)
  if (
      lowerHtml.includes('/wp-content/') || 
      lowerHtml.includes('/wp-includes/') ||
      lowerHtml.includes('wp-json') ||
      lowerHtml.includes('class="wp-block') ||
      lowerHtml.includes('id="wp-admin-bar') ||
      headers.get('x-powered-by')?.includes('WP Engine')
  ) {
      return "WordPress";
  }

  // 2. Shopify
  if (
      lowerHtml.includes('cdn.shopify.com') || 
      lowerHtml.includes('window.shopify') || 
      lowerHtml.includes('shopify-section')
  ) {
      return "Shopify";
  }

  // 3. Squarespace
  if (
      lowerHtml.includes('static1.squarespace.com') || 
      lowerHtml.includes('squarespace-core') ||
      headers.get('x-served-by') === 'Squarespace'
  ) {
      return "Squarespace";
  }

  // 4. Wix
  if (
      lowerHtml.includes('wix.com') || 
      lowerHtml.includes('wix-warmup-data') ||
      headers.get('x-wix-request-id')
  ) {
      return "Wix";
  }

  // 5. Joomla
  if (lowerHtml.includes('joomla') || lowerHtml.includes('/templates/system/css/system.css')) {
      return "Joomla";
  }

  // 6. Drupal
  if (lowerHtml.includes('drupal') || lowerHtml.includes('sites/default/files')) {
      return "Drupal";
  }

  return null;
}

// --- MAIN ENGINE ---
export async function scanDomain(domain: string) {
  // We keep 'cleanDomain' for DNS/Ports, but we use the original for Fetch to avoid redirect issues
  const cleanDomain = domain.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];
  
  let score = 100;
  const issues: string[] = [];
  const passes: string[] = [];
  let cms: string | null = null;

  // 1. PORT SCAN (Parallel)
  const portsToCheck = [
      { port: 21, service: "FTP", risk: "High" },
      { port: 22, service: "SSH", risk: "Medium" },
      { port: 3389, service: "RDP", risk: "Critical" },
      { port: 3306, service: "MySQL", risk: "Critical" },
      { port: 5432, service: "PostgreSQL", risk: "Critical" },
  ];
  try {
      const portResults = await Promise.all(portsToCheck.map(async (p) => ({ ...p, isOpen: await checkPort(cleanDomain, p.port) })));
      let openPorts = 0;
      portResults.forEach(res => {
          if (res.isOpen) {
              openPorts++;
              score -= (res.risk === "Critical" ? 20 : 10);
              issues.push(`Open Port: ${res.port} (${res.service})`);
          }
      });
      if (openPorts === 0) passes.push("Critical Ports are Firewalled");
  } catch (e) {}

  // 2. SSL CHECK
  const ssl = await getSSLDetails(cleanDomain);
  if (ssl) {
    if (!ssl.valid) { score -= 20; issues.push("SSL Certificate EXPIRED"); }
    else if (ssl.daysRemaining < 14) { score -= 10; issues.push(`SSL Expires soon (${ssl.daysRemaining} days)`); }
    else passes.push(`SSL Valid (${ssl.daysRemaining} days left)`);
  } else {
    score -= 20; issues.push("No SSL Certificate found");
  }

  // 3. DNS SECURITY (Email)
  try {
    const txt = await dns.resolveTxt(cleanDomain).catch(() => []);
    const spf = txt.flat().find(r => r.includes("v=spf1"));
    if (!spf) { score -= 20; issues.push("Missing SPF Record"); }
    else if (spf.includes("+all")) { score -= 20; issues.push("SPF Record unsafe ('+all')"); }
    else passes.push("SPF Record Detected");

    const dmarc = (await dns.resolveTxt(`_dmarc.${cleanDomain}`).catch(() => [])).flat().find(r => r.includes("v=DMARC1"));
    if (!dmarc) { score -= 30; issues.push("Missing DMARC Record"); }
    else if (dmarc.includes("p=none")) { score -= 10; issues.push("DMARC Policy weak ('p=none')"); }
    else passes.push("DMARC Record Active");
  } catch (e) { issues.push("DNS Lookup failed"); }

  // 4. WEB SECURITY & CMS
  try {
    // We use a high-quality User-Agent to prevent 403 blocks from Firewalls
    const response = await fetch(`https://${cleanDomain}`, { 
      method: 'GET',
      redirect: 'follow', // Follows www -> non-www redirects automatically
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const htmlBody = await response.text();
    
    // Run the improved Detective function
    cms = identifyCMS(htmlBody, response.headers);

    // Check Security Headers
    if (!response.headers.get('strict-transport-security')) { score -= 10; issues.push("Missing HSTS Header"); }
    else passes.push("HSTS Enabled");
    
    if (!response.headers.get('x-content-type-options')) { score -= 5; issues.push("Missing X-Content-Type-Options"); }
    else passes.push("Content Sniffing Protection Active");

    const xf = response.headers.get('x-frame-options');
    const csp = response.headers.get('content-security-policy');
    if (!xf && !(csp && csp.includes('frame-ancestors'))) { score -= 5; issues.push("Missing Clickjacking Protection"); }
    else passes.push("Clickjacking Protection Active");

  } catch (e) {
    // If the fetch fails completely, we can't check Headers or CMS
    issues.push("Website Scan Failed (Firewall may be blocking scanner)");
  }

  return { score: Math.max(0, score), issues, passes, cms };
}
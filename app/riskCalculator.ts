// utils/riskCalculator.ts

const INDUSTRY_DATA: Record<string, { baseCost: number; riskMultiplier: number }> = {
  "marketing": { baseCost: 4500000, riskMultiplier: 1.2 }, 
  "finance": { baseCost: 5600000, riskMultiplier: 1.5 },
  "retail": { baseCost: 2000000, riskMultiplier: 1.0 },
  "manufacturing": { baseCost: 1500000, riskMultiplier: 0.9 },
  "other": { baseCost: 1000000, riskMultiplier: 1.0 },
};

export function calculateFinancialRisk(
  industry: string, 
  employeeCount: number, 
  securityScore: number
) {
  const data = INDUSTRY_DATA[industry] || INDUSTRY_DATA["other"];
  
  let sizeFactor = 0;
  if (employeeCount < 10) sizeFactor = 0.002;
  else if (employeeCount < 50) sizeFactor = 0.005;
  else sizeFactor = 0.015;

  const vulnerabilityFactor = (100 - securityScore) / 100;
  const estimatedLoss = data.baseCost * sizeFactor * vulnerabilityFactor;

  return Math.ceil(estimatedLoss / 100) * 100;
}
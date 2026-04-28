const { calculateRiskScore } = require('./src/lib/lightweightRiskModel.js');

console.log('=== Testing Excellent Profile ===');
const excellentMetrics = {
  totalVolume: 8000,
  uniqueCounterparties: 40,
  assetDiversity: 8,
  nightDayRatio: 0.15,
};

const excellentResult = calculateRiskScore(excellentMetrics);
console.log('Excellent result:', excellentResult);
console.log('Risk score:', excellentResult.riskScore);
console.log('Expected: <= 30');
console.log('');

console.log('=== Testing Risky Profile ===');
const riskyMetrics = {
  totalVolume: 500,
  uniqueCounterparties: 3,
  assetDiversity: 2,
  nightDayRatio: 0.8,
};

const riskyResult = calculateRiskScore(riskyMetrics);
console.log('Risky result:', riskyResult);
console.log('Risk score:', riskyResult.riskScore);
console.log('Expected: > 70');
console.log('');

console.log('=== Testing Poor vs Rich Profile ===');
const poorMetrics = {
  totalVolume: 100,
  uniqueCounterparties: 2,
  assetDiversity: 1,
  nightDayRatio: 0.9,
};

const richMetrics = {
  totalVolume: 5000,
  uniqueCounterparties: 25,
  assetDiversity: 6,
  nightDayRatio: 0.2,
};

const poorResult = calculateRiskScore(poorMetrics);
const richResult = calculateRiskScore(richMetrics);

console.log('Poor result risk score:', poorResult.riskScore);
console.log('Rich result risk score:', richResult.riskScore);
console.log('Poor confidence:', poorResult.confidence);
console.log('Rich confidence:', richResult.confidence);
console.log('Expected: rich > poor');

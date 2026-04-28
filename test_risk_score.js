const { validateRiskScore } = require('./src/lib/validation.ts');

const invalidScores = [-1, 101, 'invalid', null, undefined, NaN, Infinity];

invalidScores.forEach((score, index) => {
  console.log(`Test ${index + 1}:`, score);
  console.log('Result:', validateRiskScore(score));
  console.log('Is valid:', validateRiskScore(score).isValid);
  console.log('---');
});

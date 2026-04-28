const { validateTransactionHash } = require('./src/lib/validation.ts');

const validHash = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456';
console.log('Input:', validHash);
console.log('Length:', validHash.length);
console.log('Result:', validateTransactionHash(validHash));
console.log('Is valid:', validateTransactionHash(validHash).isValid);

// Test regex
const hashRegex = /^[a-f0-9]{64}$/i;
console.log('Regex test:', hashRegex.test(validHash));

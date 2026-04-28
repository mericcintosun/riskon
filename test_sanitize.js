const { sanitizeString } = require('./src/lib/validation.ts');

const testInput = '<img src="x" onerror="alert(1)">';
console.log('Input:', testInput);
console.log('Output:', sanitizeString(testInput));

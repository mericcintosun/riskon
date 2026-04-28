const { sanitizeString } = require('./src/lib/validation.ts');

const xssAttempts = [
  '<script>alert("xss")</script>',
  '"><script>alert("xss")</script>',
  '<img src="x" onerror="alert(1)">',
  '<svg onload="alert(1)">',
  '"><script>alert(1)</script>',
  '\';alert(1);//'
];

xssAttempts.forEach((attempt, index) => {
  console.log(`Test ${index + 1}:`);
  console.log('Input:', attempt);
  console.log('Output:', sanitizeString(attempt));
  console.log('Contains <script>:', sanitizeString(attempt).includes('<script>'));
  console.log('Contains onerror:', sanitizeString(attempt).includes('onerror'));
  console.log('Contains onload:', sanitizeString(attempt).includes('onload'));
  console.log('Contains &lt;:', sanitizeString(attempt).includes('&lt;'));
  console.log('Contains &gt;:', sanitizeString(attempt).includes('&gt;'));
  console.log('---');
});

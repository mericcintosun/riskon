// Mock localStorage for testing
if (typeof global !== 'undefined' && !global.localStorage) {
  const localStorageData = {};
  const localStorageMock = {
    getItem: function(key) { return localStorageData[key] || null; },
    setItem: function(key, value) { 
      localStorageData[key] = value;
    },
    removeItem: function(key) { 
      delete localStorageData[key];
    },
    key: function(index) { 
      return Object.keys(localStorageData)[index] || null; 
    },
    get length() { 
      return Object.keys(localStorageData).length; 
    }
  };
  
  // Define the properties properly
  Object.defineProperty(localStorageMock, 'length', {
    get: function() { return Object.keys(localStorageData).length; }
  });
  
  global.localStorage = localStorageMock;
}

// Mock window for testing
if (typeof global !== 'undefined' && !global.window) {
  global.window = {
    localStorage: global.localStorage
  };
}

const { setSafeLocalStorageItem, getStorageUsage } = require('./src/lib/secureStorage.js');

console.log('Testing storage functions...');
console.log('localStorage exists:', !!global.localStorage);
console.log('localStorage methods:', Object.getOwnPropertyNames(global.localStorage));

const result1 = setSafeLocalStorageItem('key1', 'value1');
console.log('Set key1 result:', result1);

const result2 = setSafeLocalStorageItem('key2', 'value2');
console.log('Set key2 result:', result2);

console.log('localStorage keys:', Object.keys(global.localStorage._data || {}));

const usage = getStorageUsage();
console.log('Storage usage:', usage);

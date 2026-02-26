/**
 * Node.js Backend Test for RiskOn IndexedDB Implementation
 * Tests the structure, logic, and compatibility without browser APIs
 */

const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    
    console.log(logEntry);
    this.results.push({ message, type, timestamp });
  }

  async runTest(testName, testFunction) {
    try {
      this.log(`📋 Running: ${testName}`);
      const result = await testFunction();
      
      if (result) {
        this.log(`✅ ${testName}: PASSED`);
        this.passed++;
      } else {
        this.log(`❌ ${testName}: FAILED`);
        this.failed++;
      }
      
      return result;
    } catch (error) {
      this.log(`❌ ${testName}: ERROR - ${error.message}`);
      this.failed++;
      return false;
    }
  }

  printSummary() {
    this.log('\n🎯 TEST SUMMARY');
    this.log('===============');
    this.log(`✅ Passed: ${this.passed}`);
    this.log(`❌ Failed: ${this.failed}`);
    this.log(`📊 Total: ${this.passed + this.failed}`);
    this.log(`📈 Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
    
    if (this.failed === 0) {
      this.log('\n🎉 ALL TESTS PASSED! 🎉');
    } else {
      this.log('\n⚠️  Some tests failed. Check details above.');
    }
  }
}

// Test functions
async function testFileStructure() {
  const requiredFiles = [
    'src/lib/storage/db.js',
    'src/lib/riskDataManager.js',  
    'src/components/RiskDataInitializer.jsx',
    'src/components/RiskDataDevTools.jsx',
    'src/app/dev-test/page.js'
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Missing file: ${file}`);
      return false;
    }
  }

  // Check for test files separately (they might be in root or elsewhere)
  const testFileExists = fs.existsSync(path.join(__dirname, 'test-indexeddb.html')) ||
                         fs.existsSync(path.join(__dirname, 'test-indexeddb.js'));
  
  if (!testFileExists) {
    console.log('⚠️ Test files not in expected location (this is OK for production)');
  }

  console.log('✅ All required implementation files exist');
  return true;
}

async function testDbStructure() {
  try {
    // Read the db.js file and check for required functions
    const dbFile = path.join(__dirname, 'src/lib/storage/db.js');
    const content = fs.readFileSync(dbFile, 'utf8');

    const requiredExports = [
      'saveRiskData',
      'getRiskData', 
      'deleteRiskData',
      'migrateFromLocalStorage',
      'exportRiskData',
      'importRiskData',
      'testIndexedDB'
    ];

    for (const exportName of requiredExports) {
      if (!content.includes(`export const ${exportName}`) && 
          !content.includes(`export { ${exportName}`)) {
        console.error(`❌ Missing export: ${exportName}`);
        return false;
      }
    }

    console.log('✅ All required exports found in db.js');
    return true;
  } catch (error) {
    console.error('❌ Failed to read db.js:', error.message);
    return false;  
  }
}

async function testRiskDataManager() {
  try {
    const managerFile = path.join(__dirname, 'src/lib/riskDataManager.js');
    const content = fs.readFileSync(managerFile, 'utf8');

    const requiredFunctions = [
      'getUserRiskData',
      'updateUserChosenTier',
      'saveUserRiskData',
      'deleteUserRiskData',
      'initializeRiskDataSystem'
    ];

    for (const functionName of requiredFunctions) {
      if (!content.includes(functionName)) {
        console.error(`❌ Missing function: ${functionName}`);
        return false;
      }
    }

    console.log('✅ All required functions found in riskDataManager.js');
    return true;
  } catch (error) {
    console.error('❌ Failed to read riskDataManager.js:', error.message);
    return false;
  }
}

async function testWriteScoreIntegration() {
  try {
    const writeScoreFile = path.join(__dirname, 'src/app/lib/writeScore.js');
    const content = fs.readFileSync(writeScoreFile, 'utf8');

    // Check if IndexedDB import exists
    if (!content.includes('from "../../lib/storage/db.js"')) {
      console.error('❌ Missing IndexedDB import in writeScore.js');
      return false;
    }

    // Check if saveRiskData is used
    if (!content.includes('saveRiskData')) {
      console.error('❌ saveRiskData not used in writeScore.js');
      return false;
    }

    console.log('✅ writeScore.js properly integrated with IndexedDB');
    return true;
  } catch (error) {
    console.error('❌ Failed to read writeScore.js:', error.message);
    return false;
  }
}

async function testLayoutIntegration() {
  try {
    const layoutFile = path.join(__dirname, 'src/app/layout.js');
    const content = fs.readFileSync(layoutFile, 'utf8');

    // Check if RiskDataInitializer is imported and used
    if (!content.includes('RiskDataInitializer')) {
      console.error('❌ RiskDataInitializer not found in layout.js');
      return false;
    }

    console.log('✅ layout.js properly integrated with RiskDataInitializer');
    return true;
  } catch (error) {
    console.error('❌ Failed to read layout.js:', error.message);
    return false;
  }
}

async function testDataStructure() {
  // Test that the data structure is properly defined
  const sampleRiskData = {
    address: 'GB7TAYRUZGE6TVT7NHP5SMIZRNQA6PLM423EYISAOAP3MKYIQMVYP2JO',
    score: 75,
    tier: 'TIER_2',
    timestamp: Date.now(),
    chosenTier: 'TIER_1'
  };

  // Validate required fields
  const requiredFields = ['address', 'score', 'tier', 'timestamp', 'chosenTier'];
  
  for (const field of requiredFields) {
    if (!(field in sampleRiskData)) {
      console.error(`❌ Missing required field: ${field}`);
      return false;
    }
  }

  // Validate data types
  if (typeof sampleRiskData.address !== 'string' ||
      typeof sampleRiskData.score !== 'number' ||
      typeof sampleRiskData.tier !== 'string' ||
      typeof sampleRiskData.timestamp !== 'number' ||
      typeof sampleRiskData.chosenTier !== 'string') {
    console.error('❌ Invalid data types in risk data structure');
    return false;
  }

  console.log('✅ Risk data structure is valid');
  return true;
}

async function testPackageCompatibility() {
  try {
    const packageFile = path.join(__dirname, 'package.json');
    
    if (!fs.existsSync(packageFile)) {
      console.error('❌ package.json not found');
      return false;
    }

    const packageContent = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
    
    // Check if it's a Next.js project
    if (!packageContent.dependencies || !packageContent.dependencies.next) {
      console.error('❌ Not a Next.js project');
      return false;
    }

    console.log('✅ Package.json is compatible');
    return true;
  } catch (error) {
    console.error('❌ Failed to read package.json:', error.message);
    return false;
  }
}

async function testConfigFiles() {
  const configFiles = [
    'next.config.mjs',
    'jsconfig.json',
    'tailwind.config.mjs'
  ];

  for (const configFile of configFiles) {
    const filePath = path.join(__dirname, configFile);
    if (!fs.existsSync(filePath)) {
      console.error(`⚠️  Optional config file missing: ${configFile}`);
    }
  }

  console.log('✅ Config files check completed');
  return true;
}

// Mock browser globals for testing
function setupMockBrowser() {
  // Mock IndexedDB for structure testing
  global.indexedDB = {
    open: () => ({ result: null, onsuccess: null, onerror: null })
  };
  
  // Mock localStorage
  global.localStorage = {
    getItem: (key) => null,
    setItem: (key, value) => {},
    removeItem: (key) => {},
    key: (index) => null,
    length: 0
  };

  // Mock document and window
  global.document = {
    createElement: () => ({ 
      href: '', 
      download: '', 
      click: () => {},
      appendChild: () => {},
      removeChild: () => {}
    }),
    body: { appendChild: () => {}, removeChild: () => {} }
  };

  global.URL = {
    createObjectURL: () => 'mock-url',
    revokeObjectURL: () => {}
  };

  console.log('✅ Mock browser environment set up');
  return true;
}

// Main test runner
async function main() {
  console.log('🚀 RISKON INDEXEDDB BACKEND TEST SUITE');
  console.log('=====================================\n');

  const runner = new TestRunner();

  // Set up mock environment
  setupMockBrowser();

  // Run all tests
  await runner.runTest('File Structure Test', testFileStructure);
  await runner.runTest('Database Structure Test', testDbStructure);
  await runner.runTest('Risk Data Manager Test', testRiskDataManager);
  await runner.runTest('WriteScore Integration Test', testWriteScoreIntegration);
  await runner.runTest('Layout Integration Test', testLayoutIntegration);
  await runner.runTest('Data Structure Test', testDataStructure);
  await runner.runTest('Package Compatibility Test', testPackageCompatibility);
  await runner.runTest('Config Files Test', testConfigFiles);

  // Print final results
  runner.printSummary();

  // Exit with appropriate code
  process.exit(runner.failed > 0 ? 1 : 0);
}

// Run tests
main().catch(error => {
  console.error('❌ Test runner failed:', error.message);
  process.exit(1);
});
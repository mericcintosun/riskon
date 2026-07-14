/**
 * Logging Migration Script
 *
 * This script helps migrate existing console.log statements to the new structured logging system.
 * It can be run to identify and optionally replace console.log statements throughout the codebase.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const config = {
  // File patterns to process
  patterns: [
    'src/**/*.js',
    'src/**/*.jsx',
    'src/**/*.ts',
    'src/**/*.tsx',
  ],
  // Patterns to ignore
  ignore: [
    'src/lib/logger.ts',
    'src/lib/__tests__/**',
    'node_modules/**',
    '.next/**',
    'dist/**',
  ],
  // Whether to actually modify files (set to false for dry run)
  modifyFiles: false,
  // Output directory for migration report
  reportDir: './migration-reports',
};

// Console statement patterns to migrate
const consolePatterns = [
  {
    pattern: /console\.log\(([^)]+)\)/g,
    level: 'info',
    description: 'console.log -> log.info',
  },
  {
    pattern: /console\.debug\(([^)]+)\)/g,
    level: 'debug',
    description: 'console.debug -> log.debug',
  },
  {
    pattern: /console\.info\(([^)]+)\)/g,
    level: 'info',
    description: 'console.info -> log.info',
  },
  {
    pattern: /console\.warn\(([^)]+)\)/g,
    level: 'warn',
    description: 'console.warn -> log.warn',
  },
  {
    pattern: /console\.error\(([^)]+)\)/g,
    level: 'error',
    description: 'console.error -> log.error',
  },
];

// Module name extraction based on file path
function getModuleName(filePath) {
  const relativePath = path.relative('src', filePath);
  const dirName = path.dirname(relativePath);
  const baseName = path.basename(relativePath, path.extname(relativePath));
  
  // Map common directories to module names
  const moduleMap = {
    'lib': 'Core',
    'components': 'UI',
    'contexts': 'Context',
    'hooks': 'Hooks',
    'utils': 'Utils',
    'app': 'App',
    'providers': 'Provider',
  };
  
  const dirKey = Object.keys(moduleMap).find(key => dirName.startsWith(key));
  const prefix = dirKey ? moduleMap[dirKey] : 'Misc';
  
  return `${prefix}:${baseName}`;
}

// Generate import statement for logger
function generateImportStatement(moduleName) {
  const loggerVar = `logger_${moduleName.replace(/[^a-zA-Z0-9]/g, '_')}`;
  return `import { createLogger } from '@/lib/logger';\nconst ${loggerVar} = createLogger('${moduleName}');`;
}

// Analyze a single file
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const results = {
    filePath,
    moduleName: getModuleName(filePath),
    consoleStatements: [],
    hasLoggerImport: content.includes('from \'@/lib/logger\'') || content.includes('from "@/lib/logger"'),
    totalConsoleStatements: 0,
  };

  consolePatterns.forEach(({ pattern, level, description }) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      results.consoleStatements.push({
        type: description,
        level,
        line: content.substring(0, match.index).split('\n').length,
        column: match.index - content.lastIndexOf('\n', match.index) - 1,
        fullMatch: match[0],
        args: match[1],
      });
      results.totalConsoleStatements++;
    }
  });

  return results;
}

// Generate replacement for a console statement
function generateReplacement(statement, loggerVar) {
  const { level, args } = statement;
  
  // Parse arguments to separate message from metadata
  const argsStr = args.trim();
  
  // Simple heuristic: if first argument is a string template or literal, use it as message
  if (argsStr.startsWith('\'') || argsStr.startsWith('"') || argsStr.startsWith('`')) {
    return `${loggerVar}.${level}(${argsStr});`;
  }
  
  // For complex arguments, pass them as metadata
  return `${loggerVar}.${level}('Log entry', ${argsStr});`;
}

// Migrate a single file
function migrateFile(fileAnalysis) {
  const { filePath, consoleStatements, hasLoggerImport, moduleName } = fileAnalysis;
  
  if (consoleStatements.length === 0) return null;
  
  let content = fs.readFileSync(filePath, 'utf8');
  const loggerVar = `logger_${moduleName.replace(/[^a-zA-Z0-9]/g, '_')}`;
  
  // Add logger import if not present
  if (!hasLoggerImport) {
    const importStatement = generateImportStatement(moduleName);
    
    // Find the best place to add the import (after existing imports)
    const importRegex = /import[^;]+;/g;
    const imports = content.match(importRegex) || [];
    
    if (imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertIndex = content.indexOf('\n', lastImportIndex) + 1;
      content = content.slice(0, insertIndex) + 
                '\n' + importStatement + 
                content.slice(insertIndex);
    } else {
      // Add at the beginning of the file
      content = importStatement + '\n\n' + content;
    }
  }
  
  // Replace console statements (in reverse order to maintain line numbers)
  const replacements = consoleStatements.map(statement => ({
    original: statement.fullMatch,
    replacement: generateReplacement(statement, loggerVar),
  }));
  
  replacements.reverse().forEach(({ original, replacement }) => {
    content = content.replace(original, replacement);
  });
  
  return content;
}

// Generate migration report
function generateReport(analyses) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: analyses.length,
      filesWithConsoleStatements: analyses.filter(a => a.totalConsoleStatements > 0).length,
      totalConsoleStatements: analyses.reduce((sum, a) => sum + a.totalConsoleStatements, 0),
      filesWithLoggerImport: analyses.filter(a => a.hasLoggerImport).length,
    },
    files: analyses,
  };
  
  // Create report directory if it doesn't exist
  if (!fs.existsSync(config.reportDir)) {
    fs.mkdirSync(config.reportDir, { recursive: true });
  }
  
  // Write detailed report
  const reportPath = path.join(config.reportDir, `logging-migration-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Write human-readable summary
  const summaryPath = path.join(config.reportDir, `migration-summary-${Date.now()}.md`);
  const summary = `# Logging Migration Report

Generated: ${report.timestamp}

## Summary
- **Total files analyzed**: ${report.summary.totalFiles}
- **Files with console statements**: ${report.summary.filesWithConsoleStatements}
- **Total console statements**: ${report.summary.totalConsoleStatements}
- **Files already using logger**: ${report.summary.filesWithLoggerImport}

## Files Requiring Migration

${report.files
  .filter(f => f.totalConsoleStatements > 0)
  .map(file => `
### ${file.filePath}
- **Module**: ${file.moduleName}
- **Console statements**: ${file.totalConsoleStatements}
- **Has logger import**: ${file.hasLoggerImport ? 'Yes' : 'No'}
- **Statements**:
${file.consoleStatements.map(stmt => `  - Line ${stmt.line}: ${stmt.type}`).join('\n')}
`).join('\n')}

## Next Steps

1. Review the migration report
2. Run the migration with \`modifyFiles: true\` to apply changes
3. Test the migrated code
4. Update any remaining manual console statements

## Migration Commands

\`\`\`bash
# Dry run (analyze only)
node scripts/migrate-logging.js

# Apply changes
node scripts/migrate-logging.js --apply
\`\`\`
`;
  
  fs.writeFileSync(summaryPath, summary);
  
  return { reportPath, summaryPath };
}

// Main migration function
async function runMigration() {
  console.log('Starting logging migration analysis...\n');
  
  // Find all matching files
  const files = [];
  for (const pattern of config.patterns) {
    const matches = glob.sync(pattern, { ignore: config.ignore });
    files.push(...matches);
  }
  
  console.log(`Found ${files.length} files to analyze\n`);
  
  // Analyze each file
  const analyses = [];
  for (const file of files) {
    try {
      const analysis = analyzeFile(file);
      analyses.push(analysis);
      
      if (analysis.totalConsoleStatements > 0) {
        console.log(`${file.filePath}: ${analysis.totalConsoleStatements} console statements`);
      }
    } catch (error) {
      console.error(`Error analyzing ${file}:`, error.message);
    }
  }
  
  // Generate report
  const { reportPath, summaryPath } = generateReport(analyses);
  
  console.log(`\nMigration report generated:`);
  console.log(`- Detailed report: ${reportPath}`);
  console.log(`- Summary: ${summaryPath}`);
  
  // Apply changes if requested
  if (config.modifyFiles) {
    console.log('\nApplying migration changes...');
    
    const filesToMigrate = analyses.filter(a => a.totalConsoleStatements > 0);
    
    for (const analysis of filesToMigrate) {
      try {
        const migratedContent = migrateFile(analysis);
        if (migratedContent) {
          fs.writeFileSync(analysis.filePath, migratedContent);
          console.log(`Migrated: ${analysis.filePath}`);
        }
      } catch (error) {
        console.error(`Error migrating ${analysis.filePath}:`, error.message);
      }
    }
    
    console.log(`\nMigration complete! ${filesToMigrate.length} files updated.`);
  } else {
    console.log('\nDry run complete. Use --apply flag to modify files.');
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--apply')) {
    config.modifyFiles = true;
  }
  
  if (args.includes('--help')) {
    console.log(`
Logging Migration Script

Usage:
  node scripts/migrate-logging.js [options]

Options:
  --apply    Apply changes to files (default: dry run)
  --help     Show this help message

Examples:
  node scripts/migrate-logging.js              # Dry run
  node scripts/migrate-logging.js --apply       # Apply changes
`);
    process.exit(0);
  }
  
  runMigration().catch(console.error);
}

module.exports = { runMigration, analyzeFile, migrateFile, config };

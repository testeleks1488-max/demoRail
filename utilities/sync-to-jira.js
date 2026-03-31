#!/usr/bin/env node

/**
 * Sync to Jira Utility
 * Syncs local test case files to Jira/Xray
 * 
 * Usage:
 *   node sync-to-jira.js <file-path>
 *   node sync-to-jira.js --all <directory>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JiraClient } from './jira-mcp-server/jira-client.js';
import { XrayClient } from './jira-mcp-server/xray-client.js';
import { parseTestCaseFile } from './parse-test-case-md.js';
import { loadEnvFile } from './load-env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnvFile(path.join(__dirname, '..'));

// Configuration from environment
const config = {
  jiraUrl: process.env.JIRA_URL,
  jiraEmail: process.env.JIRA_EMAIL,
  jiraToken: process.env.JIRA_API_TOKEN,
  xrayClientId: process.env.XRAY_CLIENT_ID,
  xrayClientSecret: process.env.XRAY_CLIENT_SECRET,
  linkTypeTestToStory: process.env.JIRA_LINK_TYPE_TEST_TO_STORY || 'Tests',
  testIssueType: process.env.JIRA_TEST_ISSUE_TYPE || 'Test'
};

// Initialize clients
const jiraClient = new JiraClient(config.jiraUrl, config.jiraEmail, config.jiraToken);
const xrayClient = new XrayClient(jiraClient, {
  clientId: config.xrayClientId,
  clientSecret: config.xrayClientSecret,
  linkTypeForRequirement: config.linkTypeTestToStory,
  testIssueType: config.testIssueType
});

/**
 * Add test steps to an already-synced test in Xray (GraphQL).
 */
async function addStepsOnly(testCase, filePath) {
  if (!testCase.jiraKey || testCase.steps.length === 0) {
    return { status: 'skipped', key: testCase.jiraKey, reason: !testCase.jiraKey ? 'no jira key' : 'no steps' };
  }
  console.log(`Adding steps: ${testCase.title} (${testCase.jiraKey})`);
  try {
    await xrayClient.addTestSteps(testCase.jiraKey, testCase.steps);
    console.log(`  Added ${testCase.steps.length} steps`);
    return { status: 'steps_added', key: testCase.jiraKey };
  } catch (error) {
    console.error(`  Error: ${error.message}`);
    return { status: 'error', error: error.message, key: testCase.jiraKey };
  }
}

/**
 * Sync a single test case to Jira
 */
async function syncTestCase(testCase, filePath, stepsOnly = false) {
  console.log(`Syncing: ${testCase.title}`);

  if (stepsOnly) {
    return addStepsOnly(testCase, filePath);
  }

  // Skip if already synced
  if (testCase.jiraKey) {
    console.log(`  Already synced to ${testCase.jiraKey}, skipping...`);
    return { status: 'skipped', key: testCase.jiraKey };
  }

  // Extract project key from story key
  const projectKey = testCase.storyKey.split('-')[0];

  try {
    // Create test in Jira
    const result = await xrayClient.createTest(
      projectKey,
      testCase.title,
      testCase.description,
      'Manual',
      { labels: testCase.labels }
    );

    const testKey = result.key;
    console.log(`  Created: ${testKey}`);

    // Add test steps
    if (testCase.steps.length > 0) {
      await xrayClient.addTestSteps(testKey, testCase.steps);
      console.log(`  Added ${testCase.steps.length} steps`);
    }

    // Link to user story
    if (testCase.storyKey) {
      await xrayClient.linkTestToRequirement(testKey, testCase.storyKey);
      console.log(`  Linked to ${testCase.storyKey}`);
    }

    // Update local file with Jira key
    updateFileWithJiraKey(filePath, testKey, jiraClient.getIssueUrl(testKey));

    return { status: 'created', key: testKey };
  } catch (error) {
    console.error(`  Error: ${error.message}`);
    return { status: 'error', error: error.message };
  }
}

/**
 * Update local file with Jira key and URL
 */
function updateFileWithJiraKey(filePath, jiraKey, jiraUrl) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Update Issue Key
  content = content.replace(
    /\*\*Issue Key\*\*:\s*\[To be created\]/,
    `**Issue Key**: ${jiraKey}`
  );
  
  // Update URL
  content = content.replace(
    /\*\*URL\*\*:\s*\[To be created\]/,
    `**URL**: ${jiraUrl}`
  );
  
  // Update Sync Status
  content = content.replace(
    /\*\*Sync Status\*\*:\s*⏳ Pending sync/,
    `**Sync Status**: ✅ Synced`
  );

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  Updated local file`);
}

/**
 * Find all test case files in a directory
 */
function findTestCaseFiles(directory) {
  const files = [];
  
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && entry.name.startsWith('[TC]') && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }
  
  scanDir(directory);
  return files;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node sync-to-jira.js <file-path>              - Sync single file');
    console.log('  node sync-to-jira.js --all [directory]       - Sync all files in directory');
    console.log('  node sync-to-jira.js --steps-only [directory] - Add steps to already-synced tests only');
    process.exit(1);
  }

  // Validate configuration
  if (!config.jiraUrl || !config.jiraEmail || !config.jiraToken) {
    console.error('Error: Missing Jira configuration. Set environment variables:');
    console.error('  JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN');
    process.exit(1);
  }

  let files = [];
  const stepsOnly = args[0] === '--steps-only';

  if (args[0] === '--all' || stepsOnly) {
    const directory = args[1] || './test-plans';
    console.log(`Scanning directory: ${directory}${stepsOnly ? ' (steps only)' : ''}`);
    files = findTestCaseFiles(directory);
    console.log(`Found ${files.length} test case files`);
  } else {
    files = [args[0]];
  }

  const results = {
    created: 0,
    skipped: 0,
    steps_added: 0,
    errors: 0
  };

  for (const file of files) {
    const testCase = parseTestCaseFile(file);
    const result = await syncTestCase(testCase, file, stepsOnly);
    
    switch (result.status) {
      case 'created':
        results.created++;
        break;
      case 'steps_added':
        results.steps_added++;
        break;
      case 'skipped':
        results.skipped++;
        break;
      case 'error':
        results.errors++;
        break;
    }
  }

  console.log('\n--- Sync Summary ---');
  console.log(`Created: ${results.created}`);
  if (results.steps_added) console.log(`Steps added: ${results.steps_added}`);
  console.log(`Skipped: ${results.skipped}`);
  console.log(`Errors: ${results.errors}`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

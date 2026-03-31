#!/usr/bin/env node

/**
 * Validate Before Sync
 * Validates that Story keys in test case files exist in Jira and (optionally)
 * that folder structure matches hierarchy.
 *
 * Usage:
 *   node validate-before-sync.js <file-path>
 *   node validate-before-sync.js --all [directory]
 *   node validate-before-sync.js --all --check-folders [directory]
 */

import fs from 'fs';
import path from 'path';
import { JiraClient } from './jira-mcp-server/jira-client.js';

const config = {
  jiraUrl: process.env.JIRA_URL,
  jiraEmail: process.env.JIRA_EMAIL,
  jiraToken: process.env.JIRA_API_TOKEN
};

const jiraClient = new JiraClient(config.jiraUrl, config.jiraEmail, config.jiraToken);

function extractStoryKey(content) {
  const match = content.match(/\*\*Story Key\*\*:\s*(\S+)/);
  return match ? match[1].trim() : null;
}

function parsePathHierarchy(filePath) {
  const normalized = path.normalize(filePath).replace(/\\/g, '/');
  const match = normalized.match(/test-plans\/([^/]+)\/([^/]+)\/([^/]+)\/test-cases\//);
  if (!match) return null;
  return { projectKey: match[1], epicKey: match[2], storyKey: match[3] };
}

function findTestCaseFiles(directory) {
  const files = [];
  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) scanDir(fullPath);
      else if (entry.isFile() && entry.name.startsWith('[TC]') && entry.name.endsWith('.md')) files.push(fullPath);
    }
  }
  scanDir(directory);
  return files;
}

async function validateFile(filePath, options = { checkFolders: false }) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const storyKey = extractStoryKey(content);
  const result = { file: filePath, storyKey, storyExists: null, folderMatch: null, error: null };
  if (!storyKey) {
    result.error = 'Missing or invalid **Story Key** in file';
    return result;
  }
  try {
    await jiraClient.getIssue(storyKey, 'summary,status,issuetype');
    result.storyExists = true;
  } catch (err) {
    result.storyExists = false;
    result.error = err.message || 'Story not found in Jira';
    return result;
  }
  if (options.checkFolders) {
    const hierarchy = parsePathHierarchy(filePath);
    if (hierarchy) {
      result.folderMatch = hierarchy.storyKey === storyKey;
      if (!result.folderMatch) result.error = `Path suggests story ${hierarchy.storyKey} but file has Story Key ${storyKey}`;
    } else {
      result.folderMatch = false;
      result.error = 'Path does not match test-plans/PROJ/EPIC/STORY/test-cases/';
    }
  }
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node validate-before-sync.js <file-path> | --all [directory] | --all --check-folders [directory]');
    process.exit(1);
  }
  if (!config.jiraUrl || !config.jiraEmail || !config.jiraToken) {
    console.error('Set JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN');
    process.exit(1);
  }
  const checkFolders = args.includes('--check-folders');
  const allIdx = args.indexOf('--all');
  const useAll = allIdx !== -1;
  const directory = useAll ? (args[allIdx + 1] || './test-plans') : null;
  const singleFile = useAll ? null : args[0];
  const files = useAll ? findTestCaseFiles(directory) : [singleFile].filter(Boolean);
  if (files.length === 0) {
    console.error('No test case files found.');
    process.exit(1);
  }
  console.log(`Validating ${files.length} file(s)...\n`);
  const results = [];
  for (const file of files) {
    if (!fs.existsSync(file)) {
      results.push({ file, error: 'File not found' });
      continue;
    }
    results.push(await validateFile(file, { checkFolders }));
  }
  let hasError = false;
  for (const r of results) {
    const ok = r.storyExists && (r.folderMatch !== false);
    if (!ok) hasError = true;
    console.log(`${ok ? 'OK' : 'FAIL'} ${r.file}`);
    if (r.error) console.log(`     ${r.error}`);
  }
  console.log('\n--- Validation Summary ---');
  const passed = results.filter(r => r.storyExists && (r.folderMatch !== false)).length;
  console.log(`Passed: ${passed}/${results.length}`);
  process.exit(hasError ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

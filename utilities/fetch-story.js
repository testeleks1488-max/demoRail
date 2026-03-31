#!/usr/bin/env node

/**
 * Fetch Story and create folder structure.
 * Usage: node fetch-story.js <story-key-or-url>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JiraClient } from './jira-mcp-server/jira-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const config = {
  jiraUrl: process.env.JIRA_URL,
  jiraEmail: process.env.JIRA_EMAIL,
  jiraToken: process.env.JIRA_API_TOKEN
};

function extractIssueKey(input) {
  const trimmed = input.trim();
  const keyMatch = trimmed.match(/[A-Z][A-Z0-9]*-\d+/);
  if (keyMatch) return keyMatch[0];
  const browseMatch = trimmed.match(/\/browse\/([A-Z][A-Z0-9]*-\d+)/);
  return browseMatch ? browseMatch[1] : trimmed;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node fetch-story.js <story-key-or-url>');
    process.exit(1);
  }
  if (!config.jiraUrl || !config.jiraEmail || !config.jiraToken) {
    console.error('Set JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN');
    process.exit(1);
  }
  const issueKey = extractIssueKey(args[0]);
  const jiraClient = new JiraClient(config.jiraUrl, config.jiraEmail, config.jiraToken);
  console.log(`Fetching hierarchy for ${issueKey}...`);
  let hierarchy;
  try {
    hierarchy = await jiraClient.getStoryHierarchy(issueKey);
  } catch (err) {
    console.error('Failed to fetch story:', err.message);
    process.exit(1);
  }
  const rootDir = path.resolve(__dirname, '..');
  const folderPath = path.join(rootDir, hierarchy.folderPath);
  if (fs.existsSync(folderPath)) {
    console.log(`Folder already exists: ${folderPath}`);
    process.exit(0);
  }
  const segments = hierarchy.folderPath.split('/');
  let current = rootDir;
  for (const seg of segments) {
    current = path.join(current, seg);
    if (!fs.existsSync(current)) {
      fs.mkdirSync(current, { recursive: false });
      console.log(`Created: ${path.relative(rootDir, current)}`);
    }
  }
  console.log(`Done. Test cases folder: ${folderPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

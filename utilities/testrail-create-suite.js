#!/usr/bin/env node
/**
 * Create a TestRail suite in TESTRAIL_PROJECT_ID.
 *
 *   node utilities/testrail-create-suite.js "Suite name" [description]
 *   npm run testrail-create-suite -- "TES / Regression"
 *
 * Uses same .env as sync-to-testrail (TESTRAIL_URL, auth, TESTRAIL_PROJECT_ID).
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnvFile } from './load-env.js';
import {
  TestRailClient,
  testrailCredentialsFromEnv,
  printTestRailPermissionHint
} from './testrail-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnvFile(path.join(__dirname, '..'));

const url = process.env.TESTRAIL_URL || '';
const projectId = parseInt(process.env.TESTRAIL_PROJECT_ID || '0', 10);
const { login, secret } = testrailCredentialsFromEnv();

const name = process.argv[2]?.trim();
const description = process.argv.slice(3).join(' ').trim() || '';

if (!url || !login || !secret || !projectId) {
  console.error('Need .env: TESTRAIL_URL, TESTRAIL_PROJECT_ID, TESTRAIL_EMAIL, TESTRAIL_API_KEY (or PASSWORD)');
  process.exit(1);
}
if (!name) {
  console.error('Usage: node utilities/testrail-create-suite.js "Suite name" [description]');
  process.exit(1);
}

const client = new TestRailClient(url, login, secret);
try {
  const suite = await client.addSuite(projectId, { name, description: description || undefined });
  console.log(`Created suite: ${suite.name} (id ${suite.id})`);
  console.log(`Set in .env: TESTRAIL_SUITE_ID=${suite.id}`);
} catch (e) {
  printTestRailPermissionHint(e);
  console.error(e.message);
  process.exit(1);
}

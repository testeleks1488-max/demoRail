#!/usr/bin/env node
/**
 * Quick auth check: GET get_project/:id
 * Usage: npm run testrail-ping
 *
 * .env: TESTRAIL_EMAIL + (TESTRAIL_API_KEY or TESTRAIL_PASSWORD)
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
const repoRoot = path.join(__dirname, '..');
loadEnvFile(repoRoot);

const url = process.env.TESTRAIL_URL || '';
const rawProjectId = process.env.TESTRAIL_PROJECT_ID;
const projectId = parseInt(String(rawProjectId || '').trim().replace(/^['"]|['"]$/g, '') || '0', 10);
const { login, secret, usedAccountPassword } = testrailCredentialsFromEnv();

if (!url || !login || !secret) {
  console.error(
    'Required: TESTRAIL_URL, TESTRAIL_EMAIL (or TESTRAIL_USER), and TESTRAIL_API_KEY or TESTRAIL_PASSWORD in saved .env'
  );
  process.exit(1);
}
if (!projectId) {
  console.error(
    'Required: TESTRAIL_PROJECT_ID (numeric project id). Read from .env: ' +
      (rawProjectId === undefined ? '(variable missing — save .env at repo root)' : JSON.stringify(rawProjectId))
  );
  process.exit(1);
}
if (usedAccountPassword) {
  console.log('(using TESTRAIL_PASSWORD)');
}

const client = new TestRailClient(url, login, secret);
try {
  const p = await client.getProject(projectId);
  console.log('OK — auth works. Project:', p.name, `(id ${p.id})`);
} catch (e) {
  printTestRailPermissionHint(e);
  console.error(e.message);
  if (String(e.message).includes('401')) {
    console.error(`
401: Check login (email under avatar) and one Basic-auth password option:
  • TESTRAIL_API_KEY — from My Settings → API Keys → Save Settings
  • TESTRAIL_PASSWORD — normal login password for your TestRail host (if allowed)
`);
  }
  process.exit(1);
}

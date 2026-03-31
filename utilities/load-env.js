/**
 * Load KEY=value pairs from .env at repo root (no extra dependency).
 * @param {string} repoRoot - Absolute path to jira-qa-space root
 */
import fs from 'fs';
import path from 'path';

export function loadEnvFile(repoRoot) {
  const envPath = path.join(repoRoot, '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }
  let text = fs.readFileSync(envPath, 'utf-8');
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    val = val.trim();
    // Last occurrence in file wins (supports duplicate keys after placeholders)
    process.env[key] = val;
  }
}

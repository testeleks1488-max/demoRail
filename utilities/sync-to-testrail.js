#!/usr/bin/env node

/**
 * Sync local .md test cases to TestRail (section per story, refs = Jira key).
 *
 * Usage:
 *   node utilities/sync-to-testrail.js --dir "test-plans/TES/TES-1/test-cases"
 *
 * Env (or .env in repo root):
 *   TESTRAIL_URL=https://eleksdemo.testrail.io
 *   TESTRAIL_EMAIL=you@example.com
 *   TESTRAIL_USER=login   (optional if login is not an email)
 *   TESTRAIL_API_KEY=...  (recommended: key as “password” in Basic auth)
 *   TESTRAIL_PASSWORD=... (alternative: real пароль входу, якщо API key не підходить)
 *   TESTRAIL_PROJECT_ID=2
 *   TESTRAIL_STORY_KEY=TES-1   (optional if set in each .md)
 *   TESTRAIL_SUITE_ID=...      (optional; highest priority if set)
 *   TESTRAIL_SUITE_NAME=...    (optional; find or create suite by name)
 *   TESTRAIL_SUITE_DESCRIPTION=... (optional; used when creating suite)
 *   TESTRAIL_SECTION_ID=...        (optional; id секції з UI/API — достатньо самого: suite підставиться з відповіді API)
 *   TESTRAIL_SECTION_NAME=...      (optional; exact section name inside the chosen suite)
 *   TESTRAIL_TEMPLATE_ID=2         (optional; шаблон «Test Case (Steps)» для полів custom_steps_separated; інакше шукається за назвою)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnvFile } from './load-env.js';
import { parseTestCaseFile } from './parse-test-case-md.js';
import {
  TestRailClient,
  testrailCredentialsFromEnv,
  printTestRailPermissionHint
} from './testrail-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
loadEnvFile(repoRoot);

function priorityToId(p) {
  const map = { P1: 4, P2: 3, P3: 2, P4: 1 };
  return map[p] || 2;
}

function buildStepsPayload(steps) {
  if (!steps.length) return {};
  const separated = steps.map((s) => ({
    content: `${s.action}${s.data && s.data !== '—' ? `\n(Data: ${s.data})` : ''}`.trim(),
    expected: s.result || ''
  }));
  return { custom_steps_separated: separated };
}

/** Якщо separated-поля не прийняв шаблон — єдиний текст для «Test Case (Text)». */
function buildCustomStepsPlain(preambleLines, steps) {
  const blocks = [];
  if (preambleLines.length) blocks.push(preambleLines.join('\n\n'));
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const n = i + 1;
    let line = `${n}. ${s.action || ''}`;
    if (s.data && s.data !== '—') line += `\n   Data: ${s.data}`;
    line += `\n   Expected: ${s.result || '—'}`;
    blocks.push(line);
  }
  return blocks.join('\n\n');
}

/**
 * Steps template — для custom_steps_separated (не плутати з дефолтним «Test Case (Text)»).
 * @returns {{ stepsTemplateId: number, textTemplateId: number }}
 */
async function resolveCaseTemplateIds(client, projectId) {
  const templates = await client.getTemplates(projectId);
  const textTpl = templates.find((t) => t.is_default) || templates.find((t) => String(t.name) === 'Test Case (Text)');
  const textTemplateId = textTpl?.id != null ? Number(textTpl.id) : 1;

  const raw = String(process.env.TESTRAIL_TEMPLATE_ID || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');
  const fromEnv = parseInt(raw || '0', 10);
  if (fromEnv > 0) {
    return { stepsTemplateId: fromEnv, textTemplateId };
  }
  const byName = templates.find((t) => String(t.name) === 'Test Case (Steps)');
  if (byName?.id != null) {
    return { stepsTemplateId: Number(byName.id), textTemplateId };
  }
  const fuzzy = templates.find(
    (t) => /steps/i.test(String(t.name)) && !/text/i.test(String(t.name))
  );
  if (fuzzy?.id != null) {
    return { stepsTemplateId: Number(fuzzy.id), textTemplateId };
  }
  return { stepsTemplateId: 2, textTemplateId };
}

function findTestCaseFiles(directory) {
  const files = [];
  const scan = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) scan(full);
      else if (entry.name.startsWith('[TC]') && entry.name.endsWith('.md')) files.push(full);
    }
  };
  scan(directory);
  return files.sort();
}

function parseArgs() {
  const args = process.argv.slice(2);
  let dir = null;
  let storyKey = process.env.TESTRAIL_STORY_KEY || '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' && args[i + 1]) {
      dir = args[++i];
    }
    if (args[i] === '--story' && args[i + 1]) {
      storyKey = args[++i];
    }
  }
  return { dir, storyKey };
}

async function main() {
  const url = process.env.TESTRAIL_URL || '';
  const { login, secret, usedAccountPassword } = testrailCredentialsFromEnv();
  const rawProjectId = process.env.TESTRAIL_PROJECT_ID;
  const projectId = parseInt(String(rawProjectId || '').trim().replace(/^['"]|['"]$/g, '') || '0', 10);

  const { dir: dirArg, storyKey: storyArg } = parseArgs();
  const dir = dirArg || path.join(repoRoot, 'test-plans', 'TES', 'TES-1', 'test-cases');

  if (!url || !login || !secret) {
    console.error(
      'Set TESTRAIL_URL, TESTRAIL_EMAIL (or TESTRAIL_USER), and TESTRAIL_API_KEY or TESTRAIL_PASSWORD in .env.'
    );
    process.exit(1);
  }
  if (usedAccountPassword) {
    console.log('Using TESTRAIL_PASSWORD (account login). Prefer TESTRAIL_API_KEY when it works.');
  }
  if (!projectId) {
    const hint =
      rawProjectId === undefined
        ? '(змінної TESTRAIL_PROJECT_ID немає в середовищі — перевір збережений .env у корені репо)'
        : `(зчитано: ${JSON.stringify(rawProjectId)} — має бути число, наприклад 2)`;
    console.error(
      'Потрібен TESTRAIL_PROJECT_ID — числовий id проєкту TestRail (Administration → Projects або URL проєкту).\n' +
        `  ${hint}\n` +
        '  Збережіть .env (Ctrl+S) і запускайте з кореня jira-qa-space: npm run sync-testrail\n' +
        '  Перевірка: npm run testrail-ping'
    );
    process.exit(1);
  }

  if (!fs.existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    process.exit(1);
  }

  const client = new TestRailClient(url, login, secret);

  try {
    await client.getProject(projectId);
  } catch (e) {
    if (String(e.message).includes('403')) {
      printTestRailPermissionHint(e);
    }
    if (String(e.message).includes('401')) {
      console.error(`
TestRail 401 — перевір по черзі:
  1) My Settings → API Keys: після створення ключа натисни Save Settings.
  2) Логін для API = той самий, що в TestRail (іконка профілю → звичайно email). Якщо там не email — додай у .env: TESTRAIL_USER=точний_логін
  3) Або спробуй у .env замість ключа: TESTRAIL_PASSWORD=твій_пароль_входу_в_TestRail (той самий логін + пароль, що в браузері).
  4) Ключ скопійований повністю, без зайвої крапки в кінці.
  5) Адмін інстансу: увімкнено доступ до API.

Швидка перевірка: npm run testrail-ping
`);
    }
    throw e;
  }

  const sectionIdEnvEarly = parseInt(
    String(process.env.TESTRAIL_SECTION_ID || '')
      .trim()
      .replace(/^['"]|['"]$/g, '') || '0',
    10
  );

  let suiteId = parseInt(
    String(process.env.TESTRAIL_SUITE_ID || '')
      .trim()
      .replace(/^['"]|['"]$/g, '') || '0',
    10
  );
  const suiteNameWanted = (process.env.TESTRAIL_SUITE_NAME || '').trim();

  /** Якщо в .env є id секції — suite беремо з API (get_section), без get_suites / створення suite. */
  let sectionIdFromEnvMode = null;
  if (sectionIdEnvEarly) {
    const sec = await client.getSection(sectionIdEnvEarly);
    const secProject = sec.project_id != null ? Number(sec.project_id) : null;
    if (secProject != null && secProject !== projectId) {
      console.error(
        `Секція ${sectionIdEnvEarly} належить проєкту id ${secProject}, а в .env TESTRAIL_PROJECT_ID=${projectId}. Виправ один із id.`
      );
      process.exit(1);
    }
    const derivedSuite = Number(sec.suite_id);
    if (suiteId && suiteId !== derivedSuite) {
      console.warn(
        `TESTRAIL_SUITE_ID=${suiteId} не збігається з suite цієї секції (${derivedSuite}) — використовую suite з секції.`
      );
    }
    suiteId = derivedSuite;
    sectionIdFromEnvMode = sec.id;
    console.log(
      `Режим «тільки секція»: "${sec.name}" (section id ${sectionIdFromEnvMode}), suite id ${suiteId} (з API; TESTRAIL_SUITE_* не обов’язкові).`
    );
  } else if (!suiteId) {
    const suites = await client.getSuites(projectId);
    const list = suites || [];

    if (suiteNameWanted) {
      let suite = list.find((s) => s.name === suiteNameWanted);
      if (!suite) {
        console.log(`Creating suite: "${suiteNameWanted}"`);
        try {
          suite = await client.addSuite(projectId, {
            name: suiteNameWanted,
            description: (process.env.TESTRAIL_SUITE_DESCRIPTION || '').trim() || undefined
          });
        } catch (err) {
          printTestRailPermissionHint(err);
          console.warn(
            `\nНе вдалося створити suite через API (часто в TestRail право «додати кейс» є, а «створити suite» — ні).\n` +
              `Помилка: ${err.message}\n`
          );
          if (list.length) {
            suite = list[0];
            console.warn(
              `→ Використовую першу наявну suite: "${suite.name}" (id ${suite.id}). ` +
                `Щоб зафіксувати: додай у .env TESTRAIL_SUITE_ID=${suite.id} і прибери TESTRAIL_SUITE_NAME.\n`
            );
          } else {
            console.error(
              'Немає жодної suite у проєкті для fallback. Попроси Lead/Admin створити **одну** suite в UI (або дати право на add suite).\n' +
                '  Або вкажи наявну секцію: TESTRAIL_SECTION_ID=... (id з URL/UI) — тоді suite підставиться автоматично.'
            );
            process.exit(1);
          }
        }
      }
      suiteId = suite.id;
      console.log(`Using suite: ${suite.name} (id ${suiteId})`);
    } else if (list.length) {
      suiteId = list[0].id;
      console.log(`Using suite: ${list[0].name} (id ${suiteId})`);
    } else {
      console.error(
        'У проєкті немає жодної suite, а в збереженому .env не задано TESTRAIL_SUITE_NAME / TESTRAIL_SUITE_ID.\n' +
          '  • Додай TESTRAIL_SECTION_ID=... (id твоєї секції з TestRail) — suite підставиться з API, або\n' +
          '  • створи suite в UI / задай TESTRAIL_SUITE_NAME / TESTRAIL_SUITE_ID і збережи .env (Ctrl+S).'
      );
      process.exit(1);
    }
  } else {
    console.log(`Using suite id from TESTRAIL_SUITE_ID: ${suiteId}`);
  }

  const storyFromFile = storyArg || '';
  const files = findTestCaseFiles(dir);
  if (!files.length) {
    console.error('No [TC] *.md files in', dir);
    process.exit(1);
  }

  const firstCase = parseTestCaseFile(files[0]);
  const storyKey = storyFromFile || firstCase.storyKey;
  if (!storyKey) {
    console.error('Set TESTRAIL_STORY_KEY, --story TES-1, or **Story Key** in .md files.');
    process.exit(1);
  }

  const sectionNameEnv = (process.env.TESTRAIL_SECTION_NAME || '').trim();
  let sectionId;

  if (sectionIdFromEnvMode != null) {
    sectionId = sectionIdFromEnvMode;
  } else {
    const sections = await client.getSections(projectId, suiteId);
    const list = sections || [];
    if (list.length) {
      console.log(
        `Секції в поточній suite (${suiteId}):\n` +
          list.map((s) => `  id=${s.id}  "${s.name}"`).join('\n')
      );
    } else {
      console.log(`У suite ${suiteId} поки немає секцій — скрипт створить нову.`);
    }

    let section = null;
    if (sectionNameEnv) {
      section = list.find((s) => s.name === sectionNameEnv);
      if (!section) {
        console.error(
          `Секції з точною назвою "${sectionNameEnv}" немає в цій suite. Вибери id зі списку вище → TESTRAIL_SECTION_ID=... або виправ назву.`
        );
        process.exit(1);
      }
    }

    if (!section) {
      const sectionName = `${storyKey} — Tests`;
      section = list.find(
        (s) =>
          s.name === sectionName ||
          s.name.startsWith(`${storyKey} `) ||
          s.name.trim() === storyKey ||
          s.name.includes(storyKey)
      );
    }

    if (!section) {
      section = await client.addSection(projectId, {
        suite_id: suiteId,
        name: `${storyKey} — Tests`,
        description: `Linked Jira story: ${storyKey}`
      });
      console.log(`Created section: ${section.name} (id ${section.id})`);
    } else {
      console.log(`Using existing section: ${section.name} (id ${section.id})`);
    }

    sectionId = section.id;
  }

  const { stepsTemplateId, textTemplateId } = await resolveCaseTemplateIds(client, projectId);
  console.log(
    `Templates: «Steps» id ${stepsTemplateId} (для кроків), дефолтний текстовий id ${textTemplateId}`
  );

  let created = 0;
  for (const file of files) {
    const tc = parseTestCaseFile(file);
    const refs = tc.storyKey || storyKey;
    const title = tc.title.replace(/^\[TC\]\s*/, '').trim();

    const preamble = [];
    if (tc.description) preamble.push(`Summary: ${tc.description}`);
    if (tc.preconditions.length) {
      preamble.push(`Preconditions:\n${tc.preconditions.map((p, i) => `${i + 1}. ${p}`).join('\n')}`);
    }
    const stepsPayload = buildStepsPayload(tc.steps);
    if (preamble.length && stepsPayload.custom_steps_separated?.length) {
      stepsPayload.custom_steps_separated.unshift({
        content: preamble.join('\n\n'),
        expected: '(see following steps)'
      });
    }

    const hasSeparatedSteps = (stepsPayload.custom_steps_separated?.length ?? 0) > 0;
    const body = {
      title,
      refs,
      priority_id: priorityToId(tc.priority),
      ...(hasSeparatedSteps ? { template_id: stepsTemplateId } : {}),
      ...stepsPayload
    };

    try {
      const added = await client.addCase(sectionId, body);
      console.log(`  Added case: ${added.id} — ${added.title}`);
      created++;
    } catch (e) {
      console.error(`  Failed (steps template + separated): ${title}`);
      console.error(`  ${e.message}`);
      if (tc.steps.length) {
        try {
          const plain = buildCustomStepsPlain(preamble, tc.steps);
          const added = await client.addCase(sectionId, {
            title,
            refs,
            priority_id: priorityToId(tc.priority),
            template_id: Number(textTemplateId),
            custom_steps: plain
          });
          console.log(`  Added case (text steps fallback): ${added.id} — ${added.title}`);
          created++;
          continue;
        } catch (e2) {
          console.error(`  Text steps fallback failed: ${e2.message}`);
        }
      }
      console.error('  Retrying with title + refs + priority only...');
      const added = await client.addCase(sectionId, {
        title,
        refs,
        priority_id: priorityToId(tc.priority)
      });
      console.log(`  Added case (minimal): ${added.id} — ${added.title}`);
      created++;
    }
  }

  console.log(`\nDone. Created ${created} case(s) in section ${sectionId}.`);
}

main().catch((err) => {
  printTestRailPermissionHint(err);
  console.error(err);
  process.exit(1);
});

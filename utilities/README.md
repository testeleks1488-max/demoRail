# Jira/Xray Test Management Utilities

This directory contains utilities for integrating with Jira and Xray test management.

## Directory Structure

```
utilities/
├── jira-mcp-server/          # MCP Server for Cursor integration
│   ├── index.js              # Main MCP server
│   ├── jira-client.js        # Jira REST API client
│   ├── xray-client.js        # Xray REST API client
│   ├── config.example.json   # Example configuration
│   └── package.json          # Dependencies
├── sync-to-jira.js           # Batch sync utility (Jira/Xray)
├── sync-to-testrail.js       # Push .md test cases to TestRail (section per story, refs = Jira key)
├── parse-test-case-md.js     # Shared markdown parser for sync scripts
├── load-env.js               # Loads repo-root .env into process.env
├── testrail-client.js        # Minimal TestRail REST API v2 client
├── validate-before-sync.js   # Validate Story keys and (optionally) folder structure before sync
├── fetch-story.js            # Fetch story hierarchy from Jira, create test-plans folder structure
└── README.md                 # This file
```

## MCP Server

### Overview
The MCP server provides Cursor IDE with tools to interact with Jira and Xray.

### Available Tools

| Tool | Description |
|------|-------------|
| `jira_get_issue` | Get details of a Jira issue |
| `jira_search_issues` | Search issues using JQL |
| `jira_create_test` | Create a new Xray Test |
| `xray_add_test_steps` | Add steps to a test |
| `xray_get_test_steps` | Get test steps |
| `jira_create_test_plan` | Create a Test Plan |
| `xray_add_tests_to_plan` | Add tests to plan |
| `jira_create_test_execution` | Create Test Execution |
| `xray_add_tests_to_execution` | Add tests to execution |
| `jira_create_test_set` | Create a Test Set |
| `xray_add_tests_to_set` | Add tests to set |
| `jira_link_test_to_story` | Link test to user story |
| `jira_add_labels` | Add labels to issue |
| `jira_update_issue` | Update issue fields |
| `jira_get_project` | Get project details |

### Setup

1. **Install Dependencies**
   ```bash
   cd utilities/jira-mcp-server
   npm install
   ```

2. **Configure MCP in Cursor**
   
   Add to `~/.cursor/mcp.json`:
   ```json
   {
     "mcpServers": {
       "jira-xray": {
         "command": "node",
         "args": ["C:/Users/anatolii.alieksanov/Desktop/jira-qa-space/utilities/jira-mcp-server/index.js"],
         "env": {
           "JIRA_URL": "https://your-domain.atlassian.net",
           "JIRA_EMAIL": "your-email@example.com",
           "JIRA_API_TOKEN": "your-api-token",
           "XRAY_CLIENT_ID": "your-xray-client-id",
           "XRAY_CLIENT_SECRET": "your-xray-client-secret"
         }
       }
     }
   }
   ```

3. **Restart Cursor**

### Getting Credentials

#### Jira API Token
1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Name it (e.g., "Cursor MCP")
4. Copy the token

#### Xray Cloud API Keys (Client ID + Client Secret)

Xray использует не один "API key", а пару **Client Id** и **Client Secret**. Ключ создаётся **для конкретного пользователя Jira**.

**Шаги:**
1. В Jira: **Settings (шестерёнка)** → **Apps** → в списке приложений найдите **Xray**.
2. Слева в меню: **Xray Settings** → **API Keys**.
3. Нажмите **Create API Key**.
4. В диалоге: **выберите пользователя** (User) и нажмите **Generate**.
5. Появятся **Client Id** и **Client Secret** — скопируйте их сразу. **Client Secret показывается один раз**, потом его нельзя посмотреть (только перегенерировать).

Документация: [How to get API Keys](https://docs.getxray.app/display/ProductKB/%5BXray+Cloud%5D+How+to+get+API+Keys), [Global Settings: API Keys](https://docs.getxray.app/display/XRAYCLOUD/Global+Settings%3A+API+Keys).

**Если при создании API Key нет пользователя в списке (пустой выбор User):**
- Заходить нужно под пользователем с правами **Jira Administrator** (или тем, у кого есть доступ к настройкам приложений).
- Убедитесь, что заходите в **Jira Administration** → **Apps** → **Xray** → **API Keys** (именно из админки, не из проекта).
- В Jira Cloud: **Settings** → **Apps** → **Manage your apps** → найдите Xray → **Get** / настройки, либо через **Jira settings** → **Apps** → **Xray Settings** → **API Keys** (путь может зависеть от версии).
- Если список пользователей по-прежнему пуст: проверьте, что в Jira есть активные пользователи с доступом к сайту; при необходимости попросите другого администратора создать API Key и передать вам Client Id и Client Secret.
- Если у вас Jira Data Center/Server — путь может быть другим (например, через **Administration** → **Applications** → **Xray**).

## Sync Utility

### Usage

**Sync single file:**
```bash
node sync-to-jira.js "test-plans/PROJ/PROJ-100/PROJ-101/test-cases/[TC] PROJ-101 - Login - Verify Valid Credentials.md"
```

**Sync all files in directory:**
```bash
node sync-to-jira.js --all test-plans/
```

### Environment Variables

Set these before running:
```bash
# Windows PowerShell
$env:JIRA_URL = "https://your-domain.atlassian.net"
$env:JIRA_EMAIL = "your-email@example.com"
$env:JIRA_API_TOKEN = "your-api-token"
$env:XRAY_CLIENT_ID = "your-client-id"
$env:XRAY_CLIENT_SECRET = "your-client-secret"
# Optional: Jira issue link type when linking Test to Story (default: Tests)
$env:JIRA_LINK_TYPE_TEST_TO_STORY = "Tests"

# Windows CMD
set JIRA_URL=https://your-domain.atlassian.net
set JIRA_EMAIL=your-email@example.com
set JIRA_API_TOKEN=your-api-token
```

### What it Does

1. Parses local test case markdown files
2. Creates Test issues in Jira via Xray
3. Adds test steps to the test
4. Links tests to user stories
5. Updates local files with Jira keys

### Steps-only (existing Jira keys)

```bash
node sync-to-jira.js --steps-only "test-plans/SCRUM/SCRUM-5/test-cases"
```

## TestRail sync (`sync-to-testrail.js`)

Pushes `[TC] *.md` files into a **TestRail project**: creates a **section** named `{STORY_KEY} — Tests` (e.g. `TES-1 — Tests`) if missing, then **add_case** with **`refs` = Jira story key**.

1. Copy `.env.example` to `.env` at **repo root** and set:
   - `TESTRAIL_URL` (e.g. `https://eleksdemo.testrail.io`)
   - `TESTRAIL_EMAIL`
   - `TESTRAIL_API_KEY` (My Settings → API Keys in TestRail; never commit)
   - `TESTRAIL_PROJECT_ID` (numeric ID from project URL or settings)
2. Optional: `TESTRAIL_SUITE_ID` — if omitted, the **first suite** in the project is used.
3. Run from repo root:

```bash
npm run sync-testrail
# or
node utilities/sync-to-testrail.js --dir "test-plans/TES/TES-1/test-cases"
```

If `custom_steps_separated` is rejected by your TestRail template, the script **retries** with title + refs + priority only (add steps in UI).

**403 Forbidden:** your user can log in but lacks **project role** permissions (add suites / cases). Ask a TestRail admin to add you to the project with **Tester** or **Lead** (or equivalent write access), not Guest-only.

**Can add cases / runs but cannot create suites:** normal in some roles. Either ask Lead to create one suite in the UI and set `TESTRAIL_SUITE_ID` in `.env`, or leave `TESTRAIL_SUITE_NAME` unset so sync uses the **first** suite; if API suite creation fails, sync **falls back** to the first existing suite automatically.

### Create a suite (API)

```bash
npm run testrail-create-suite -- "My new suite" "Optional description"
```

Or set **`TESTRAIL_SUITE_NAME`** in `.env`: on `npm run sync-testrail`, the suite is **created** if it does not exist, then sections/cases are added under it.

See [TestRail API reference](https://support.testrail.com/hc/en-us/sections/7077185274644-API-reference).

## Validate Before Sync

Run before syncing to ensure Story keys in your markdown files exist in Jira (and optionally that folder structure matches):

```bash
node validate-before-sync.js "test-plans/PROJ/.../test-cases/[TC] PROJ-101 - Login - Verify.md"
node validate-before-sync.js --all test-plans/
node validate-before-sync.js --all --check-folders test-plans/
```

Uses the same env vars as sync (JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN). Exit code 0 if all valid, 1 otherwise.

## Fetch Story (create folder structure)

Create the test-plans folder structure for a Story without generating content:

```bash
node fetch-story.js PROJ-101
# or with URL:
node fetch-story.js https://your-domain.atlassian.net/browse/PROJ-101
```

Creates `test-plans/PROJ/EPIC/PROJ-101/test-cases/` using Jira hierarchy (parent = Epic). Requires JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN.

## Troubleshooting

### "Authentication failed"
- Verify JIRA_EMAIL and JIRA_API_TOKEN are correct
- Ensure API token has necessary permissions

### "Project not found"
- Check project key is correct
- Verify you have access to the project

### "Issue type 'Test' not found"
- Ensure Xray is installed in your Jira project
- Check Xray issue types are configured

### "Xray authentication failed"
- Verify XRAY_CLIENT_ID and XRAY_CLIENT_SECRET
- Xray Cloud credentials are separate from Jira credentials

### "Нет пользователя при выборе API Key" (пустой список User при создании API Key)
- Входить в Jira нужно под учёткой с правами **Jira Administrator**.
- Открывать: **Settings** (или **Jira settings**) → **Apps** → **Xray** → **API Keys** (раздел **Xray Settings** → **API Keys**).
- Если списка пользователей всё ещё нет: создание ключа может делать другой админ; после создания он передаёт вам **Client Id** и **Client Secret** — их можно подставить в MCP (`XRAY_CLIENT_ID`, `XRAY_CLIENT_SECRET`).
- Убедитесь, что Xray установлен и активен для вашего сайта Jira Cloud.

## API Reference

### Jira REST API v3
- Base URL: `https://your-domain.atlassian.net/rest/api/3`
- [Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)

### Xray Cloud API v2
- Base URL: `https://xray.cloud.getxray.app/api/v2`
- [Documentation](https://docs.getxray.app/display/XRAYCLOUD/REST+API)

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation
3. Check Jira/Xray permissions

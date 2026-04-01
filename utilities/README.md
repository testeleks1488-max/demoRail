# Jira/Xray Test Management Utilities

This directory contains utilities for integrating with Jira and Xray test management.

## Directory Structure

```
utilities/
├── jira-mcp-server/          # MCP Server for Cursor (Jira + Xray)
│   ├── index.js              # Main MCP server
│   ├── jira-client.js        # Jira REST API client
│   ├── xray-client.js        # Xray REST API client
│   ├── config.example.json   # Example configuration
│   └── package.json          # Dependencies
├── sync-to-jira.js           # Batch sync utility (Jira/Xray)
├── parse-test-case-md.js     # Shared markdown parser (Jira sync + reading [TC] *.md for AI)
├── load-env.js               # Loads repo-root .env into process.env
├── validate-before-sync.js   # Validate Story keys and (optionally) folder structure before sync
├── fetch-story.js            # Fetch story hierarchy from Jira, create test-plans folder structure
└── README.md                 # This file
```

**TestRail** is integrated via the external MCP package [`@bun913/mcp-testrail`](https://github.com/bun913/mcp-testrail) (see **TestRail MCP** below)—not via scripts in this folder.

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
   
   Add **both** servers to `~/.cursor/mcp.json`. Use an **absolute path** to `jira-mcp-server/index.js` on your machine.

   ```json
   {
     "mcpServers": {
       "jira-xray": {
         "command": "node",
         "args": ["/absolute/path/to/jira-qa-space/utilities/jira-mcp-server/index.js"],
         "env": {
           "JIRA_URL": "https://your-domain.atlassian.net",
           "JIRA_EMAIL": "your-email@example.com",
           "JIRA_API_TOKEN": "your-api-token",
           "XRAY_CLIENT_ID": "your-xray-client-id",
           "XRAY_CLIENT_SECRET": "your-xray-client-secret"
         }
       },
       "testrail": {
         "command": "npx",
         "args": ["@bun913/mcp-testrail@latest"],
         "env": {
           "TESTRAIL_URL": "https://your-instance.testrail.io",
           "TESTRAIL_USERNAME": "your-testrail-login-or-email",
           "TESTRAIL_API_KEY": "your-testrail-api-key"
         }
       }
     }
   }
   ```

3. **Restart Cursor**

### TestRail MCP (external)

- **Package:** [`@bun913/mcp-testrail`](https://www.npmjs.com/package/@bun913/mcp-testrail) · **Source:** [bun913/mcp-testrail](https://github.com/bun913/mcp-testrail)
- **Tools:** projects, suites, sections, cases, runs, results, etc. (see upstream README).
- **Workflow:** Read local `[TC] *.md` with the same markdown structure as templates; create/update cases via MCP using your project’s template and custom fields. If HTTP 400 occurs, use upstream guidance: call `getCaseFields`, set the correct **template** for separated steps, and document project rules in `CLAUDE.md` / agent rules as needed.
- **Refs:** Set TestRail `refs` (or required custom fields) to the Jira story key for traceability.
- **API reference:** [TestRail REST API](https://support.testrail.com/hc/en-us/sections/7077185274644-API-reference)

### Getting Credentials

#### Jira API Token
1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Name it (e.g., "Cursor MCP")
4. Copy the token

#### Xray Cloud API Keys (Client ID + Client Secret)

Xray does not use a single “API key”; it uses **Client Id** and **Client Secret**. Keys are created **for a specific Jira user**.

**Steps:**
1. In Jira: **Settings (gear)** → **Apps** → find **Xray** in the app list.
2. In the menu: **Xray Settings** → **API Keys**.
3. Click **Create API Key**.
4. In the dialog: **select user** (User) and click **Generate**.
5. **Client Id** and **Client Secret** are shown — copy them immediately. **Client Secret is shown once** only (regenerate if lost).

Docs: [How to get API Keys](https://docs.getxray.app/display/ProductKB/%5BXray+Cloud%5D+How+to+get+API+Keys), [Global Settings: API Keys](https://docs.getxray.app/display/XRAYCLOUD/Global+Settings%3A+API+Keys).

**If the User list is empty when creating an API Key:**
- Sign in as a **Jira Administrator** (or a user with access to app administration).
- Open **Jira Administration** → **Apps** → **Xray** → **API Keys** (admin area, not inside a project).
- In Jira Cloud: **Settings** → **Apps** → **Manage your apps** → Xray → **Get** / settings, or **Jira settings** → **Apps** → **Xray Settings** → **API Keys** (path varies by version).
- If the user list is still empty: ensure active users exist; another admin may need to create the key and send you **Client Id** and **Client Secret**.
- On Jira Data Center / Server the path may differ (e.g. **Administration** → **Applications** → **Xray**).

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

### "No user in API Key dialog" (empty User list when creating Xray API Key)
- Sign in with **Jira Administrator** (or equivalent app admin rights).
- Open **Settings** / **Jira settings** → **Apps** → **Xray** → **API Keys** (**Xray Settings** → **API Keys**).
- If there is still no user list: another admin may create the key and send **Client Id** and **Client Secret** for MCP (`XRAY_CLIENT_ID`, `XRAY_CLIENT_SECRET`).
- Confirm Xray is installed and active for your Jira Cloud site.

## API Reference

### Jira REST API v3
- Base URL: `https://your-domain.atlassian.net/rest/api/3`
- [Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)

### Xray Cloud API v2
- Base URL: `https://xray.cloud.getxray.app/api/v2`
- [Documentation](https://docs.getxray.app/display/XRAYCLOUD/REST+API)

### TestRail (via MCP)
- Used through [@bun913/mcp-testrail](https://github.com/bun913/mcp-testrail); see [TestRail API](https://support.testrail.com/hc/en-us/sections/7077185274644-API-reference) for field semantics.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation
3. Check Jira/Xray permissions

# Jira QA Space - Test Case Management Framework

AI-powered test case management framework for Cursor IDE with **Jira/Xray** and **TestRail** integration via MCP.

## Overview

This framework enables QA engineers to:
- Generate test cases using AI based on Jira User Stories
- Manage test documentation in local markdown files
- Synchronize test cases to Jira/Xray automatically
- Track test coverage and execution status

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Cursor IDE                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Cursor Rules│  │ Test Cases  │  │   MCP Client        │  │
│  │   (.mdc)    │  │   (.md)     │  │                     │  │
│  └─────────────┘  └─────────────┘  └──────────┬──────────┘  │
└───────────────────────────────────────────────┼─────────────┘
                                                │
                                                ▼
                              ┌─────────────────────────────┐
                              │   MCP: jira-xray + testrail │
                              │  ┌─────────┐ ┌───────────┐  │
                              │  │Jira/Xray│ │ TestRail  │  │
                              │  └─────────┘ └───────────┘  │
                              └──────────────┬──────────────┘
                                             │
                                             ▼
                              ┌─────────────────────────────┐
                              │   Jira Cloud + TestRail     │
                              └─────────────────────────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+ (on PATH; required for `npx` TestRail MCP)
- Cursor IDE
- Jira Cloud account with Xray installed (optional if you only use TestRail)
- Jira API Token and Xray Cloud API credentials (for Jira/Xray MCP)
- TestRail URL, login, and API key (for [TestRail MCP](https://github.com/bun913/mcp-testrail))

### Installation

1. **Clone/Copy the project**
   ```bash
   cd C:\Users\anatolii.alieksanov\Desktop\jira-qa-space
   ```

2. **Install MCP server dependencies**
   ```bash
   cd utilities/jira-mcp-server
   npm install
   ```

3. **Configure Cursor MCP**
   
   Edit `~/.cursor/mcp.json` and add:
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
           "XRAY_CLIENT_SECRET": "your-xray-client-secret",
           "JIRA_TEST_ISSUE_TYPE": "Story",
           "JIRA_LINK_TYPE_TEST_TO_STORY": "Tests"
         }
       }
     }
   }
   ```

4. **Restart Cursor IDE**

### Custom Xray mapping (Test = Story)
If your Xray is configured so that the **Test** entity uses Jira issue type **Story** (not "Test"), set in MCP `env`:
- **JIRA_TEST_ISSUE_TYPE** = `Story` — so created tests are created as Story issues.
- **JIRA_LINK_TYPE_TEST_TO_STORY** = the exact link type name from Jira (see [troubleshooting](#no-issue-link-type-with-name-tests-found-404-when-linking-test-to-story) for how to find it).

### Getting Credentials

#### Jira API Token
1. Visit [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Create new API token
3. Copy the token value

#### Xray Cloud API Credentials
1. In Jira, go to Apps → Xray → Settings
2. Navigate to API Keys
3. Generate new API key pair
4. Copy Client ID and Client Secret

## Usage

For a single path from Story to tests and back, see **[QUICKSTART.md](QUICKSTART.md)**.

### Workflow

1. **Get User Story Details**
   ```
   "Get details for user story PROJ-123"
   ```

2. **Generate Test Cases**
   ```
   "Generate comprehensive test cases for PROJ-123"
   ```

3. **Review Generated Tests**
   - Review markdown files in `test-plans/` folder
   - Adjust as needed

4. **Sync to Jira**
   ```
   "Sync test cases for PROJ-123 to Jira"
   ```

### Example Conversation

```
User: Generate test cases for user story PROJ-101

AI: I'll analyze the user story and generate comprehensive test cases.

[Uses jira_get_issue to fetch story details]
[Analyzes acceptance criteria]
[Creates test case files in test-plans/PROJ/PROJ-100/PROJ-101/test-cases/]

Created 8 test cases:
- [TC] PROJ-101 - Login - Verify Valid Credentials
- [TC] PROJ-101 - Login - Verify Invalid Password Error
- [TC] PROJ-101 - Login - Verify Empty Email Validation
...

Would you like me to sync these to Jira?

User: Yes, sync them

AI: [Creates tests in Jira via MCP]
[Adds test steps]
[Links to user story]

✅ Synced 8 test cases to Jira:
🔗 PROJ-201: https://your-domain.atlassian.net/browse/PROJ-201
🔗 PROJ-202: https://your-domain.atlassian.net/browse/PROJ-202
...
```

## Project Structure

```
jira-qa-space/
├── .cursor/
│   └── rules/                      # Cursor AI rules
│       ├── qa-workflow-jira.mdc    # Main workflow
│       ├── qa-jira-integration.mdc # Jira integration
│       ├── qa-xray-sync.mdc        # Xray synchronization
│       ├── qa-test-generation.mdc  # Test generation
│       ├── qa-repository-structure.mdc
│       ├── qa-file-templates.mdc
│       ├── qa-testrail-mcp.mdc
│       ├── qa-git-user-push-only.mdc
│       └── qa-language-uk-chat-en-code.mdc
├── utilities/
│   ├── jira-mcp-server/            # MCP server
│   │   ├── index.js                # Server entry point
│   │   ├── jira-client.js          # Jira API client
│   │   └── xray-client.js          # Xray API client
│   ├── sync-to-jira.js             # Batch sync utility
│   ├── validate-before-sync.js     # Validate Story keys before sync
│   ├── fetch-story.js              # Fetch story hierarchy, create folders
│   └── README.md
├── QUICKSTART.md                   # Step-by-step: Story to tests to Jira
├── test-plans/                     # Test documentation
│   └── [PROJECT]/
│       └── [EPIC]/
│           └── [STORY]/
│               └── test-cases/
├── templates/                      # File templates
│   ├── test-case-template.md
│   ├── test-suite-template.md
│   └── test-plan-template.md
├── .gitignore
├── package.json
└── README.md
```

## MCP Tools Reference

### Jira / Xray (`jira-xray` server)

| Tool | Description |
|------|-------------|
| `jira_get_issue` | Get issue details by key |
| `jira_get_story_hierarchy` | Get project/epic/story keys and folder path |
| `jira_search_issues` | Search with JQL |
| `jira_create_test` | Create Xray Test |
| `xray_add_test_steps` | Add test steps |
| `jira_create_test_plan` | Create Test Plan |
| `xray_add_tests_to_plan` | Add tests to plan |
| `jira_create_test_execution` | Create execution |
| `jira_link_test_to_story` | Link test to story |
| `jira_add_labels` | Add labels |

### TestRail (`testrail` server — [`bun913/mcp-testrail`](https://github.com/bun913/mcp-testrail))

Use the **TestRail MCP** tools from that package (e.g. projects, suites, sections, cases, runs, results). Full list and parameters are defined upstream. Typical workflow: `getCaseFields` / resolve template → `addCase` / `updateCase` with steps and `refs` for Jira story keys.

Do **not** use removed repo CLI scripts for TestRail; the agent should call TestRail MCP tools only (see [`.cursor/rules/qa-testrail-mcp.mdc`](.cursor/rules/qa-testrail-mcp.mdc)).

## Test Case Naming Convention

```
[TC] [Issue-Key] - [Feature] - [Test Name]
```

Examples:
- `[TC] PROJ-101 - Login - Verify Valid Credentials`
- `[TC] PROJ-101 - Login - Verify Invalid Password Error`
- `[TC] PROJ-101 - Login - Prerequisites - Setup`

## Labels Convention

| Label | Purpose |
|-------|---------|
| `story-proj-123` | Links to user story |
| `priority-p1` | Priority level |
| `to-automate` | Marked for automation |
| `regression` | Regression test |
| `smoke` | Smoke test |

## Troubleshooting

### MCP Server Not Responding
1. Check Node.js is installed: `node --version`
2. Verify mcp.json path is correct
3. Restart Cursor IDE

### Authentication Errors
1. Verify API token is valid
2. Check email matches Atlassian account
3. Confirm Jira URL format: `https://domain.atlassian.net`

### Xray API Errors
1. Confirm Xray is installed in project
2. Verify Xray Cloud credentials (separate from Jira)
3. Check Xray issue types are configured

### TestRail MCP (`spawn node ENOENT`, auth, 400 on addCase)
1. Ensure Node.js is on **PATH** (`npx` runs the TestRail MCP).
2. Check `TESTRAIL_URL`, `TESTRAIL_USERNAME`, `TESTRAIL_API_KEY` in `mcp.json`.
3. **HTTP 400** when creating cases: wrong template or required custom fields—use TestRail MCP `getCaseFields` and follow [bun913/mcp-testrail troubleshooting](https://github.com/bun913/mcp-testrail#troubleshooting).

### Tests Not Appearing in Jira / "Specify a valid issue type" (400)
1. Check project has a Test issue type (e.g. in Project settings → Issue types).
2. If the type name in Jira is not exactly "Test", set **JIRA_TEST_ISSUE_TYPE** in MCP `env` (or in shell when using sync-to-jira.js) to the exact name your project uses (e.g. the name shown in Jira when creating an issue).
3. Verify user has create permissions and labels don't contain invalid characters.

### "No issue link type with name 'Tests' found" (404 when linking Test to Story)
Set **JIRA_LINK_TYPE_TEST_TO_STORY** to the exact link type name used in your Jira:
1. In Jira open any issue and click **Link issue**.
2. In the link type dropdown, find the type you use to link a test to a story/task (e.g. "Tests", "Test", "Covers", or a localized name).
3. In `~/.cursor/mcp.json` (or env for sync-to-jira.js) set `JIRA_LINK_TYPE_TEST_TO_STORY` to that exact string.
4. Restart Cursor and run sync again.

### Xray returns 404 when adding test steps (Cannot POST /api/v2/test/.../step)
- **Re-index:** If your Xray maps Test to a custom Jira type (e.g. Story), run a project re-index in Xray (Apps → Xray → Settings / Administration) so Xray treats the issues as tests; then try adding steps again.
- **Xray Server vs Cloud:** This project uses Xray Cloud API (`xray.cloud.getxray.app`). If you use Xray Server (on-prem), the API base URL and paths may differ; adjust in the MCP server config.
- **Workaround:** Add test steps manually in Jira for each test issue; step text is in the local `.md` files under `test-plans/.../test-cases/`.

## Best Practices

1. **Always review generated tests** before syncing
2. **Keep test steps atomic** - one action per step
3. **Use consistent naming** - follow conventions
4. **Link all tests to stories** - maintain traceability
5. **Add appropriate labels** - enable filtering
6. **Update local files** after manual Jira changes

## Contributing

1. Follow existing code patterns
2. Update relevant Cursor rules
3. Test MCP tools before committing
4. Document new features in README

## License

MIT

## Support

For issues:
1. Check troubleshooting section
2. Review Cursor rules for guidance
3. Check Jira/Xray / TestRail API documentation ([TestRail MCP README](https://github.com/bun913/mcp-testrail))

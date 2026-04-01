# Quick Start: From Story to Tests in Jira

## Steps

1. **Get the Story URL** from Jira (e.g. `https://your-domain.atlassian.net/browse/PROJ-101`).

2. **Generate test cases in Cursor:** *"Generate comprehensive test cases for [URL or PROJ-101]"*. The AI will fetch the Story, create folder structure, and add markdown test case files.

3. **Review** the files in `test-plans/.../test-cases/`.

4. **Sync to Jira:** *"Sync test cases for PROJ-101 to Jira"* (or run `node utilities/sync-to-jira.js --all test-plans` with env set). Optionally run `node utilities/validate-before-sync.js --all test-plans` first.

5. **TestRail (optional):** With [TestRail MCP](https://github.com/bun913/mcp-testrail) configured in Cursor, ask the AI to create/update cases from the same `[TC] *.md` files (see `.cursor/rules/qa-testrail-mcp.mdc`).

Optional: create folder structure only with `node utilities/fetch-story.js PROJ-101`.

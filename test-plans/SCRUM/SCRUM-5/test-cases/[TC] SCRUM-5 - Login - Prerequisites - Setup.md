# [TC] SCRUM-5 - Login - Prerequisites - Setup

## Jira Reference
- **Issue Key**: SCRUM-6
- **URL**: https://testeleks1488.atlassian.net/browse/SCRUM-6
- **Sync Status**: ✅ Synced

## User Story Reference
- **Story Key**: SCRUM-5
- **Story URL**: https://testeleks1488.atlassian.net/browse/SCRUM-5
- **Story Title**: User can log in using valid credentials

## Summary
**Description**: Common setup steps required for all Login test cases. User must already exist in the system; login page is accessible from the main page.

**AC Coverage**: Prerequisites for AC1–AC5

**Test Data Summary**:
- **Test URL**: Application base URL
- **Test User**: Registered user credentials
- **Expected Values**: Browser ready, application accessible

## Priority
**Priority**: P1

## Labels
```
story-scrum-5
authentication
login
priority-p1
```

## Preconditions
1. Browser (Chrome/Firefox latest) is installed
2. Application is deployed and accessible
3. Test user account exists in the system

## Test Steps

| # | Step | Test Data | Expected Result |
|---|------|-----------|-----------------|
| 1 | Open browser and navigate to application main page | Application URL | Main page loads |
| 2 | Locate and click the Login link or button | — | Login page is accessible |

## Notes
Run this setup once per test session. Authentication is required for all subsequent Login test cases.

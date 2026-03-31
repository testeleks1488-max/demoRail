# [TC] SCRUM-5 - Login - Verify Login Page Opens

## Jira Reference
- **Issue Key**: SCRUM-7
- **URL**: https://testeleks1488.atlassian.net/browse/SCRUM-7
- **Sync Status**: ✅ Synced

## User Story Reference
- **Story Key**: SCRUM-5
- **Story URL**: https://testeleks1488.atlassian.net/browse/SCRUM-5
- **Story Title**: User can log in using valid credentials

## Summary
**Description**: Verify that the user can open the Login page from the main page.

**AC Coverage**: AC1 (User can open the Login page)

**Test Data Summary**:
- **Test URL**: Application URL
- **Test User**: N/A
- **Expected Values**: Login page with email and password fields visible

## Priority
**Priority**: P1

## Labels
```
story-scrum-5
authentication
login
priority-p1
to-automate
```

## Preconditions
1. User is on the application homepage or main page
2. Application is accessible

## Test Steps

| # | Step | Test Data | Expected Result |
|---|------|-----------|-----------------|
| 1 | Open browser and navigate to application main page | Application URL | Main page is displayed |
| 2 | Click the Login link or button | — | Login page opens |
| 3 | Verify Login page elements are present | — | Email field, password field, and Login button are visible |

## Notes
Login page must be accessible from the main page per story notes.

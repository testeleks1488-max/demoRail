# [TC] TES-1 - Login - Verify Invalid Credentials Error

## Jira Reference
- **Issue Key**: [To be created]
- **URL**: [To be created]
- **Sync Status**: ⏳ Pending sync

## TestRail Reference
- **Case ID**: 64
- **Location**: DEMOTESTRAIL · suite Master · section DEMO
- **Sync Status**: ✅ Synced

## User Story Reference
- **Story Key**: TES-1
- **Story URL**: https://testeleks1488.atlassian.net/browse/TES-1
- **Story Title**: User can log in using valid credentials

## Summary
**Description**: Verify that an error message is shown when the user enters invalid credentials (wrong email or password).

**AC Coverage**: AC5 (An error message is shown for invalid credentials)

**Test Data Summary**:
- **Test URL**: Application login URL
- **Test User**: Invalid or wrong password
- **Expected Values**: Error message displayed, user remains on Login page

## Priority
**Priority**: P2

## Labels
```
story-tes-1
authentication
login
priority-p2
to-automate
```

## Preconditions
1. User is on the Login page
2. Application is accessible

## Test Steps

| # | Step | Test Data | Expected Result |
|---|------|-----------|-----------------|
| 1 | Open Login page | Application login URL | Login page is displayed |
| 2 | Enter invalid email or valid email with wrong password | Invalid credentials | Fields accept input |
| 3 | Click the Login button | — | Login is not successful |
| 4 | Verify error message is displayed | — | An error message is shown for invalid credentials |
| 5 | Verify user remains on Login page | — | User is not redirected; remains on Login page |

## Notes
Negative scenario for AC5.

# [TC] TES-1 - Login - Verify Empty Password Validation

## Jira Reference
- **Issue Key**: [To be created]
- **URL**: [To be created]
- **Sync Status**: ⏳ Pending sync

## TestRail Reference
- **Case ID**: 63
- **Location**: DEMOTESTRAIL · suite Master · section DEMO
- **Sync Status**: ✅ Synced

## User Story Reference
- **Story Key**: TES-1
- **Story URL**: https://testeleks1488.atlassian.net/browse/TES-1
- **Story Title**: User can log in using valid credentials

## Summary
**Description**: Verify that the system validates when the password field is left empty on Login.

**AC Coverage**: Validation; complements AC2

**Test Data Summary**:
- **Test URL**: Application login URL
- **Test User**: Email only; password empty
- **Expected Values**: Validation message or error; no login

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

## Test Steps

| # | Step | Test Data | Expected Result |
|---|------|-----------|-----------------|
| 1 | Open Login page | Application login URL | Login page is displayed |
| 2 | Enter valid email in email field; leave password field empty | Valid email only | Email is entered |
| 3 | Click the Login button | — | System does not log in |
| 4 | Verify validation or error is shown | — | Validation message or error is displayed for empty password |

## Notes
Boundary/validation test.

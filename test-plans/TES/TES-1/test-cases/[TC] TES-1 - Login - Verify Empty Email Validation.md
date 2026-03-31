# [TC] TES-1 - Login - Verify Empty Email Validation

## Jira Reference
- **Issue Key**: [To be created]
- **URL**: [To be created]
- **Sync Status**: ⏳ Pending sync

## User Story Reference
- **Story Key**: TES-1
- **Story URL**: https://testeleks1488.atlassian.net/browse/TES-1
- **Story Title**: User can log in using valid credentials

## Summary
**Description**: Verify that the system validates when the email field is left empty on Login (validation/error handling).

**AC Coverage**: Validation; complements AC2

**Test Data Summary**:
- **Test URL**: Application login URL
- **Test User**: Password only; email empty
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
| 2 | Leave email field empty; enter password in password field | Valid password only | Password is entered |
| 3 | Click the Login button | — | System does not log in |
| 4 | Verify validation or error is shown | — | Validation message or error is displayed for empty email |

## Notes
Boundary/validation test.

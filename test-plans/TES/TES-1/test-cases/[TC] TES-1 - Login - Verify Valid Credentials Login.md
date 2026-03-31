# [TC] TES-1 - Login - Verify Valid Credentials Login

## Jira Reference
- **Issue Key**: [To be created]
- **URL**: [To be created]
- **Sync Status**: ⏳ Pending sync

## User Story Reference
- **Story Key**: TES-1
- **Story URL**: https://testeleks1488.atlassian.net/browse/TES-1
- **Story Title**: User can log in using valid credentials

## Summary
**Description**: Verify that a registered user can enter valid email and password, log in successfully, and is redirected to the Dashboard.

**AC Coverage**: AC2, AC3, AC4 (Enter valid credentials, successful login, redirect to Dashboard)

**Test Data Summary**:
- **Test URL**: Application login URL
- **Test User**: Valid registered user email and password
- **Expected Values**: Dashboard page after login

## Priority
**Priority**: P1

## Labels
```
story-tes-1
authentication
login
priority-p1
to-automate
```

## Preconditions
1. User is on the Login page
2. Test user account exists with valid credentials

## Test Steps

| # | Step | Test Data | Expected Result |
|---|------|-----------|-----------------|
| 1 | Open Login page | Application login URL | Login page is displayed |
| 2 | Enter valid email in the email field | Valid user email | Email is accepted |
| 3 | Enter valid password in the password field | Valid user password | Password is masked |
| 4 | Click the Login button | — | User is logged in successfully |
| 5 | Verify redirect | — | User is redirected to the Dashboard (personal dashboard) |

## Notes
Core happy path for Login story.

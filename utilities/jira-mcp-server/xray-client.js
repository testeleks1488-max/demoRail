/**
 * Xray REST API Client
 * Handles all interactions with Xray Cloud REST API
 * 
 * Note: Xray has two API sets:
 * 1. REST API v2 (Cloud) - uses separate authentication
 * 2. Jira REST API - for creating Test issues (uses Jira auth)
 */

export class XrayClient {
  constructor(jiraClient, xrayConfig = {}) {
    this.jiraClient = jiraClient;
    this.cloudBaseUrl = xrayConfig.cloudBaseUrl || 'https://xray.cloud.getxray.app';
    // GraphQL endpoint (same host as REST; path is /api/v2/graphql). Override with XRAY_GRAPHQL_URL if needed.
    this.graphqlBaseUrl = xrayConfig.graphqlBaseUrl || this.cloudBaseUrl;
    this.clientId = xrayConfig.clientId;
    this.clientSecret = xrayConfig.clientSecret;
    this.linkTypeForRequirement = xrayConfig.linkTypeForRequirement || 'Tests';
    this.testIssueType = xrayConfig.testIssueType || 'Test';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Authenticate with Xray Cloud API
   */
  async authenticate() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await fetch(`${this.cloudBaseUrl}/api/v2/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret
      })
    });

    if (!response.ok) {
      throw new Error(`Xray authentication failed: ${response.status}`);
    }

    // Token is returned as plain text
    this.accessToken = await response.text();
    this.accessToken = this.accessToken.replace(/"/g, ''); // Remove quotes if present
    this.tokenExpiry = Date.now() + (50 * 60 * 1000); // 50 minutes

    return this.accessToken;
  }

  /**
   * Make authenticated request to Xray Cloud API
   */
  async cloudRequest(endpoint, options = {}) {
    const token = await this.authenticate();
    const url = `${this.cloudBaseUrl}${endpoint}`;
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!response.ok) {
      throw new Error(`Xray API Error ${response.status}: ${JSON.stringify(data)}`);
    }

    return data;
  }

  /**
   * Create a Test issue in Jira (Xray Test type).
   * Issue type is configurable via xrayConfig.testIssueType or env JIRA_TEST_ISSUE_TYPE (default "Test").
   */
  async createTest(projectKey, summary, description, testType = 'Manual', additionalFields = {}) {
    const result = await this.jiraClient.createIssue(
      projectKey,
      this.testIssueType,
      summary,
      description,
      additionalFields
    );
    return result;
  }

  /**
   * Get test steps for a test
   */
  async getTestSteps(testKey) {
    return this.cloudRequest(`/api/v2/test/${testKey}/step`, {
      method: 'GET'
    });
  }

  /**
   * Add test steps via Xray GraphQL API (works for any issue type mapped as Test, e.g. Story).
   * REST POST /api/v2/test/{key}/step often returns 404 when Test is mapped to a custom Jira type.
   * @param {string} testKey - The test issue key (e.g. SCRUM-6)
   * @param {Array} steps - Array of step objects: { action, data, result }
   */
  async addTestStepsGraphQL(testKey, steps) {
    const issue = await this.jiraClient.getIssue(testKey);
    const issueId = String(issue.id);

    const graphqlUrl = `${this.graphqlBaseUrl.replace(/\/$/, '')}/api/v2/graphql`;
    const token = await this.authenticate();

    const results = [];
    for (const step of steps) {
      const action = step.action || step.step || '';
      const data = step.data || step.testData || '';
      const result = step.result || step.expectedResult || '';

      const mutation = {
        query: `mutation AddTestStep($issueId: String!, $step: CreateStepInput!) {
          addTestStep(issueId: $issueId, step: $step) {
            id
            action
            data
            result
          }
        }`,
        variables: {
          issueId,
          step: { action, data, result }
        }
      };

      const response = await fetch(graphqlUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mutation)
      });

      const text = await response.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }

      if (!response.ok) {
        throw new Error(`Xray GraphQL Error ${response.status}: ${JSON.stringify(parsed)}`);
      }
      if (parsed.errors && parsed.errors.length) {
        throw new Error(`Xray GraphQL: ${parsed.errors.map(e => e.message).join('; ')}`);
      }
      if (parsed.data && parsed.data.addTestStep) {
        results.push(parsed.data.addTestStep);
      }
    }
    return results;
  }

  /**
   * Add test steps to a test.
   * Uses GraphQL (addTestStep) so it works when Xray Test is mapped to a custom Jira type (e.g. Story).
   * REST POST /api/v2/test/{key}/step is not used because it returns 404 in that setup.
   * @param {string} testKey - The test issue key
   * @param {Array} steps - Array of step objects: { action, data, result }
   */
  async addTestSteps(testKey, steps) {
    const formattedSteps = steps.map((step) => ({
      action: step.action || step.step || '',
      data: step.data || step.testData || '',
      result: step.result || step.expectedResult || ''
    }));
    return this.addTestStepsGraphQL(testKey, formattedSteps);
  }

  /**
   * Update a specific test step
   */
  async updateTestStep(testKey, stepId, stepData) {
    return this.cloudRequest(`/api/v2/test/${testKey}/step/${stepId}`, {
      method: 'PUT',
      body: JSON.stringify(stepData)
    });
  }

  /**
   * Delete a test step
   */
  async deleteTestStep(testKey, stepId) {
    return this.cloudRequest(`/api/v2/test/${testKey}/step/${stepId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Create a Test Plan
   */
  async createTestPlan(projectKey, summary, description, additionalFields = {}) {
    return this.jiraClient.createIssue(
      projectKey,
      'Test Plan',
      summary,
      description,
      additionalFields
    );
  }

  /**
   * Add tests to a Test Plan
   */
  async addTestsToTestPlan(testPlanKey, testKeys) {
    return this.cloudRequest(`/api/v2/testplan/${testPlanKey}/test`, {
      method: 'POST',
      body: JSON.stringify({
        add: testKeys
      })
    });
  }

  /**
   * Remove tests from a Test Plan
   */
  async removeTestsFromTestPlan(testPlanKey, testKeys) {
    return this.cloudRequest(`/api/v2/testplan/${testPlanKey}/test`, {
      method: 'POST',
      body: JSON.stringify({
        remove: testKeys
      })
    });
  }

  /**
   * Create a Test Execution
   */
  async createTestExecution(projectKey, summary, description, additionalFields = {}) {
    return this.jiraClient.createIssue(
      projectKey,
      'Test Execution',
      summary,
      description,
      additionalFields
    );
  }

  /**
   * Add tests to a Test Execution
   */
  async addTestsToTestExecution(testExecutionKey, testKeys) {
    return this.cloudRequest(`/api/v2/testexecution/${testExecutionKey}/test`, {
      method: 'POST',
      body: JSON.stringify({
        add: testKeys
      })
    });
  }

  /**
   * Create a Test Set
   */
  async createTestSet(projectKey, summary, description, additionalFields = {}) {
    return this.jiraClient.createIssue(
      projectKey,
      'Test Set',
      summary,
      description,
      additionalFields
    );
  }

  /**
   * Add tests to a Test Set
   */
  async addTestsToTestSet(testSetKey, testKeys) {
    return this.cloudRequest(`/api/v2/testset/${testSetKey}/test`, {
      method: 'POST',
      body: JSON.stringify({
        add: testKeys
      })
    });
  }

  /**
   * Link test to a requirement (User Story). Link type from linkTypeForRequirement (default "Tests").
   */
  async linkTestToRequirement(testKey, requirementKey) {
    return this.jiraClient.linkIssues(testKey, requirementKey, this.linkTypeForRequirement);
  }

  /**
   * Import test execution results
   * @param {Object} results - Xray JSON format results
   */
  async importTestExecutionResults(results) {
    return this.cloudRequest('/api/v2/import/execution', {
      method: 'POST',
      body: JSON.stringify(results)
    });
  }

  /**
   * Get test execution URL
   */
  getTestExecutionUrl(testExecutionKey) {
    return this.jiraClient.getIssueUrl(testExecutionKey);
  }

  /**
   * Get test URL
   */
  getTestUrl(testKey) {
    return this.jiraClient.getIssueUrl(testKey);
  }
}

export default XrayClient;

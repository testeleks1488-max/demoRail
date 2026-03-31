/**
 * Jira REST API Client
 * Handles all interactions with Jira Cloud REST API v3
 */

export class JiraClient {
  constructor(baseUrl, email, apiToken) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.email = email;
    this.apiToken = apiToken;
    this.authHeader = `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`;
  }

  /**
   * Make authenticated request to Jira API
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': this.authHeader,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    };

    try {
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
        throw new Error(`Jira API Error ${response.status}: ${JSON.stringify(data)}`);
      }

      return data;
    } catch (error) {
      throw new Error(`Jira Request Failed: ${error.message}`);
    }
  }

  /**
   * Get issue details by key or ID
   */
  async getIssue(issueKeyOrId, fields = '*all') {
    const endpoint = `/rest/api/3/issue/${issueKeyOrId}?fields=${fields}`;
    return this.request(endpoint, { method: 'GET' });
  }

  /**
   * Create a new issue
   */
  async createIssue(projectKey, issueType, summary, description, additionalFields = {}) {
    const endpoint = '/rest/api/3/issue';
    const body = {
      fields: {
        project: { key: projectKey },
        issuetype: { name: issueType },
        summary: summary,
        description: this.formatDescription(description),
        ...additionalFields
      }
    };

    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  /**
   * Update an existing issue
   */
  async updateIssue(issueKeyOrId, fields) {
    const endpoint = `/rest/api/3/issue/${issueKeyOrId}`;
    const body = { fields };

    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  /**
   * Add labels to an issue
   */
  async addLabels(issueKeyOrId, labels) {
    const endpoint = `/rest/api/3/issue/${issueKeyOrId}`;
    const body = {
      update: {
        labels: labels.map(label => ({ add: label }))
      }
    };

    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  /**
   * Create issue link between two issues
   */
  async linkIssues(inwardIssueKey, outwardIssueKey, linkType = 'Tests') {
    const endpoint = '/rest/api/3/issueLink';
    const body = {
      type: { name: linkType },
      inwardIssue: { key: inwardIssueKey },
      outwardIssue: { key: outwardIssueKey }
    };

    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  /**
   * Search issues using JQL
   */
  async searchIssues(jql, fields = 'summary,status,issuetype', maxResults = 50) {
    const endpoint = '/rest/api/3/search';
    const body = {
      jql: jql,
      fields: fields.split(','),
      maxResults: maxResults
    };

    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  /**
   * Get project details
   */
  async getProject(projectKey) {
    const endpoint = `/rest/api/3/project/${projectKey}`;
    return this.request(endpoint, { method: 'GET' });
  }

  /**
   * Get available issue types for a project
   */
  async getIssueTypes(projectKey) {
    const project = await this.getProject(projectKey);
    return project.issueTypes || [];
  }

  /**
   * Format description to Atlassian Document Format (ADF)
   */
  formatDescription(text) {
    if (!text) return null;
    
    // If already ADF format, return as-is
    if (typeof text === 'object' && text.type === 'doc') {
      return text;
    }

    // Convert plain text to ADF
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    
    return {
      type: 'doc',
      version: 1,
      content: paragraphs.map(paragraph => ({
        type: 'paragraph',
        content: [{
          type: 'text',
          text: paragraph.trim()
        }]
      }))
    };
  }

  /**
   * Extract plain text from ADF description
   */
  extractTextFromADF(adf) {
    if (!adf || typeof adf === 'string') return adf || '';
    
    const extractText = (content) => {
      if (!content) return '';
      return content.map(node => {
        if (node.type === 'text') return node.text;
        if (node.content) return extractText(node.content);
        return '';
      }).join('');
    };

    return extractText(adf.content);
  }

  /**
   * Get issue URL
   */
  getIssueUrl(issueKey) {
    return `${this.baseUrl}/browse/${issueKey}`;
  }

  /**
   * Get story hierarchy for folder structure: projectKey, epicKey, storyKey.
   * Uses issue.fields.project.key and issue.fields.parent.key (Jira parent link).
   * If no parent, epicKey falls back to storyKey (path: test-plans/PROJ/STORY/test-cases/).
   */
  async getStoryHierarchy(issueKey) {
    const fields = 'project,parent';
    const issue = await this.getIssue(issueKey, fields);
    const projectKey = issue.fields?.project?.key || issueKey.split('-')[0];
    const storyKey = issue.key || issueKey;
    let epicKey = issue.fields?.parent?.key || null;
    if (!epicKey) epicKey = storyKey;
    const folderPath = `test-plans/${projectKey}/${epicKey}/${storyKey}/test-cases`;
    return { projectKey, epicKey, storyKey, folderPath };
  }
}

export default JiraClient;

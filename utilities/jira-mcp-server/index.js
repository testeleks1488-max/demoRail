#!/usr/bin/env node

/**
 * Jira/Xray MCP Server
 * Provides tools for interacting with Jira and Xray from Cursor
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { JiraClient } from './jira-client.js';
import { XrayClient } from './xray-client.js';

// Initialize clients from environment variables
const jiraClient = new JiraClient(
  process.env.JIRA_URL || 'https://your-domain.atlassian.net',
  process.env.JIRA_EMAIL || '',
  process.env.JIRA_API_TOKEN || ''
);

const xrayClient = new XrayClient(jiraClient, {
  cloudBaseUrl: process.env.XRAY_CLOUD_URL || 'https://xray.cloud.getxray.app',
  clientId: process.env.XRAY_CLIENT_ID || '',
  clientSecret: process.env.XRAY_CLIENT_SECRET || '',
  linkTypeForRequirement: process.env.JIRA_LINK_TYPE_TEST_TO_STORY || 'Tests',
  testIssueType: process.env.JIRA_TEST_ISSUE_TYPE || 'Test'
});

// Create MCP server
const server = new Server(
  {
    name: 'jira-xray-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
const tools = [
  {
    name: 'jira_get_issue',
    description: 'Get details of a Jira issue (User Story, Epic, Task, etc.) by key or ID',
    inputSchema: {
      type: 'object',
      properties: {
        issueKey: {
          type: 'string',
          description: 'The issue key (e.g., PROJ-123) or ID'
        },
        fields: {
          type: 'string',
          description: 'Comma-separated list of fields to return (default: *all)',
          default: '*all'
        }
      },
      required: ['issueKey']
    }
  },
  {
    name: 'jira_search_issues',
    description: 'Search for issues using JQL (Jira Query Language)',
    inputSchema: {
      type: 'object',
      properties: {
        jql: {
          type: 'string',
          description: 'JQL query string (e.g., project = PROJ AND type = Story)'
        },
        fields: {
          type: 'string',
          description: 'Comma-separated list of fields to return',
          default: 'summary,status,issuetype'
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 50
        }
      },
      required: ['jql']
    }
  },
  {
    name: 'jira_create_test',
    description: 'Create a new Test (Xray) in Jira',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: {
          type: 'string',
          description: 'The project key (e.g., PROJ)'
        },
        summary: {
          type: 'string',
          description: 'Test case title/summary'
        },
        description: {
          type: 'string',
          description: 'Test case description'
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: 'Labels to add to the test'
        }
      },
      required: ['projectKey', 'summary']
    }
  },
  {
    name: 'xray_add_test_steps',
    description: 'Add test steps to an existing Xray Test',
    inputSchema: {
      type: 'object',
      properties: {
        testKey: {
          type: 'string',
          description: 'The test issue key (e.g., PROJ-123)'
        },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              action: { type: 'string', description: 'Step action/instruction' },
              data: { type: 'string', description: 'Test data for this step' },
              result: { type: 'string', description: 'Expected result' }
            },
            required: ['action', 'result']
          },
          description: 'Array of test steps'
        }
      },
      required: ['testKey', 'steps']
    }
  },
  {
    name: 'xray_get_test_steps',
    description: 'Get all test steps from an Xray Test',
    inputSchema: {
      type: 'object',
      properties: {
        testKey: {
          type: 'string',
          description: 'The test issue key (e.g., PROJ-123)'
        }
      },
      required: ['testKey']
    }
  },
  {
    name: 'jira_create_test_plan',
    description: 'Create a new Test Plan (Xray) in Jira',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: {
          type: 'string',
          description: 'The project key (e.g., PROJ)'
        },
        summary: {
          type: 'string',
          description: 'Test plan title/summary'
        },
        description: {
          type: 'string',
          description: 'Test plan description'
        }
      },
      required: ['projectKey', 'summary']
    }
  },
  {
    name: 'xray_add_tests_to_plan',
    description: 'Add tests to an existing Test Plan',
    inputSchema: {
      type: 'object',
      properties: {
        testPlanKey: {
          type: 'string',
          description: 'The test plan issue key (e.g., PROJ-456)'
        },
        testKeys: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of test issue keys to add'
        }
      },
      required: ['testPlanKey', 'testKeys']
    }
  },
  {
    name: 'jira_create_test_execution',
    description: 'Create a new Test Execution (Xray) in Jira',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: {
          type: 'string',
          description: 'The project key (e.g., PROJ)'
        },
        summary: {
          type: 'string',
          description: 'Test execution title/summary'
        },
        description: {
          type: 'string',
          description: 'Test execution description'
        }
      },
      required: ['projectKey', 'summary']
    }
  },
  {
    name: 'xray_add_tests_to_execution',
    description: 'Add tests to an existing Test Execution',
    inputSchema: {
      type: 'object',
      properties: {
        testExecutionKey: {
          type: 'string',
          description: 'The test execution issue key (e.g., PROJ-789)'
        },
        testKeys: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of test issue keys to add'
        }
      },
      required: ['testExecutionKey', 'testKeys']
    }
  },
  {
    name: 'jira_create_test_set',
    description: 'Create a new Test Set (Xray) in Jira',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: {
          type: 'string',
          description: 'The project key (e.g., PROJ)'
        },
        summary: {
          type: 'string',
          description: 'Test set title/summary'
        },
        description: {
          type: 'string',
          description: 'Test set description'
        }
      },
      required: ['projectKey', 'summary']
    }
  },
  {
    name: 'xray_add_tests_to_set',
    description: 'Add tests to an existing Test Set',
    inputSchema: {
      type: 'object',
      properties: {
        testSetKey: {
          type: 'string',
          description: 'The test set issue key (e.g., PROJ-101)'
        },
        testKeys: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of test issue keys to add'
        }
      },
      required: ['testSetKey', 'testKeys']
    }
  },
  {
    name: 'jira_link_test_to_story',
    description: 'Link a Test to a User Story with "Tests" relationship',
    inputSchema: {
      type: 'object',
      properties: {
        testKey: {
          type: 'string',
          description: 'The test issue key (e.g., PROJ-123)'
        },
        storyKey: {
          type: 'string',
          description: 'The user story issue key (e.g., PROJ-456)'
        }
      },
      required: ['testKey', 'storyKey']
    }
  },
  {
    name: 'jira_add_labels',
    description: 'Add labels to a Jira issue',
    inputSchema: {
      type: 'object',
      properties: {
        issueKey: {
          type: 'string',
          description: 'The issue key (e.g., PROJ-123)'
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: 'Labels to add'
        }
      },
      required: ['issueKey', 'labels']
    }
  },
  {
    name: 'jira_update_issue',
    description: 'Update fields of a Jira issue',
    inputSchema: {
      type: 'object',
      properties: {
        issueKey: {
          type: 'string',
          description: 'The issue key (e.g., PROJ-123)'
        },
        fields: {
          type: 'object',
          description: 'Object with field names and values to update'
        }
      },
      required: ['issueKey', 'fields']
    }
  },
  {
    name: 'jira_get_project',
    description: 'Get project details including available issue types',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: {
          type: 'string',
          description: 'The project key (e.g., PROJ)'
        }
      },
      required: ['projectKey']
    }
  },
  {
    name: 'jira_get_story_hierarchy',
    description: 'Get project/epic/story keys and folder path for a Story. Uses Jira parent for Epic; if no parent, epicKey equals storyKey.',
    inputSchema: {
      type: 'object',
      properties: {
        issueKey: {
          type: 'string',
          description: 'The story or issue key (e.g., PROJ-101)'
        }
      },
      required: ['issueKey']
    }
  }
];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'jira_get_issue':
        result = await jiraClient.getIssue(args.issueKey, args.fields || '*all');
        break;

      case 'jira_search_issues':
        result = await jiraClient.searchIssues(
          args.jql,
          args.fields || 'summary,status,issuetype',
          args.maxResults || 50
        );
        break;

      case 'jira_create_test':
        result = await xrayClient.createTest(
          args.projectKey,
          args.summary,
          args.description || '',
          'Manual',
          args.labels ? { labels: args.labels } : {}
        );
        result.url = jiraClient.getIssueUrl(result.key);
        break;

      case 'xray_add_test_steps':
        result = await xrayClient.addTestSteps(args.testKey, args.steps);
        break;

      case 'xray_get_test_steps':
        result = await xrayClient.getTestSteps(args.testKey);
        break;

      case 'jira_create_test_plan':
        result = await xrayClient.createTestPlan(
          args.projectKey,
          args.summary,
          args.description || ''
        );
        result.url = jiraClient.getIssueUrl(result.key);
        break;

      case 'xray_add_tests_to_plan':
        result = await xrayClient.addTestsToTestPlan(args.testPlanKey, args.testKeys);
        break;

      case 'jira_create_test_execution':
        result = await xrayClient.createTestExecution(
          args.projectKey,
          args.summary,
          args.description || ''
        );
        result.url = jiraClient.getIssueUrl(result.key);
        break;

      case 'xray_add_tests_to_execution':
        result = await xrayClient.addTestsToTestExecution(args.testExecutionKey, args.testKeys);
        break;

      case 'jira_create_test_set':
        result = await xrayClient.createTestSet(
          args.projectKey,
          args.summary,
          args.description || ''
        );
        result.url = jiraClient.getIssueUrl(result.key);
        break;

      case 'xray_add_tests_to_set':
        result = await xrayClient.addTestsToTestSet(args.testSetKey, args.testKeys);
        break;

      case 'jira_link_test_to_story':
        result = await xrayClient.linkTestToRequirement(args.testKey, args.storyKey);
        break;

      case 'jira_add_labels':
        result = await jiraClient.addLabels(args.issueKey, args.labels);
        break;

      case 'jira_update_issue':
        result = await jiraClient.updateIssue(args.issueKey, args.fields);
        break;

      case 'jira_get_project':
        result = await jiraClient.getProject(args.projectKey);
        break;

      case 'jira_get_story_hierarchy':
        result = await jiraClient.getStoryHierarchy(args.issueKey);
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Jira/Xray MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});

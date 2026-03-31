/**
 * Shared parser for QA test case markdown (templates/test-case-*.md style).
 */

import fs from 'fs';

export function parseTestCaseFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const testCase = {
    title: '',
    storyKey: '',
    description: '',
    priority: 'P2',
    labels: [],
    preconditions: [],
    steps: [],
    syncStatus: 'pending',
    jiraKey: null
  };

  let currentSection = null;
  let inStepsTable = false;

  for (const line of lines) {
    if (line.startsWith('# [TC]')) {
      testCase.title = line.replace('# ', '').trim();
      continue;
    }

    if (line.includes('**Issue Key**:')) {
      const match = line.match(/\*\*Issue Key\*\*:\s*(\S+)/);
      if (match && !match[1].includes('[To be')) {
        testCase.jiraKey = match[1];
      }
      continue;
    }

    if (line.includes('**Story Key**:')) {
      const match = line.match(/\*\*Story Key\*\*:\s*(\S+)/);
      if (match) {
        testCase.storyKey = match[1];
      }
      continue;
    }

    if (line.includes('**Priority**:')) {
      const match = line.match(/\*\*Priority\*\*:\s*(P[1-4])/);
      if (match) {
        testCase.priority = match[1];
      }
      continue;
    }

    if (line.includes('**Description**:')) {
      testCase.description = line.replace('**Description**:', '').trim();
      continue;
    }

    if (line.startsWith('## ')) {
      currentSection = line.replace('## ', '').trim().toLowerCase();
      inStepsTable = false;
      continue;
    }

    if (currentSection === 'labels' && line.trim() && !line.startsWith('```')) {
      const label = line.replace('-', '').trim();
      if (label && !label.includes('{')) {
        testCase.labels.push(label);
      }
      continue;
    }

    if (currentSection === 'preconditions' && line.match(/^\d+\./)) {
      testCase.preconditions.push(line.replace(/^\d+\.\s*/, '').trim());
      continue;
    }

    if (currentSection === 'test steps') {
      if (line.includes('|') && line.includes('#')) {
        inStepsTable = true;
        continue;
      }
      if (line.startsWith('|---')) {
        continue;
      }
      if (inStepsTable && line.startsWith('|')) {
        const cells = line.split('|').map(c => c.trim()).filter(c => c);
        if (cells.length >= 3) {
          testCase.steps.push({
            action: cells[1] || '',
            data: cells[2] || '',
            result: cells[3] || cells[2] || ''
          });
        }
      }
    }
  }

  return testCase;
}

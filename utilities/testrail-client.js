/**
 * TestRail REST API v2 (Cloud / Server)
 * Auth: HTTP Basic — login (usually email) + password field = **API key** OR **account password**
 * @see https://support.testrail.com/hc/en-us/articles/7077039051284-Accessing-the-TestRail-API
 */

/**
 * @returns {{ login: string, secret: string, usedAccountPassword: boolean }}
 */
export function testrailCredentialsFromEnv() {
  const login = (process.env.TESTRAIL_USER || process.env.TESTRAIL_EMAIL || '').trim();
  const password = (process.env.TESTRAIL_PASSWORD || '').trim();
  const usePassword = password.length > 0;
  let secret = usePassword ? password : (process.env.TESTRAIL_API_KEY || '').trim();
  if (!usePassword && secret.endsWith('.') && secret.length > 4) {
    secret = secret.slice(0, -1);
  }
  return { login, secret, usedAccountPassword: usePassword };
}

/**
 * Log UA hint when API returns 403 (authenticated but not allowed).
 */
export function printTestRailPermissionHint(err) {
  const s = String(err?.message || err);
  if (!s.includes('403')) return;
  console.error(`
TestRail 403 Forbidden — логін/API key прийняті, але **немає прав** на цю операцію:
  • У вебі відкрий той самий проєкт (id з .env: TESTRAIL_PROJECT_ID) — якщо кейси/suites створити не можеш і там, через API теж буде 403.
  • Потрібна роль з правами на проєкт: додавати **suites**, **sections**, **test cases** (зазвичай не Guest; часто Lead / Tester з повними правами / Admin).
  • Адмін інстансу: *Administration* → *Users & Roles* → твій user → доступ до проєкту + роль з write до тестів.
  • На спільних демо-інстансах (на кшталт eleksdemo) часто треба, щоб **адмін саме цього інстансу** додав тебе в проєкт або підвищив роль.

Детальніше: [Suites / permissions](https://support.testrail.com/hc/en-us/articles/7077936624276-Suites)
`);
}

/**
 * TestRail Cloud часто повертає пагінований об’єкт { suites: [...] } / { sections: [...] },
 * а не «голий» масив (див. offset/limit у відповіді).
 */
function normalizeApiList(data, key) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray(data[key])) return data[key];
  return [];
}

export class TestRailClient {
  /**
   * @param {string} baseUrl - e.g. https://eleksdemo.testrail.io
   * @param {string} userOrEmail - TestRail login (usually email)
   * @param {string} apiKeyOrPassword - API key **or** account password (second part of Basic auth)
   */
  constructor(baseUrl, userOrEmail, apiKeyOrPassword) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.email = (userOrEmail || '').trim();
    this.apiKey = (apiKeyOrPassword || '').trim();
    this.authHeader = `Basic ${Buffer.from(`${this.email}:${this.apiKey}`, 'utf8').toString('base64')}`;
  }

  async request(method, endpoint, body = null) {
    const url = `${this.baseUrl}/index.php?/api/v2/${endpoint}`;
    const opts = {
      method,
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    };
    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      opts.body = JSON.stringify(body);
    }

    const response = await fetch(url, opts);
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!response.ok) {
      throw new Error(`TestRail API ${response.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
    }
    return data;
  }

  getProject(projectId) {
    return this.request('GET', `get_project/${projectId}`);
  }

  /** @returns {Promise<Array<Record<string, unknown>>>} */
  async getTemplates(projectId) {
    const data = await this.request('GET', `get_templates/${projectId}`);
    return normalizeApiList(data, 'templates');
  }

  async getSuites(projectId) {
    const data = await this.request('GET', `get_suites/${projectId}`);
    return normalizeApiList(data, 'suites');
  }

  /** @param {{ name: string, description?: string }} fields */
  addSuite(projectId, fields) {
    return this.request('POST', `add_suite/${projectId}`, fields);
  }

  /**
   * TestRail очікує suite_id в тому ж «сегменті», що й project_id:
   * GET …/api/v2/get_sections/:project_id&suite_id=:id
   * (?suite_id= ламає парсер URI на Cloud)
   */
  async getSections(projectId, suiteId) {
    let path = `get_sections/${projectId}`;
    if (suiteId !== undefined && suiteId !== null && suiteId !== '') {
      path += `&suite_id=${encodeURIComponent(String(suiteId))}`;
    }
    const data = await this.request('GET', path);
    return normalizeApiList(data, 'sections');
  }

  getSection(sectionId) {
    return this.request('GET', `get_section/${sectionId}`);
  }

  /** @param {{ suite_id: number, name: string, description?: string, parent_id?: number }} fields */
  addSection(projectId, fields) {
    return this.request('POST', `add_section/${projectId}`, fields);
  }

  /** @param {number} sectionId @param {Record<string, unknown>} fields */
  addCase(sectionId, fields) {
    return this.request('POST', `add_case/${sectionId}`, fields);
  }
}

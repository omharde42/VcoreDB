import { Router, Request, Response } from 'express';

export const dashboardRouter = Router();

const HTML_DASHBOARD = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VCoreDB — Enterprise Developer Platform</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #0d1117; color: #c9d1d9; }
    code, pre { font-family: 'Fira Code', monospace; }
  </style>
</head>
<body class="min-h-screen flex flex-col">
  <div id="app"></div>

  <!-- Command Palette Modal -->
  <div id="cmdPaletteModal" class="hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-20">
    <div class="bg-gray-900 border border-gray-800 w-full max-w-xl rounded-xl shadow-2xl overflow-hidden">
      <div class="p-3 border-b border-gray-800 flex items-center space-x-3">
        <span class="text-gray-500">🔍</span>
        <input id="cmdInput" placeholder="Search tables, commands, functions, or logs (Cmd+K)..." onkeyup="handleCmdSearch(this.value)" class="w-full bg-transparent text-white text-sm focus:outline-none" />
        <span class="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">ESC</span>
      </div>
      <div id="cmdResults" class="p-2 space-y-1 text-sm max-h-80 overflow-y-auto">
        <div onclick="setTab('database')" class="p-2 hover:bg-gray-800 rounded cursor-pointer flex items-center justify-between text-gray-300"><span>🗄️ Open Database Console</span><span class="text-xs text-gray-500">Tab</span></div>
        <div onclick="setTab('database'); setTimeout(() => runSqlQuery(), 200);" class="p-2 hover:bg-gray-800 rounded cursor-pointer flex items-center justify-between text-gray-300"><span>⚡ Open SQL Editor</span><span class="text-xs text-gray-500">Action</span></div>
        <div onclick="setTab('storage')" class="p-2 hover:bg-gray-800 rounded cursor-pointer flex items-center justify-between text-gray-300"><span>📦 Open Storage Buckets (25 GB Free)</span><span class="text-xs text-gray-500">Tab</span></div>
        <div onclick="setTab('functions')" class="p-2 hover:bg-gray-800 rounded cursor-pointer flex items-center justify-between text-gray-300"><span>🚀 Open Edge Functions</span><span class="text-xs text-gray-500">Tab</span></div>
      </div>
    </div>
  </div>

  <script>
    const API_BASE = '/api/v1';
    let currentProject = 'proj_default';
    let activeTab = 'overview';
    let wsConnection = null;

    function renderApp() {
      const app = document.getElementById('app');
      app.innerHTML = \`
        <div class="flex h-screen overflow-hidden">
          <!-- Sidebar -->
          <aside class="w-64 bg-gray-900 border-r border-gray-800 flex flex-col justify-between">
            <div>
              <div class="p-5 border-b border-gray-800 flex items-center space-x-3">
                <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xl">V</div>
                <div>
                  <h1 class="font-bold text-white tracking-wide">VCoreDB</h1>
                  <p class="text-xs text-emerald-400 font-medium">Free 25 GB Tier</p>
                </div>
              </div>

              <!-- Project Switcher & Cmd K -->
              <div class="p-4 border-b border-gray-800 bg-gray-950/40 space-y-2">
                <div>
                  <label class="text-xs text-gray-500 uppercase tracking-wider block mb-1">Active Project</label>
                  <select id="projectSelect" onchange="switchProject(this.value)" class="w-full bg-gray-800 text-white text-sm rounded border border-gray-700 p-2 focus:outline-none focus:border-indigo-500">
                    <option value="proj_default" \${currentProject === 'proj_default' ? 'selected' : ''}>Default Project (proj_default)</option>
                  </select>
                </div>
                <button onclick="toggleCmdPalette()" class="w-full bg-gray-900 border border-gray-800 hover:border-gray-700 text-left px-3 py-1.5 rounded text-xs text-gray-400 flex items-center justify-between">
                  <span>Search or Command...</span>
                  <span class="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">⌘K</span>
                </button>
              </div>

              <!-- Navigation -->
              <nav class="p-3 space-y-1 text-sm font-medium">
                <button onclick="setTab('overview')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-md \${activeTab === 'overview' ? 'bg-indigo-600/20 text-indigo-400 font-semibold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}">
                  <span>📊</span> <span>Project Overview</span>
                </button>
                <button onclick="setTab('usage')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-md \${activeTab === 'usage' ? 'bg-indigo-600/20 text-indigo-400 font-semibold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}">
                  <span>📈</span> <span>Usage & 25GB Quotas</span>
                </button>
                <button onclick="setTab('database')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-md \${activeTab === 'database' ? 'bg-indigo-600/20 text-indigo-400 font-semibold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}">
                  <span>🗄️</span> <span>Database Console</span>
                </button>
                <button onclick="setTab('connect')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-md \${activeTab === 'connect' ? 'bg-indigo-600/20 text-indigo-400 font-semibold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}">
                  <span>⚡</span> <span>Connect SDK / API</span>
                </button>
                <button onclick="setTab('auth')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-md \${activeTab === 'auth' ? 'bg-indigo-600/20 text-indigo-400 font-semibold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}">
                  <span>👥</span> <span>Authentication</span>
                </button>
                <button onclick="setTab('storage')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-md \${activeTab === 'storage' ? 'bg-indigo-600/20 text-indigo-400 font-semibold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}">
                  <span>📦</span> <span>Storage Buckets</span>
                </button>
                <button onclick="setTab('realtime')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-md \${activeTab === 'realtime' ? 'bg-indigo-600/20 text-indigo-400 font-semibold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}">
                  <span>📡</span> <span>Realtime Inspector</span>
                </button>
                <button onclick="setTab('functions')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-md \${activeTab === 'functions' ? 'bg-indigo-600/20 text-indigo-400 font-semibold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}">
                  <span>🚀</span> <span>Edge Functions</span>
                </button>
                <button onclick="setTab('webhooks')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-md \${activeTab === 'webhooks' ? 'bg-indigo-600/20 text-indigo-400 font-semibold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}">
                  <span>🪝</span> <span>Webhooks</span>
                </button>
                <button onclick="setTab('logs')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-md \${activeTab === 'logs' ? 'bg-indigo-600/20 text-indigo-400 font-semibold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}">
                  <span>📋</span> <span>Logs & Monitoring</span>
                </button>
                <button onclick="setTab('settings')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-md \${activeTab === 'settings' ? 'bg-indigo-600/20 text-indigo-400 font-semibold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}">
                  <span>⚙️</span> <span>Settings & Backups</span>
                </button>
              </nav>
            </div>

            <!-- Footer status -->
            <div class="p-4 border-t border-gray-800 text-xs text-gray-500 flex items-center justify-between">
              <span class="flex items-center space-x-2">
                <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                <span>Services Operational</span>
              </span>
              <span>v1.0.0</span>
            </div>
          </aside>

          <!-- Main Content View -->
          <main class="flex-1 bg-gray-950 overflow-y-auto p-8">
            <div id="content"></div>
          </main>
        </div>
      \`;

      loadTabContent();
    }

    function setTab(tab) {
      activeTab = tab;
      renderApp();
    }

    function switchProject(ref) {
      currentProject = ref;
      renderApp();
    }

    function toggleCmdPalette() {
      const modal = document.getElementById('cmdPaletteModal');
      modal.classList.toggle('hidden');
      if (!modal.classList.contains('hidden')) {
        document.getElementById('cmdInput').focus();
      }
    }

    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCmdPalette();
      }
      if (e.key === 'Escape') {
        document.getElementById('cmdPaletteModal')?.classList.add('hidden');
      }
    });

    async function loadTabContent() {
      const content = document.getElementById('content');

      if (activeTab === 'overview') {
        const metricsRes = await fetch(\`\${API_BASE}/projects/\${currentProject}/metrics\`, { headers: { 'x-vcore-api-key': 'vcore_anon_default_key' } });
        const metricsData = await metricsRes.json();
        const m = metricsData.metrics || {};

        content.innerHTML = \`
          <div>
            <h2 class="text-2xl font-bold text-white mb-2">Project Overview</h2>
            <p class="text-gray-400 mb-6">Real-time status, API credentials, and active resource metrics.</p>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div class="bg-gray-900 border border-gray-800 p-5 rounded-xl">
                <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Active Users</p>
                <p class="text-3xl font-bold text-white">\${m.active_users || 0}</p>
              </div>
              <div class="bg-gray-900 border border-gray-800 p-5 rounded-xl">
                <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Storage Buckets</p>
                <p class="text-3xl font-bold text-white">\${m.storage_buckets || 0}</p>
              </div>
              <div class="bg-gray-900 border border-gray-800 p-5 rounded-xl">
                <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Edge Functions</p>
                <p class="text-3xl font-bold text-white">\${m.edge_functions || 0}</p>
              </div>
            </div>

            <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 class="text-lg font-semibold text-white mb-4">Project Connection Keys</h3>
              <div class="space-y-4">
                <div>
                  <label class="text-xs text-gray-400 block mb-1">Project Endpoint URL</label>
                  <input readonly value="http://localhost:8080/api/v1/projects/\${currentProject}" class="w-full bg-gray-950 border border-gray-800 p-3 rounded font-mono text-sm text-indigo-400" />
                </div>
                <div>
                  <label class="text-xs text-gray-400 block mb-1">Public Anon API Key (Client side)</label>
                  <input readonly value="vcore_anon_default_key" class="w-full bg-gray-950 border border-gray-800 p-3 rounded font-mono text-sm text-gray-300" />
                </div>
              </div>
            </div>
          </div>
        \`;
      } else if (activeTab === 'usage') {
        const qRes = await fetch(\`\${API_BASE}/projects/\${currentProject}/quota\`, { headers: { 'x-vcore-api-key': 'vcore_anon_default_key' } });
        const qData = await qRes.json();
        const q = qData.quotas || {};

        content.innerHTML = \`
          <div>
            <h2 class="text-2xl font-bold text-white mb-2">Usage & 25 GB Free Plan Quotas</h2>
            <p class="text-gray-400 mb-6">Real-time resource tracking and plan allocation.</p>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div class="bg-gray-900 border border-gray-800 p-5 rounded-xl space-y-2">
                <div class="flex justify-between items-center"><span class="text-sm font-semibold text-white">Database Storage</span><span class="text-xs text-emerald-400">25 GB Included</span></div>
                <div class="w-full bg-gray-950 h-3 rounded-full overflow-hidden border border-gray-800"><div class="bg-indigo-600 h-full w-[1%]"></div></div>
                <p class="text-xs text-gray-400">125.8 MB / 25 GB Used (0.5%)</p>
              </div>

              <div class="bg-gray-900 border border-gray-800 p-5 rounded-xl space-y-2">
                <div class="flex justify-between items-center"><span class="text-sm font-semibold text-white">File Object Storage</span><span class="text-xs text-emerald-400">25 GB Included</span></div>
                <div class="w-full bg-gray-950 h-3 rounded-full overflow-hidden border border-gray-800"><div class="bg-indigo-600 h-full w-[1%]"></div></div>
                <p class="text-xs text-gray-400">0 MB / 25 GB Used (0.0%)</p>
              </div>

              <div class="bg-gray-900 border border-gray-800 p-5 rounded-xl space-y-2">
                <div class="flex justify-between items-center"><span class="text-sm font-semibold text-white">Monthly Bandwidth</span><span class="text-xs text-emerald-400">25 GB Included</span></div>
                <div class="w-full bg-gray-950 h-3 rounded-full overflow-hidden border border-gray-800"><div class="bg-emerald-500 h-full w-[11%]"></div></div>
                <p class="text-xs text-gray-400">2.85 GB / 25 GB Used (11.4%)</p>
              </div>
            </div>
          </div>
        \`;
      } else if (activeTab === 'database') {
        const tablesRes = await fetch(\`\${API_BASE}/projects/\${currentProject}/schema/tables\`, { headers: { 'x-vcore-api-key': 'vcore_anon_default_key' } });
        const tablesData = await tablesRes.json();
        const tables = tablesData.tables || [];

        const historyRes = await fetch(\`\${API_BASE}/projects/\${currentProject}/sql/history\`, { headers: { 'x-vcore-api-key': 'vcore_anon_default_key' } });
        const historyData = await historyRes.json();
        const history = historyData.history || [];

        content.innerHTML = \`
          <div>
            <h2 class="text-2xl font-bold text-white mb-2">PostgreSQL Database Console</h2>
            <p class="text-gray-400 mb-6">Interactive Tables, Views, Functions, Triggers, RLS Policies, and SQL Editor.</p>

            <div class="flex space-x-6">
              <!-- Left Tables Sidebar -->
              <div class="w-1/4 bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="font-semibold text-white">Tables</h3>
                  <button onclick="createNewTable()" class="text-xs bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1 rounded text-white font-medium">+ New Table</button>
                </div>
                <div class="space-y-1">
                  \${tables.map(t => \`<div onclick="loadTableData('\${t}')" class="p-2 hover:bg-gray-800 rounded cursor-pointer text-sm text-gray-300 flex items-center justify-between"><span>📄 \${t}</span></div>\`).join('')}
                </div>
              </div>

              <!-- Right SQL Editor & Workspaces -->
              <div class="w-3/4 space-y-6">
                <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <div class="flex items-center justify-between mb-3">
                    <h3 class="font-semibold text-white">Interactive PostgreSQL SQL Editor</h3>
                    <div class="space-x-2">
                      <button onclick="runExplainQuery()" class="bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 px-3 py-1.5 rounded">EXPLAIN ANALYZE</button>
                      <button onclick="runSqlQuery()" class="bg-indigo-600 hover:bg-indigo-500 text-xs text-white px-4 py-1.5 rounded font-medium">Run SQL (Cmd+Enter)</button>
                    </div>
                  </div>
                  <textarea id="sqlInput" class="w-full h-36 bg-gray-950 border border-gray-800 rounded-lg p-3 font-mono text-sm text-indigo-300 focus:outline-none focus:border-indigo-500 mb-3" placeholder="SELECT * FROM core.projects LIMIT 50;"></textarea>
                  <div id="sqlOutput"></div>
                </div>

                <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 class="font-semibold text-white mb-3">Recent SQL Execution History</h3>
                  <div class="space-y-2 font-mono text-xs max-h-48 overflow-y-auto">
                    \${history.map(h => \`
                      <div class="p-2.5 bg-gray-950 border border-gray-800 rounded flex justify-between items-center">
                        <span class="text-indigo-400 font-semibold">\${h.query}</span>
                        <span class="text-gray-500">\${h.duration_ms}ms</span>
                      </div>
                    \`).join('')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        \`;
      } else if (activeTab === 'connect') {
        content.innerHTML = \`
          <div>
            <h2 class="text-2xl font-bold text-white mb-2">Connect SDK & Client Setup</h2>
            <p class="text-gray-400 mb-6">Integration code snippets for TypeScript, JavaScript, Python, and REST.</p>

            <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
              <h3 class="font-semibold text-white mb-3">1. Install @vcoredb/client SDK</h3>
              <pre class="bg-gray-950 p-4 rounded text-sm text-emerald-400">npm install @vcoredb/client</pre>
            </div>

            <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 class="font-semibold text-white mb-3">2. Initialize Client in Your Application</h3>
              <pre class="bg-gray-950 p-4 rounded text-sm text-indigo-300">import { createClient } from "@vcoredb/client";

const vcore = createClient(
  "http://localhost:8080/api/v1/projects/\${currentProject}",
  "vcore_anon_default_key"
);

// Perform database query
const { data, error } = await vcore
  .from("tasks")
  .select("*")
  .execute();</pre>
            </div>
          </div>
        \`;
      } else if (activeTab === 'auth') {
        const usersRes = await fetch(\`\${API_BASE}/projects/\${currentProject}/auth/users\`, { headers: { 'x-vcore-api-key': 'vcore_anon_default_key' } });
        const usersData = await usersRes.json();
        const users = usersData.users || [];

        content.innerHTML = \`
          <div>
            <h2 class="text-2xl font-bold text-white mb-2">User Authentication</h2>
            <p class="text-gray-400 mb-6">Manage registered users, sessions, and verification state.</p>

            <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <table class="w-full text-left text-sm text-gray-300">
                <thead class="bg-gray-950 text-xs text-gray-500 uppercase">
                  <tr>
                    <th class="p-3">User ID</th>
                    <th class="p-3">Email</th>
                    <th class="p-3">Verified</th>
                    <th class="p-3">Created At</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-800">
                  \${users.map(u => \`
                    <tr>
                      <td class="p-3 font-mono text-xs text-indigo-400">\${u.id}</td>
                      <td class="p-3 font-medium text-white">\${u.email}</td>
                      <td class="p-3"><span class="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400">Verified</span></td>
                      <td class="p-3 text-xs text-gray-500">\${new Date(u.created_at).toLocaleString()}</td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
            </div>
          </div>
        \`;
      } else if (activeTab === 'storage') {
        const bRes = await fetch(\`\${API_BASE}/projects/\${currentProject}/storage/buckets\`, { headers: { 'x-vcore-api-key': 'vcore_anon_default_key' } });
        const bData = await bRes.json();
        const buckets = bData.buckets || [];

        content.innerHTML = \`
          <div>
            <h2 class="text-2xl font-bold text-white mb-2">Object Storage (25 GB Free)</h2>
            <p class="text-gray-400 mb-6">Manage public & private storage buckets and upload files.</p>

            <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-semibold text-white">Storage Buckets</h3>
                <button onclick="createBucketModal()" class="bg-indigo-600 text-xs text-white px-3 py-1.5 rounded">+ Create Bucket</button>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                \${buckets.map(b => \`
                  <div class="bg-gray-950 border border-gray-800 p-4 rounded-lg">
                    <div class="flex items-center justify-between mb-2">
                      <span class="font-bold text-white">📁 \${b.name}</span>
                      <span class="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">\${b.is_public ? 'Public' : 'Private'}</span>
                    </div>
                    <p class="text-xs text-gray-500">ID: \${b.id}</p>
                  </div>
                \`).join('')}
              </div>
            </div>
          </div>
        \`;
      } else if (activeTab === 'realtime') {
        content.innerHTML = \`
          <div>
            <h2 class="text-2xl font-bold text-white mb-2">Realtime Channel Inspector</h2>
            <p class="text-gray-400 mb-6">Live WebSocket subscriptions and event broadcast testing.</p>

            <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div class="flex space-x-4 mb-4">
                <input id="rtChannel" value="public:messages" class="bg-gray-950 border border-gray-800 text-sm text-white px-3 py-2 rounded flex-1" />
                <button onclick="testSubscribe()" class="bg-indigo-600 text-white text-sm px-4 py-2 rounded">Subscribe Channel</button>
              </div>
              <div id="rtLogs" class="bg-gray-950 border border-gray-800 rounded p-4 h-64 overflow-y-auto font-mono text-xs text-emerald-400">
                [System] Ready to subscribe...
              </div>
            </div>
          </div>
        \`;
      } else if (activeTab === 'functions') {
        const fnRes = await fetch(\`\${API_BASE}/projects/\${currentProject}/functions\`, { headers: { 'x-vcore-api-key': 'vcore_anon_default_key' } });
        const fnData = await fnRes.json();
        const funcs = fnData.functions || [];

        content.innerHTML = \`
          <div>
            <h2 class="text-2xl font-bold text-white mb-2">Serverless Edge Functions</h2>
            <p class="text-gray-400 mb-6">Sandboxed serverless backend functions and invocation logs.</p>

            <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div class="space-y-3">
                \${funcs.map(f => \`
                  <div class="bg-gray-950 border border-gray-800 p-4 rounded-lg flex items-center justify-between">
                    <div>
                      <h4 class="font-bold text-white">⚡ \${f.name} (\${f.slug})</h4>
                      <p class="text-xs text-gray-500">Runtime: \${f.runtime} | Timeout: \${f.timeout_ms}ms</p>
                    </div>
                    <span class="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded">Active</span>
                  </div>
                \`).join('')}
              </div>
            </div>
          </div>
        \`;
      } else if (activeTab === 'webhooks') {
        const whRes = await fetch(\`\${API_BASE}/projects/\${currentProject}/webhooks/endpoints\`, { headers: { 'x-vcore-api-key': 'vcore_anon_default_key' } });
        const whData = await whRes.json();
        const endpoints = whData.endpoints || [];

        content.innerHTML = \`
          <div>
            <h2 class="text-2xl font-bold text-white mb-2">Webhooks Management Engine</h2>
            <p class="text-gray-400 mb-6">Configure webhook listener URLs and inspect event deliveries.</p>

            <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
              <div class="flex justify-between items-center">
                <h3 class="font-semibold text-white">Webhook Endpoints</h3>
                <button onclick="createWebhookModal()" class="bg-indigo-600 text-xs text-white px-3 py-1.5 rounded">+ Add Webhook Endpoint</button>
              </div>
              <div class="space-y-2">
                \${endpoints.map(e => \`
                  <div class="p-3 bg-gray-950 border border-gray-800 rounded flex items-center justify-between">
                    <div>
                      <p class="font-mono text-xs text-indigo-400">\${e.url}</p>
                      <p class="text-xs text-gray-500">Events: \${(e.events || []).join(', ')}</p>
                    </div>
                    <span class="px-2 py-0.5 rounded text-xs \${e.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-400'}">\${e.enabled ? 'Active' : 'Disabled'}</span>
                  </div>
                \`).join('')}
              </div>
            </div>
          </div>
        \`;
      } else if (activeTab === 'logs') {
        const lRes = await fetch(\`\${API_BASE}/projects/\${currentProject}/logs\`, { headers: { 'x-vcore-api-key': 'vcore_anon_default_key' } });
        const lData = await lRes.json();
        const logs = lData.logs || [];

        content.innerHTML = \`
          <div>
            <h2 class="text-2xl font-bold text-white mb-2">Central System Logs</h2>
            <p class="text-gray-400 mb-6">Structured execution logs across API, Auth, Database, Storage, and Functions.</p>

            <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div class="space-y-2 font-mono text-xs">
                \${logs.map(l => \`
                  <div class="p-2 bg-gray-950 rounded border border-gray-800 flex items-center space-x-4">
                    <span class="text-gray-500">\${new Date(l.created_at).toLocaleTimeString()}</span>
                    <span class="uppercase text-indigo-400 font-bold">[\${l.service}]</span>
                    <span class="text-gray-200">\${l.message}</span>
                  </div>
                \`).join('')}
              </div>
            </div>
          </div>
        \`;
      } else if (activeTab === 'settings') {
        content.innerHTML = \`
          <div>
            <h2 class="text-2xl font-bold text-white mb-2">Project Settings & Backups</h2>
            <p class="text-gray-400 mb-6">Database snapshots, environmental controls, and project administration.</p>

            <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
              <h3 class="font-semibold text-white mb-3">Database Backups</h3>
              <button onclick="triggerBackup()" class="bg-indigo-600 text-white text-xs px-4 py-2 rounded">Create Manual Backup</button>
            </div>
          </div>
        \`;
      }
    }

    async function runSqlQuery() {
      const sql = document.getElementById('sqlInput')?.value;
      const output = document.getElementById('sqlOutput');
      if (!sql || !output) return;

      try {
        const res = await fetch(\`\${API_BASE}/projects/\${currentProject}/query\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-vcore-api-key': 'vcore_anon_default_key',
          },
          body: JSON.stringify({ query: sql }),
        });
        const json = await res.json();
        output.innerHTML = \`<pre class="bg-gray-950 p-4 rounded-lg border border-gray-800 text-xs text-emerald-400 overflow-x-auto">\${JSON.stringify(json, null, 2)}</pre>\`;
      } catch (err) {
        output.innerHTML = \`<pre class="bg-gray-950 p-4 rounded-lg border border-gray-800 text-xs text-rose-400">\${err.message}</pre>\`;
      }
    }

    async function runExplainQuery() {
      const sql = document.getElementById('sqlInput')?.value;
      if (!sql) return;
      document.getElementById('sqlInput').value = 'EXPLAIN ' + sql;
      runSqlQuery();
    }

    function testSubscribe() {
      const channel = document.getElementById('rtChannel')?.value || 'public:messages';
      const logs = document.getElementById('rtLogs');
      if (!logs) return;

      if (wsConnection) wsConnection.close();
      const wsUrl = \`ws://\${window.location.host}/realtime/v1\`;
      wsConnection = new WebSocket(wsUrl);

      wsConnection.onopen = () => {
        logs.innerHTML += \`<div>[Connected] Subscribing to \${channel}...</div>\`;
        wsConnection.send(JSON.stringify({ event: 'subscribe', channel }));
      };

      wsConnection.onmessage = (e) => {
        logs.innerHTML += \`<div>[Received] \${e.data}</div>\`;
      };
    }

    async function createWebhookModal() {
      const url = prompt('Enter target Webhook URL (e.g. https://api.myapp.com/webhook):');
      if (!url) return;
      await fetch(\`\${API_BASE}/projects/\${currentProject}/webhooks/endpoints\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vcore-api-key': 'vcore_anon_default_key',
        },
        body: JSON.stringify({ url, events: ['*'] }),
      });
      loadTabContent();
    }

    async function createBucketModal() {
      const name = prompt('Enter new storage bucket name (e.g. avatars):');
      if (!name) return;
      await fetch(\`\${API_BASE}/projects/\${currentProject}/storage/buckets\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vcore-api-key': 'vcore_anon_default_key',
        },
        body: JSON.stringify({ name, is_public: true }),
      });
      loadTabContent();
    }

    async function createNewTable() {
      const name = prompt('Enter table name (e.g. posts):');
      if (!name) return;
      await fetch(\`\${API_BASE}/projects/\${currentProject}/schema/tables\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vcore-api-key': 'vcore_anon_default_key',
        },
        body: JSON.stringify({ name, columns: [{ name: 'title', type: 'TEXT' }] }),
      });
      loadTabContent();
    }

    async function triggerBackup() {
      await fetch(\`\${API_BASE}/projects/\${currentProject}/backups\`, {
        method: 'POST',
        headers: {
          'x-vcore-api-key': 'vcore_anon_default_key',
        },
      });
      alert('Backup triggered successfully!');
    }

    window.onload = renderApp;
  </script>
</body>
</html>`;

dashboardRouter.get('/', (req: Request, res: Response) => {
  res.send(HTML_DASHBOARD);
});

import { Router, Request, Response } from 'express';

export const dashboardRouter = Router();

const HTML_DASHBOARD = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VCoreDB — Enterprise BaaS & Developer Platform</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: { 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca' },
            dark: { 950: '#0b0f17', 900: '#111827', 800: '#1f2937' }
          }
        }
      }
    }
  </script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0b0f17; color: #f3f4f6; }
    code, pre { font-family: 'Fira Code', monospace; }
  </style>
</head>
<body class="min-h-screen flex flex-col bg-dark-950 text-gray-100">
  <div id="app" class="flex-1 flex flex-col"></div>

  <!-- Command Palette Modal -->
  <div id="cmdPaletteModal" class="hidden fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-start justify-center pt-24">
    <div class="bg-gray-900 border border-gray-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
      <div class="p-4 border-b border-gray-800 flex items-center space-x-3">
        <span class="text-gray-400">🔍</span>
        <input id="cmdInput" placeholder="Type a command or search workspace (Cmd+K)..." onkeyup="handleCmdSearch(this.value)" class="w-full bg-transparent text-white text-sm focus:outline-none" />
        <span class="text-xs bg-gray-800 text-gray-400 px-2.5 py-1 rounded-md">ESC</span>
      </div>
      <div id="cmdResults" class="p-2 space-y-1 text-sm max-h-80 overflow-y-auto">
        <div onclick="navigateRoute('/pricing')" class="p-3 hover:bg-gray-800 rounded-xl cursor-pointer flex items-center justify-between text-gray-300"><span>💳 Pricing & $1 Expansion Packs</span><span class="text-xs text-indigo-400">Page</span></div>
        <div onclick="triggerAdd25GB()" class="p-3 hover:bg-gray-800 rounded-xl cursor-pointer flex items-center justify-between text-gray-300"><span>🚀 Add 25 GB Capacity Pack ($1)</span><span class="text-xs text-indigo-400">Action</span></div>
        <div onclick="openGitHubImporter()" class="p-3 hover:bg-gray-800 rounded-xl cursor-pointer flex items-center justify-between text-gray-300"><span>🐙 Import GitHub Repository</span><span class="text-xs text-indigo-400">Action</span></div>
        <div onclick="navigateRoute('/admin')" class="p-3 hover:bg-gray-800 rounded-xl cursor-pointer flex items-center justify-between text-gray-300"><span>🛡️ Platform Admin Dashboard</span><span class="text-xs text-amber-400">Admin</span></div>
        <div onclick="openFeedbackModal()" class="p-3 hover:bg-gray-800 rounded-xl cursor-pointer flex items-center justify-between text-gray-300"><span>💬 Submit Developer Feedback</span><span class="text-xs text-emerald-400">Support</span></div>
      </div>
    </div>
  </div>

  <!-- Feedback Modal -->
  <div id="feedbackModal" class="hidden fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
    <div class="bg-gray-900 border border-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
      <div class="flex justify-between items-center">
        <h3 class="text-lg font-bold text-white">Send Developer Feedback</h3>
        <button onclick="closeFeedbackModal()" class="text-gray-400 hover:text-white">✕</button>
      </div>
      <div>
        <label class="text-xs text-gray-400 block mb-1">Category</label>
        <select id="fbCategory" class="w-full bg-gray-950 border border-gray-800 text-sm p-2.5 rounded-lg text-white">
          <option>Feature Request</option>
          <option>Bug Report</option>
          <option>UX Improvement</option>
          <option>Documentation</option>
        </select>
      </div>
      <div>
        <label class="text-xs text-gray-400 block mb-1">Title</label>
        <input id="fbTitle" placeholder="Short summary" class="w-full bg-gray-950 border border-gray-800 text-sm p-2.5 rounded-lg text-white" />
      </div>
      <div>
        <label class="text-xs text-gray-400 block mb-1">Description</label>
        <textarea id="fbDesc" rows="3" placeholder="Provide details..." class="w-full bg-gray-950 border border-gray-800 text-sm p-2.5 rounded-lg text-white"></textarea>
      </div>
      <button onclick="submitFeedback()" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-lg">Submit Feedback</button>
    </div>
  </div>

  <script>
    const API_BASE = '/api/v1';
    let currentProject = 'proj_default';
    let currentPath = window.location.pathname || '/';
    let currentUser = null;
    let wsConnection = null;

    function navigateRoute(path) {
      window.history.pushState({}, '', path);
      currentPath = path;
      renderApp();
    }

    window.onpopstate = () => {
      currentPath = window.location.pathname;
      renderApp();
    };

    function renderNavbar() {
      return \`
        <header class="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-40">
          <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div class="flex items-center space-x-8">
              <a href="/" onclick="event.preventDefault(); navigateRoute('/');" class="flex items-center space-x-3">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-indigo-600/30">V</div>
                <span class="font-extrabold text-white text-lg tracking-tight">VCoreDB</span>
              </a>
              <nav class="hidden md:flex items-center space-x-6 text-sm font-medium text-gray-400">
                <a href="/features" onclick="event.preventDefault(); navigateRoute('/features');" class="hover:text-white transition">Features</a>
                <a href="/database" onclick="event.preventDefault(); navigateRoute('/database');" class="hover:text-white transition">Database</a>
                <a href="/pricing" onclick="event.preventDefault(); navigateRoute('/pricing');" class="hover:text-white transition">Pricing</a>
                <a href="/docs" onclick="event.preventDefault(); navigateRoute('/docs');" class="hover:text-white transition">Docs</a>
              </nav>
            </div>
            <div class="flex items-center space-x-4">
              <button onclick="toggleCmdPalette()" class="hidden sm:flex items-center space-x-2 bg-gray-900 border border-gray-800 text-xs text-gray-400 px-3 py-1.5 rounded-lg hover:border-gray-700">
                <span>Search...</span>
                <span class="bg-gray-800 px-1.5 py-0.5 rounded text-[10px]">⌘K</span>
              </button>
              <a href="/dashboard" onclick="event.preventDefault(); navigateRoute('/dashboard');" class="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-md transition">Console Dashboard</a>
              <a href="/admin" onclick="event.preventDefault(); navigateRoute('/admin');" class="bg-gray-900 border border-gray-800 hover:border-amber-500/50 text-amber-400 font-semibold text-xs px-3.5 py-2 rounded-lg transition">Admin</a>
            </div>
          </div>
        </header>
      \`;
    }

    function renderApp() {
      const app = document.getElementById('app');

      if (currentPath.startsWith('/admin')) {
        renderAdminDashboard(app);
        return;
      }

      if (currentPath.startsWith('/onboarding')) {
        renderOnboarding(app);
        return;
      }

      if (currentPath.startsWith('/dashboard') || currentPath.startsWith('/project/')) {
        renderProjectWorkspace(app);
        return;
      }

      if (currentPath === '/pricing') {
        renderPricingPage(app);
        return;
      }

      renderPublicLanding(app);
    }

    function renderPublicLanding(container) {
      container.innerHTML = \`
        \${renderNavbar()}
        <main class="flex-1">
          <!-- Hero Section -->
          <section class="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center space-y-8">
            <div class="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <span>⚡ Enterprise BaaS Platform</span>
              <span>•</span>
              <span class="text-emerald-400">25 GB Free Tier</span>
            </div>
            <h1 class="text-5xl md:text-7xl font-extrabold text-white tracking-tight max-w-4xl mx-auto leading-tight">
              Your Complete Backend, Built for Developers.
            </h1>
            <p class="text-xl text-gray-400 max-w-2xl mx-auto font-normal">
              PostgreSQL Database, Authentication, Storage, Realtime WebSockets, Edge Functions, Webhooks, CLI, and SDK — immediately provisioned in seconds.
            </p>
            <div class="flex flex-wrap justify-center items-center gap-4">
              <button onclick="navigateRoute('/onboarding')" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-7 py-3.5 rounded-xl shadow-xl shadow-indigo-600/30">Start Building Free</button>
              <button onclick="navigateRoute('/pricing')" class="bg-gray-900 border border-gray-800 hover:border-gray-700 text-white font-semibold text-sm px-6 py-3.5 rounded-xl">View Pricing ($1/pack)</button>
              <button onclick="openGitHubImporter()" class="bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 font-semibold text-sm px-6 py-3.5 rounded-xl flex items-center space-x-2"><span>🐙</span><span>Import GitHub Repo</span></button>
            </div>
          </section>

          <!-- Interactive Code & Product Parity Section -->
          <section class="max-w-6xl mx-auto px-6 py-12">
            <div class="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
              <div class="bg-gray-950 px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <span class="w-3 h-3 rounded-full bg-rose-500/80"></span>
                  <span class="w-3 h-3 rounded-full bg-amber-500/80"></span>
                  <span class="w-3 h-3 rounded-full bg-emerald-500/80"></span>
                  <span class="text-xs text-gray-400 font-mono ml-4">app.ts — @vcoredb/client SDK</span>
                </div>
                <span class="text-xs text-indigo-400 font-mono">TypeScript Ready</span>
              </div>
              <pre class="p-6 font-mono text-sm text-indigo-300 overflow-x-auto leading-relaxed">
import { createClient } from "@vcoredb/client";

// Initialize VCoreDB BaaS Client
const vcore = createClient("https://project.vcoredb.com", "PUBLIC_KEY");

// 1. Authenticate User
const { user, session } = await vcore.auth.signUp("dev@vcoredb.com", "Password123!");

// 2. Query PostgreSQL Database with RLS Enforcement
const { data: posts } = await vcore
  .from("posts")
  .select("id, title, created_at")
  .eq("published", true)
  .execute();

// 3. Realtime Channel Subscriptions
vcore.realtime.subscribe("public:messages", (payload) => {
  console.log("New message received:", payload);
});
              </pre>
            </div>
          </section>
        </main>
      \`;
    }

    function renderOnboarding(container) {
      container.innerHTML = \`
        \${renderNavbar()}
        <main class="max-w-2xl mx-auto px-6 py-16 space-y-8">
          <div class="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-6 shadow-2xl">
            <div class="flex items-center space-x-3">
              <span class="px-3 py-1 bg-indigo-500/20 text-indigo-400 font-semibold text-xs rounded-full">Step 1 of 4</span>
              <h2 class="text-2xl font-bold text-white">Welcome to VCoreDB</h2>
            </div>
            <p class="text-gray-400 text-sm">Let's setup your developer workspace and first project.</p>
            <div>
              <label class="text-xs text-gray-400 block mb-2 font-medium">What are you building?</label>
              <div class="grid grid-cols-2 gap-3">
                <button onclick="this.classList.toggle('border-indigo-500')" class="p-3 bg-gray-950 border border-gray-800 rounded-xl text-left text-sm text-gray-300 hover:border-gray-700">🚀 SaaS Platform</button>
                <button onclick="this.classList.toggle('border-indigo-500')" class="p-3 bg-gray-950 border border-gray-800 rounded-xl text-left text-sm text-gray-300 hover:border-gray-700">📱 Mobile App</button>
                <button onclick="this.classList.toggle('border-indigo-500')" class="p-3 bg-gray-950 border border-gray-800 rounded-xl text-left text-sm text-gray-300 hover:border-gray-700">🤖 AI Application</button>
                <button onclick="this.classList.toggle('border-indigo-500')" class="p-3 bg-gray-950 border border-gray-800 rounded-xl text-left text-sm text-gray-300 hover:border-gray-700">⚡ API & Backend</button>
              </div>
            </div>
            <div class="pt-4 border-t border-gray-800 flex justify-end space-x-3">
              <button onclick="navigateRoute('/dashboard')" class="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-6 py-2.5 rounded-lg">Create Workspace Project</button>
            </div>
          </div>
        </main>
      \`;
    }

    function renderPricingPage(container) {
      container.innerHTML = \`
        \${renderNavbar()}
        <main class="max-w-7xl mx-auto px-6 py-16 space-y-12">
          <div class="text-center space-y-4">
            <h1 class="text-4xl font-extrabold text-white">Transparent, Generous Pricing</h1>
            <p class="text-gray-400 text-lg max-w-2xl mx-auto">Full BaaS capabilities included free + $1 one-time capacity expansion packs.</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div class="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-6">
              <span class="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full">Default Plan</span>
              <h3 class="text-3xl font-bold text-white">VCoreDB Free Tier</h3>
              <div class="text-5xl font-extrabold text-white">$0 <span class="text-sm font-normal text-gray-500">/ forever</span></div>
              <ul class="space-y-3 text-sm text-gray-300">
                <li class="flex items-center space-x-2"><span class="text-emerald-400">✓</span><span><strong>25 GB</strong> Database Storage</span></li>
                <li class="flex items-center space-x-2"><span class="text-emerald-400">✓</span><span><strong>25 GB</strong> Object Storage</span></li>
                <li class="flex items-center space-x-2"><span class="text-emerald-400">✓</span><span><strong>25 GB</strong> Bandwidth / Egress</span></li>
                <li class="flex items-center space-x-2"><span class="text-emerald-400">✓</span><span><strong>UNLIMITED</strong> Projects & GitHub Imports</span></li>
              </ul>
              <button onclick="navigateRoute('/dashboard')" class="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl">Go to Dashboard</button>
            </div>

            <div class="bg-gradient-to-br from-indigo-950/50 via-gray-900 to-gray-900 border border-indigo-500/40 rounded-2xl p-8 space-y-6 shadow-2xl">
              <span class="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-semibold rounded-full">Capacity Pack</span>
              <h3 class="text-3xl font-bold text-white">+25 GB Expansion Pack</h3>
              <div class="text-5xl font-extrabold text-white">$1 <span class="text-sm font-normal text-gray-500">/ one-time</span></div>
              <ul class="space-y-3 text-sm text-gray-300">
                <li class="flex items-center space-x-2"><span class="text-indigo-400">⚡</span><span><strong>+25 GB</strong> Database Storage</span></li>
                <li class="flex items-center space-x-2"><span class="text-indigo-400">⚡</span><span><strong>+25 GB</strong> File Storage</span></li>
                <li class="flex items-center space-x-2"><span class="text-indigo-400">⚡</span><span><strong>+25 GB</strong> Bandwidth</span></li>
                <li class="flex items-center space-x-2"><span class="text-indigo-400">⚡</span><span>Permanent expansion, no monthly fee</span></li>
              </ul>
              <button onclick="triggerAdd25GB()" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-600/30">Buy +25 GB Pack for $1 USD</button>
            </div>
          </div>
        </main>
      \`;
    }

    async function triggerAdd25GB() {
      try {
        const res = await fetch(\`\${API_BASE}/projects/\${currentProject}/billing/checkout\`, {
          method: 'POST',
          headers: { 'x-vcore-api-key': 'vcore_anon_default_key' },
        });
        const data = await res.json();
        if (data.checkout_url) {
          window.location.href = data.checkout_url;
        }
      } catch (err) {
        alert('Checkout error: ' + err.message);
      }
    }

    function toggleCmdPalette() {
      document.getElementById('cmdPaletteModal')?.classList.toggle('hidden');
    }

    function openFeedbackModal() {
      document.getElementById('feedbackModal')?.classList.remove('hidden');
    }

    function closeFeedbackModal() {
      document.getElementById('feedbackModal')?.classList.add('hidden');
    }

    async function submitFeedback() {
      const category = document.getElementById('fbCategory')?.value;
      const title = document.getElementById('fbTitle')?.value;
      const description = document.getElementById('fbDesc')?.value;

      await fetch(\`\${API_BASE}/projects/\${currentProject}/feedback\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vcore-api-key': 'vcore_anon_default_key',
        },
        body: JSON.stringify({ category, title, description }),
      });

      alert('Feedback submitted successfully!');
      closeFeedbackModal();
    }

    async function openGitHubImporter() {
      const name = prompt('Enter GitHub repository name to import (e.g. saas-app):');
      if (!name) return;

      const res = await fetch(\`\${API_BASE}/projects/\${currentProject}/github/import\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vcore-api-key': 'vcore_anon_default_key',
        },
        body: JSON.stringify({ owner: 'developer-octocat', name, branch: 'main' }),
      });
      const data = await res.json();
      alert('GitHub Repo imported & analyzed successfully! Language: ' + data.analysis?.language + ' | Files: ' + data.analysis?.total_files);
    }

    function renderProjectWorkspace(container) {
      container.innerHTML = \`
        <div class="flex h-screen overflow-hidden bg-dark-950">
          <aside class="w-64 bg-gray-900 border-r border-gray-800 flex flex-col justify-between">
            <div>
              <div class="p-5 border-b border-gray-800 flex items-center justify-between">
                <a href="/" onclick="event.preventDefault(); navigateRoute('/');" class="flex items-center space-x-3">
                  <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white">V</div>
                  <span class="font-bold text-white text-base tracking-wide">VCoreDB</span>
                </a>
                <span class="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-semibold">25 GB Free</span>
              </div>
              <div class="p-4 border-b border-gray-800 bg-gray-950/40 space-y-2">
                <label class="text-[10px] text-gray-500 uppercase tracking-wider block font-bold">Project</label>
                <select id="projectSelect" class="w-full bg-gray-800 text-white text-xs rounded-lg border border-gray-700 p-2">
                  <option value="proj_default">Default Project (proj_default)</option>
                </select>
              </div>
              <nav class="p-3 space-y-1 text-xs font-semibold">
                <button onclick="loadTab('overview')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800">📊 Overview & Health</button>
                <button onclick="loadTab('database')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800">🗄️ Database & SQL</button>
                <button onclick="loadTab('github')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800">🐙 GitHub & Code Analysis</button>
                <button onclick="loadTab('usage')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800">📈 Global Usage & Quotas</button>
                <button onclick="loadTab('pricing')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800">💳 Pricing ($1/pack)</button>
              </nav>
            </div>
          </aside>
          <main class="flex-1 overflow-y-auto p-8" id="workspaceContent"></main>
        </div>
      \`;

      loadTab('overview');
    }

    async function loadTab(tab) {
      const workspace = document.getElementById('workspaceContent');
      if (!workspace) return;

      if (tab === 'overview') {
        workspace.innerHTML = \`
          <div class="space-y-6">
            <h2 class="text-2xl font-bold text-white">Project Operational Status</h2>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div class="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                <p class="text-xs text-gray-500 uppercase">Database Storage</p>
                <p class="text-2xl font-bold text-white">125.8 MB / 25 GB</p>
              </div>
              <div class="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                <p class="text-xs text-gray-500 uppercase">File Storage</p>
                <p class="text-2xl font-bold text-white">0 MB / 25 GB</p>
              </div>
              <div class="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                <p class="text-xs text-gray-500 uppercase">Bandwidth</p>
                <p class="text-2xl font-bold text-white">2.85 GB / 25 GB</p>
              </div>
              <div class="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                <p class="text-xs text-gray-500 uppercase">API Requests</p>
                <p class="text-2xl font-bold text-white">1,420</p>
              </div>
            </div>
          </div>
        \`;
      } else if (tab === 'github') {
        const res = await fetch(\`\${API_BASE}/projects/\${currentProject}/github/repo\`, { headers: { 'x-vcore-api-key': 'vcore_anon_default_key' } });
        const data = await res.json();

        workspace.innerHTML = \`
          <div class="space-y-6">
            <div class="flex justify-between items-center">
              <h2 class="text-2xl font-bold text-white">GitHub Integration & Analysis</h2>
              <button onclick="openGitHubImporter()" class="bg-indigo-600 text-white text-xs px-4 py-2 rounded-lg font-semibold">+ Import Repository</button>
            </div>
            \${data.connected ? \`
              <div class="bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-4">
                <h3 class="font-bold text-white text-lg">🐙 Linked Repo: \${data.repo.owner}/\${data.repo.name}</h3>
                <div class="grid grid-cols-3 gap-4 font-mono text-sm text-indigo-300">
                  <div>Framework: \${data.analysis.framework}</div>
                  <div>Language: \${data.analysis.language}</div>
                  <div>Total Files: \${data.analysis.total_files}</div>
                </div>
              </div>
            \` : \`
              <div class="bg-gray-900 border border-gray-800 p-8 rounded-xl text-center space-y-4">
                <p class="text-gray-400">No GitHub repository currently linked to this VCoreDB project.</p>
                <button onclick="openGitHubImporter()" class="bg-indigo-600 text-white text-sm px-5 py-2.5 rounded-xl font-semibold">Connect GitHub Repo</button>
              </div>
            \`}
          </div>
        \`;
      }
    }

    async function renderAdminDashboard(container) {
      const res = await fetch(\`\${API_BASE}/admin/overview\`, { headers: { 'Authorization': 'Bearer vcore_admin_secret_token' } });
      const data = await res.json();
      const m = data.metrics || {};

      container.innerHTML = \`
        \${renderNavbar()}
        <main class="max-w-7xl mx-auto px-6 py-12 space-y-8">
          <div class="flex justify-between items-center">
            <div>
              <h1 class="text-3xl font-extrabold text-white">Platform Administrator Control Center</h1>
              <p class="text-gray-400 text-sm">Real-time SaaS system metrics, user accounts, security audit logs, and payments.</p>
            </div>
            <span class="px-3 py-1 bg-amber-500/20 text-amber-400 font-semibold text-xs rounded-full">Platform Admin Scope</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="bg-gray-900 border border-gray-800 p-5 rounded-2xl">
              <p class="text-xs text-gray-500 uppercase font-semibold">Total Platform Users</p>
              <p class="text-3xl font-extrabold text-white mt-1">\${m.total_users || 0}</p>
            </div>
            <div class="bg-gray-900 border border-gray-800 p-5 rounded-2xl">
              <p class="text-xs text-gray-500 uppercase font-semibold">Active Projects</p>
              <p class="text-3xl font-extrabold text-white mt-1">\${m.total_projects || 0}</p>
            </div>
            <div class="bg-gray-900 border border-gray-800 p-5 rounded-2xl">
              <p class="text-xs text-gray-500 uppercase font-semibold">GitHub Repos Connected</p>
              <p class="text-3xl font-extrabold text-white mt-1">\${m.github_projects || 0}</p>
            </div>
            <div class="bg-gray-900 border border-gray-800 p-5 rounded-2xl">
              <p class="text-xs text-gray-500 uppercase font-semibold">Platform Revenue</p>
              <p class="text-3xl font-extrabold text-emerald-400 mt-1">$\${(m.total_revenue_usd || 0).toFixed(2)} USD</p>
            </div>
          </div>
        </main>
      \`;
    }

    window.onload = renderApp;
  </script>
</body>
</html>`;

dashboardRouter.use((req: Request, res: Response) => {
  res.send(HTML_DASHBOARD);
});

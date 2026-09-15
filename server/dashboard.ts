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

  <script>
    const API_BASE = '/api/v1';
    let currentPath = window.location.pathname || '/';
    let authToken = localStorage.getItem('vcore_auth_token') || null;
    let authUser = JSON.parse(localStorage.getItem('vcore_auth_user') || 'null');
    let adminToken = localStorage.getItem('vcore_admin_token') || null;
    let userProjects = [];
    let currentProjectRef = localStorage.getItem('vcore_current_project') || null;
    let activeWorkspaceTab = 'overview';

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
      const isLoggedIn = !!authToken && !!authUser;
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
                <a href="/pricing" onclick="event.preventDefault(); navigateRoute('/pricing');" class="hover:text-white transition">Pricing</a>
                <a href="/docs" onclick="event.preventDefault(); navigateRoute('/docs');" class="hover:text-white transition">Docs</a>
              </nav>
            </div>
            <div class="flex items-center space-x-4">
              \${isLoggedIn ? \`
                <a href="/dashboard" onclick="event.preventDefault(); navigateRoute('/dashboard');" class="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-md transition">Go to Dashboard</a>
                <button onclick="logoutUser()" class="bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 font-semibold text-xs px-3.5 py-2 rounded-lg transition">Sign Out</button>
              \` : \`
                <a href="/login" onclick="event.preventDefault(); navigateRoute('/login');" class="text-sm font-semibold text-gray-300 hover:text-white transition">Sign In</a>
                <a href="/signup" onclick="event.preventDefault(); navigateRoute('/signup');" class="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-md transition">Start Building Free</a>
              \`}
            </div>
          </div>
        </header>
      \`;
    }

    async function checkAuthSession() {
      if (!authToken) return false;
      try {
        const res = await fetch(\`\${API_BASE}/auth/me\`, {
          headers: { 'Authorization': \`Bearer \${authToken}\` }
        });
        if (res.ok) {
          const data = await res.json();
          authUser = data.user;
          localStorage.setItem('vcore_auth_user', JSON.stringify(authUser));
          return true;
        } else {
          logoutUser(false);
          return false;
        }
      } catch {
        return false;
      }
    }

    function logoutUser(redirect = true) {
      authToken = null;
      authUser = null;
      userProjects = [];
      localStorage.removeItem('vcore_auth_token');
      localStorage.removeItem('vcore_auth_user');
      localStorage.removeItem('vcore_current_project');
      if (redirect) navigateRoute('/login');
    }

    function logoutAdmin() {
      adminToken = null;
      localStorage.removeItem('vcore_admin_token');
      navigateRoute('/admin/login');
    }

    async function renderApp() {
      const app = document.getElementById('app');

      // Admin route protection & rendering
      if (currentPath.startsWith('/admin')) {
        if (currentPath === '/admin/login') {
          renderAdminLogin(app);
          return;
        }
        if (!adminToken) {
          navigateRoute('/admin/login');
          return;
        }
        renderAdminDashboard(app);
        return;
      }

      // Public routes
      if (['/', '/features', '/pricing', '/docs', '/login', '/signup'].includes(currentPath)) {
        if (currentPath === '/login') { renderLoginPage(app); return; }
        if (currentPath === '/signup') { renderSignupPage(app); return; }
        if (currentPath === '/features') { renderFeaturesPage(app); return; }
        if (currentPath === '/pricing') { renderPricingPage(app); return; }
        if (currentPath === '/docs') { renderDocsPage(app); return; }
        renderPublicLanding(app);
        return;
      }

      // Protected user routes (/dashboard, /onboarding, /project/*)
      const isAuthenticated = await checkAuthSession();
      if (!isAuthenticated) {
        navigateRoute('/login');
        return;
      }

      await fetchUserProjects();

      if (userProjects.length === 0 || currentPath === '/onboarding') {
        renderOnboarding(app);
        return;
      }

      if (currentPath === '/dashboard' || currentPath.startsWith('/project/')) {
        renderProjectWorkspace(app);
        return;
      }

      renderPublicLanding(app);
    }

    async function fetchUserProjects() {
      try {
        const res = await fetch(\`\${API_BASE}/projects\`, {
          headers: { 'Authorization': \`Bearer \${authToken}\` }
        });
        const data = await res.json();
        userProjects = data.projects || [];
        if (userProjects.length > 0 && !currentProjectRef) {
          currentProjectRef = userProjects[0].ref;
          localStorage.setItem('vcore_current_project', currentProjectRef);
        }
      } catch {
        userProjects = [];
      }
    }

    function renderPublicLanding(container) {
      container.innerHTML = \`
        \${renderNavbar()}
        <main class="flex-1">
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
              <button onclick="navigateRoute('/signup')" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-7 py-3.5 rounded-xl shadow-xl shadow-indigo-600/30">Start Building Free</button>
              <button onclick="navigateRoute('/pricing')" class="bg-gray-900 border border-gray-800 hover:border-gray-700 text-white font-semibold text-sm px-6 py-3.5 rounded-xl">View Pricing ($1/pack)</button>
              <button onclick="handleGitHubImportAuthCheck()" class="bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 font-semibold text-sm px-6 py-3.5 rounded-xl flex items-center space-x-2"><span>🐙</span><span>Import GitHub Repo</span></button>
            </div>
          </section>

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

const vcore = createClient("https://project.vcoredb.com", "PUBLIC_KEY");

const { user, session } = await vcore.auth.signUp("dev@vcoredb.com", "Password123!");

const { data: posts } = await vcore
  .from("posts")
  .select("id, title, created_at")
  .eq("published", true)
  .execute();
              </pre>
            </div>
          </section>
        </main>
      \`;
    }

    function handleGitHubImportAuthCheck() {
      if (!authToken) {
        alert('Authentication required first. Please sign up or log in to import a GitHub repository.');
        navigateRoute('/login');
      } else {
        navigateRoute('/dashboard');
      }
    }

    function renderLoginPage(container) {
      container.innerHTML = \`
        \${renderNavbar()}
        <main class="max-w-md mx-auto px-6 py-16 w-full">
          <div class="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-6 shadow-2xl">
            <div class="text-center space-y-2">
              <h2 class="text-2xl font-bold text-white">Welcome Back</h2>
              <p class="text-xs text-gray-400">Sign in to your VCoreDB account</p>
            </div>
            <div id="loginError" class="hidden p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg"></div>
            <form onsubmit="handleLoginSubmit(event)" class="space-y-4">
              <div>
                <label class="text-xs text-gray-400 block mb-1">Email address</label>
                <input id="loginEmail" type="email" required placeholder="dev@example.com" class="w-full bg-gray-950 border border-gray-800 text-sm p-3 rounded-xl text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label class="text-xs text-gray-400 block mb-1">Password</label>
                <input id="loginPassword" type="password" required placeholder="••••••••" class="w-full bg-gray-950 border border-gray-800 text-sm p-3 rounded-xl text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-3 rounded-xl transition shadow-lg shadow-indigo-600/20">Sign In</button>
            </form>
            <div class="text-center text-xs text-gray-500 pt-2 border-t border-gray-800">
              Don't have an account? <a href="/signup" onclick="event.preventDefault(); navigateRoute('/signup');" class="text-indigo-400 font-semibold hover:underline">Sign up free</a>
            </div>
          </div>
        </main>
      \`;
    }

    async function handleLoginSubmit(e) {
      e.preventDefault();
      const errBox = document.getElementById('loginError');
      errBox.classList.add('hidden');
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;

      try {
        const res = await fetch(\`\${API_BASE}/auth/login\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (res.ok) {
          authToken = data.session.access_token;
          authUser = data.user;
          localStorage.setItem('vcore_auth_token', authToken);
          localStorage.setItem('vcore_auth_user', JSON.stringify(authUser));
          await fetchUserProjects();
          if (userProjects.length === 0) navigateRoute('/onboarding');
          else navigateRoute('/dashboard');
        } else {
          errBox.textContent = data.error?.message || 'Invalid email or password';
          errBox.classList.remove('hidden');
        }
      } catch (err) {
        errBox.textContent = 'Network error: ' + err.message;
        errBox.classList.remove('hidden');
      }
    }

    function renderSignupPage(container) {
      container.innerHTML = \`
        \${renderNavbar()}
        <main class="max-w-md mx-auto px-6 py-16 w-full">
          <div class="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-6 shadow-2xl">
            <div class="text-center space-y-2">
              <h2 class="text-2xl font-bold text-white">Create Your Account</h2>
              <p class="text-xs text-gray-400">Get 25 GB free database & storage instantly</p>
            </div>
            <div id="signupError" class="hidden p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg"></div>
            <form onsubmit="handleSignupSubmit(event)" class="space-y-4">
              <div>
                <label class="text-xs text-gray-400 block mb-1">Email address</label>
                <input id="signupEmail" type="email" required placeholder="dev@example.com" class="w-full bg-gray-950 border border-gray-800 text-sm p-3 rounded-xl text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label class="text-xs text-gray-400 block mb-1">Password</label>
                <input id="signupPassword" type="password" required minlength="6" placeholder="••••••••" class="w-full bg-gray-950 border border-gray-800 text-sm p-3 rounded-xl text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-3 rounded-xl transition shadow-lg shadow-indigo-600/20">Create Free Account</button>
            </form>
            <div class="text-center text-xs text-gray-500 pt-2 border-t border-gray-800">
              Already have an account? <a href="/login" onclick="event.preventDefault(); navigateRoute('/login');" class="text-indigo-400 font-semibold hover:underline">Sign in</a>
            </div>
          </div>
        </main>
      \`;
    }

    async function handleSignupSubmit(e) {
      e.preventDefault();
      const errBox = document.getElementById('signupError');
      errBox.classList.add('hidden');
      const email = document.getElementById('signupEmail').value;
      const password = document.getElementById('signupPassword').value;

      try {
        const res = await fetch(\`\${API_BASE}/auth/signup\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (res.ok) {
          authToken = data.session.access_token;
          authUser = data.user;
          localStorage.setItem('vcore_auth_token', authToken);
          localStorage.setItem('vcore_auth_user', JSON.stringify(authUser));
          await fetchUserProjects();
          navigateRoute('/onboarding');
        } else {
          errBox.textContent = data.error?.message || 'Signup failed';
          errBox.classList.remove('hidden');
        }
      } catch (err) {
        errBox.textContent = 'Network error: ' + err.message;
        errBox.classList.remove('hidden');
      }
    }

    function renderFeaturesPage(container) {
      container.innerHTML = \`
        \${renderNavbar()}
        <main class="max-w-7xl mx-auto px-6 py-16 space-y-12">
          <div class="text-center space-y-4">
            <h1 class="text-4xl font-extrabold text-white">Platform Features</h1>
            <p class="text-gray-400 text-lg max-w-2xl mx-auto">Everything you need to build, scale, and manage full-stack applications.</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-3">
              <div class="text-2xl">🗄️</div>
              <h3 class="font-bold text-white text-lg">PostgreSQL Database</h3>
              <p class="text-gray-400 text-sm">Full SQL power with auto-generated REST APIs, schema discovery, table management, and RLS policies.</p>
            </div>
            <div class="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-3">
              <div class="text-2xl">🔑</div>
              <h3 class="font-bold text-white text-lg">Authentication</h3>
              <p class="text-gray-400 text-sm">User signup, login, password hashing, session tokens, JWTs, user management, and authorization.</p>
            </div>
            <div class="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-3">
              <div class="text-2xl">📁</div>
              <h3 class="font-bold text-white text-lg">Object Storage</h3>
              <p class="text-gray-400 text-sm">Create buckets, upload assets, handle file streaming, public/private permissions, and metrics.</p>
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
            <p class="text-gray-400 text-lg max-w-2xl mx-auto font-normal">Full BaaS capabilities included free + $1 one-time capacity expansion packs.</p>
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
              <button onclick="navigateRoute(authToken ? '/dashboard' : '/signup')" class="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl">Get Started Free</button>
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

    function renderDocsPage(container) {
      container.innerHTML = \`
        \${renderNavbar()}
        <main class="max-w-4xl mx-auto px-6 py-16 space-y-8">
          <h1 class="text-3xl font-bold text-white">Developer Documentation</h1>
          <p class="text-gray-400">Learn how to integrate VCoreDB SDK & REST API with your application.</p>
          <div class="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4 font-mono text-sm text-indigo-300">
            <h3 class="text-white font-sans font-bold">Quickstart with @vcoredb/client</h3>
            <pre class="bg-gray-950 p-4 rounded-xl overflow-x-auto">
npm install @vcoredb/client

import { createClient } from "@vcoredb/client";
const vcore = createClient("http://localhost:8080/api/v1/projects/proj_default", "API_KEY");
            </pre>
          </div>
        </main>
      \`;
    }

    function renderOnboarding(container) {
      container.innerHTML = \`
        \${renderNavbar()}
        <main class="max-w-2xl mx-auto px-6 py-16 space-y-8">
          <div class="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-6 shadow-2xl">
            <div class="flex items-center space-x-3">
              <span class="px-3 py-1 bg-indigo-500/20 text-indigo-400 font-semibold text-xs rounded-full">First-Time Setup</span>
              <h2 class="text-2xl font-bold text-white">Welcome to VCoreDB</h2>
            </div>
            <p class="text-gray-400 text-sm">Create your first backend.</p>
            <div class="space-y-4">
              <div>
                <label class="text-xs text-gray-400 block mb-1">Project Name</label>
                <input id="newProjName" type="text" placeholder="My SaaS Project" value="My Project" class="w-full bg-gray-950 border border-gray-800 text-sm p-3 rounded-xl text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div class="flex items-center space-x-4">
                <button onclick="createFirstProject()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-6 py-3 rounded-xl">Create New Project</button>
                <button onclick="handleGitHubImportAuthCheck()" class="bg-gray-950 border border-gray-800 text-gray-300 font-semibold text-sm px-6 py-3 rounded-xl">Import from GitHub</button>
              </div>
            </div>
          </div>
        </main>
      \`;
    }

    async function createFirstProject() {
      const name = document.getElementById('newProjName')?.value || 'My Project';
      try {
        const res = await fetch(\`\${API_BASE}/projects\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${authToken}\`,
          },
          body: JSON.stringify({ name, region: 'us-east-1' }),
        });
        const data = await res.json();
        if (res.ok) {
          currentProjectRef = data.project.ref;
          localStorage.setItem('vcore_current_project', currentProjectRef);
          await fetchUserProjects();
          navigateRoute('/dashboard');
        } else {
          alert('Project creation failed: ' + (data.error?.message || 'Error'));
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }

    function renderProjectWorkspace(container) {
      if (!currentProjectRef && userProjects.length > 0) {
        currentProjectRef = userProjects[0].ref;
      }

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
                <div class="flex justify-between items-center">
                  <label class="text-[10px] text-gray-500 uppercase tracking-wider block font-bold">Project</label>
                  <button onclick="createFirstProjectPrompt()" class="text-[10px] text-indigo-400 font-bold hover:underline">+ New Project</button>
                </div>
                <select id="projectSelect" onchange="switchProject(this.value)" class="w-full bg-gray-800 text-white text-xs rounded-lg border border-gray-700 p-2">
                  \${userProjects.map(p => \`<option value="\${p.ref}" \${p.ref === currentProjectRef ? 'selected' : ''}>\${p.name} (\${p.ref})</option>\`).join('')}
                </select>
              </div>
              <nav class="p-3 space-y-1 text-xs font-semibold">
                <button onclick="loadTab('overview')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800">📊 Overview & Health</button>
                <button onclick="loadTab('database')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800">🗄️ Database Console</button>
                <button onclick="loadTab('sqleditor')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800">⚡ SQL Editor</button>
                <button onclick="loadTab('auth')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800">🔑 Authentication</button>
                <button onclick="loadTab('storage')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800">📁 Object Storage</button>
                <button onclick="loadTab('realtime')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800">📡 Realtime</button>
                <button onclick="loadTab('functions')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800">⚙️ Functions</button>
                <button onclick="loadTab('github')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800">🐙 GitHub & Intelligence</button>
                <button onclick="loadTab('usage')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800">📈 Global Usage</button>
                <button onclick="loadTab('settings')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800">⚙️ Settings</button>
              </nav>
            </div>
            <div class="p-4 border-t border-gray-800">
              <button onclick="logoutUser()" class="w-full text-left text-xs text-rose-400 hover:underline">Sign Out</button>
            </div>
          </aside>
          <main class="flex-1 overflow-y-auto p-8" id="workspaceContent"></main>
        </div>
      \`;

      loadTab(activeWorkspaceTab);
    }

    async function createFirstProjectPrompt() {
      const name = prompt('Enter new project name:');
      if (!name) return;
      try {
        const res = await fetch(\`\${API_BASE}/projects\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${authToken}\`,
          },
          body: JSON.stringify({ name, region: 'us-east-1' }),
        });
        const data = await res.json();
        if (res.ok) {
          currentProjectRef = data.project.ref;
          localStorage.setItem('vcore_current_project', currentProjectRef);
          await fetchUserProjects();
          renderApp();
        }
      } catch (err) {
        alert(err.message);
      }
    }

    function switchProject(ref) {
      currentProjectRef = ref;
      localStorage.setItem('vcore_current_project', ref);
      loadTab(activeWorkspaceTab);
    }

    async function loadTab(tab) {
      activeWorkspaceTab = tab;
      const workspace = document.getElementById('workspaceContent');
      if (!workspace) return;
      const apiKey = 'vcore_anon_default_key';

      if (tab === 'overview') {
        const res = await fetch(\`\${API_BASE}/projects/\${currentProjectRef}/quota\`, { headers: { 'x-vcore-api-key': apiKey } });
        const data = await res.json();
        const q = data.quotas || {};

        workspace.innerHTML = \`
          <div class="space-y-6">
            <h2 class="text-2xl font-bold text-white">Project Operational Status (\${currentProjectRef})</h2>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div class="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                <p class="text-xs text-gray-500 uppercase font-semibold">Database Storage</p>
                <p class="text-2xl font-bold text-white mt-1">\${(q.database_storage?.used_bytes / (1024*1024)).toFixed(1) || 0} MB / 25 GB</p>
              </div>
              <div class="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                <p class="text-xs text-gray-500 uppercase font-semibold">File Storage</p>
                <p class="text-2xl font-bold text-white mt-1">\${(q.file_storage?.used_bytes / (1024*1024)).toFixed(1) || 0} MB / 25 GB</p>
              </div>
              <div class="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                <p class="text-xs text-gray-500 uppercase font-semibold">Bandwidth</p>
                <p class="text-2xl font-bold text-white mt-1">\${(q.bandwidth?.used_bytes / (1024*1024*1024)).toFixed(2) || 0} GB / 25 GB</p>
              </div>
              <div class="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                <p class="text-xs text-gray-500 uppercase font-semibold">API Requests</p>
                <p class="text-2xl font-bold text-white mt-1">\${q.api_requests?.used || 0}</p>
              </div>
            </div>
          </div>
        \`;
      } else if (tab === 'database') {
        const tablesRes = await fetch(\`\${API_BASE}/projects/\${currentProjectRef}/schema/tables\`, { headers: { 'x-vcore-api-key': apiKey } });
        const tablesData = await tablesRes.json();
        const tables = tablesData.tables || [];

        workspace.innerHTML = \`
          <div class="space-y-6">
            <div class="flex justify-between items-center">
              <h2 class="text-2xl font-bold text-white">PostgreSQL Database Console</h2>
              <button onclick="createNewTablePrompt()" class="bg-indigo-600 text-white text-xs px-4 py-2 rounded-lg font-semibold">+ Create Table</button>
            </div>
            <div class="bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-4">
              <h3 class="font-bold text-white">Project Database Tables (\${tables.length})</h3>
              <div class="grid grid-cols-3 gap-3">
                \${tables.map(t => \`<div class="p-3 bg-gray-950 border border-gray-800 rounded-lg font-mono text-sm text-indigo-400 flex justify-between"><span>📄 \${t}</span></div>\`).join('')}
              </div>
            </div>
          </div>
        \`;
      } else if (tab === 'sqleditor') {
        workspace.innerHTML = \`
          <div class="space-y-6">
            <h2 class="text-2xl font-bold text-white">Interactive SQL Editor</h2>
            <div class="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-3">
              <textarea id="sqlQueryInput" rows="4" class="w-full bg-gray-950 border border-gray-800 p-3 text-sm font-mono text-indigo-300 rounded-lg focus:outline-none" placeholder="SELECT * FROM auth.users;"></textarea>
              <div class="flex justify-between items-center">
                <button onclick="executeSqlQuery()" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-5 py-2 rounded-lg font-bold">Run Query</button>
                <span id="sqlDuration" class="text-xs font-mono text-gray-500"></span>
              </div>
            </div>
            <div id="sqlResultBox" class="bg-gray-900 border border-gray-800 p-4 rounded-xl hidden font-mono text-xs overflow-x-auto"></div>
          </div>
        \`;
      } else if (tab === 'auth') {
        const res = await fetch(\`\${API_BASE}/projects/\${currentProjectRef}/auth/users\`, { headers: { 'x-vcore-api-key': apiKey } });
        const data = await res.json();
        const users = data.users || [];

        workspace.innerHTML = \`
          <div class="space-y-6">
            <h2 class="text-2xl font-bold text-white">Authentication & User Directory</h2>
            <div class="bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-4">
              <h3 class="font-bold text-white">Project Registered Users (\${users.length})</h3>
              <div class="space-y-2 font-mono text-xs">
                \${users.map(u => \`<div class="p-3 bg-gray-950 border border-gray-800 rounded-lg flex justify-between text-gray-300"><span>👤 \${u.email}</span><span class="text-emerald-400">ID: \${u.id}</span></div>\`).join('')}
              </div>
            </div>
          </div>
        \`;
      } else if (tab === 'storage') {
        workspace.innerHTML = \`
          <div class="space-y-6">
            <h2 class="text-2xl font-bold text-white">Object Storage Buckets</h2>
            <div class="bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-4">
              <p class="text-sm text-gray-400">S3-compatible Object Storage for file uploads and assets.</p>
            </div>
          </div>
        \`;
      } else if (tab === 'realtime') {
        workspace.innerHTML = \`
          <div class="space-y-6">
            <h2 class="text-2xl font-bold text-white">Realtime WebSocket Channels</h2>
            <div class="bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-4">
              <p class="text-sm text-gray-400">Subscribe to live PostgreSQL changes via WebSocket protocol.</p>
            </div>
          </div>
        \`;
      } else if (tab === 'functions') {
        workspace.innerHTML = \`
          <div class="space-y-6">
            <h2 class="text-2xl font-bold text-white">Edge Functions</h2>
            <div class="bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-4">
              <p class="text-sm text-gray-400">Deploy serverless JavaScript/TypeScript functions with auto-logging.</p>
            </div>
          </div>
        \`;
      } else if (tab === 'github') {
        const res = await fetch(\`\${API_BASE}/projects/\${currentProjectRef}/github/repo\`, { headers: { 'x-vcore-api-key': apiKey } });
        const data = await res.json();

        workspace.innerHTML = \`
          <div class="space-y-6">
            <div class="flex justify-between items-center">
              <h2 class="text-2xl font-bold text-white">GitHub Integration & Intelligence</h2>
              <button onclick="openGitHubImporter()" class="bg-indigo-600 text-white text-xs px-4 py-2 rounded-lg font-semibold">+ Import Repository</button>
            </div>
            \${data.connected ? \`
              <div class="bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-4">
                <div class="flex justify-between items-center">
                  <h3 class="font-bold text-white text-lg">🐙 Linked Repo: \${data.repo.owner}/\${data.repo.name}</h3>
                  <span class="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-full">Health Score: \${data.analysis.project_health_score || 90}/100</span>
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
      } else if (tab === 'usage') {
        workspace.innerHTML = \`
          <div class="space-y-6">
            <h2 class="text-2xl font-bold text-white">Global Usage & Metering</h2>
            <div class="grid grid-cols-3 gap-4">
              <div class="bg-gray-900 border border-gray-800 p-5 rounded-xl space-y-2">
                <div class="text-sm font-bold text-white">Database Usage</div>
                <div class="text-2xl font-bold text-indigo-400">12.5 MB / 25 GB</div>
              </div>
              <div class="bg-gray-900 border border-gray-800 p-5 rounded-xl space-y-2">
                <div class="text-sm font-bold text-white">Storage Usage</div>
                <div class="text-2xl font-bold text-indigo-400">0 MB / 25 GB</div>
              </div>
              <div class="bg-gray-900 border border-gray-800 p-5 rounded-xl space-y-2">
                <div class="text-sm font-bold text-white">Bandwidth</div>
                <div class="text-2xl font-bold text-emerald-400">2.85 GB / 25 GB</div>
              </div>
            </div>
          </div>
        \`;
      } else if (tab === 'settings') {
        workspace.innerHTML = \`
          <div class="space-y-6">
            <h2 class="text-2xl font-bold text-white">Project Settings</h2>
            <div class="bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-4">
              <div>
                <label class="text-xs text-gray-400 block mb-1">Project Identifier (Ref)</label>
                <input readonly value="\${currentProjectRef}" class="bg-gray-950 text-gray-400 p-2 text-sm rounded border border-gray-800 w-full" />
              </div>
            </div>
          </div>
        \`;
      }
    }

    async function createNewTablePrompt() {
      const name = prompt('Enter table name to create:');
      if (!name) return;
      try {
        const res = await fetch(\`\${API_BASE}/projects/\${currentProjectRef}/schema/tables\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-vcore-api-key': 'vcore_anon_default_key',
          },
          body: JSON.stringify({ name, columns: [{ name: 'title', type: 'TEXT' }] }),
        });
        if (res.ok) {
          alert('Table ' + name + ' created successfully!');
          loadTab('database');
        }
      } catch (err) {
        alert(err.message);
      }
    }

    async function executeSqlQuery() {
      const query = document.getElementById('sqlQueryInput')?.value;
      if (!query) return;
      try {
        const res = await fetch(\`\${API_BASE}/projects/\${currentProjectRef}/query\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-vcore-api-key': 'vcore_anon_default_key',
          },
          body: JSON.stringify({ query }),
        });
        const data = await res.json();
        const box = document.getElementById('sqlResultBox');
        const dur = document.getElementById('sqlDuration');
        box.classList.remove('hidden');
        if (res.ok) {
          dur.textContent = 'Executed in ' + data.execution_time_ms + 'ms';
          box.innerHTML = '<pre class="text-emerald-400">' + JSON.stringify(data.data, null, 2) + '</pre>';
        } else {
          dur.textContent = '';
          box.innerHTML = '<pre class="text-rose-400">Error: ' + data.error?.message + '</pre>';
        }
      } catch (err) {
        alert(err.message);
      }
    }

    function renderAdminAdmin(container) {
      renderAdminDashboard(container);
    }

    function renderAdminLogin(container) {
      container.innerHTML = \`
        \${renderNavbar()}
        <main class="max-w-md mx-auto px-6 py-16 w-full">
          <div class="bg-gray-900 border border-amber-500/30 rounded-2xl p-8 space-y-6 shadow-2xl">
            <div class="text-center space-y-2">
              <div class="inline-block px-3 py-1 bg-amber-500/10 text-amber-400 text-xs font-semibold rounded-full mb-2">Platform Admin Access</div>
              <h2 class="text-2xl font-bold text-white">Admin Control Center</h2>
              <p class="text-xs text-gray-400">Enter master administrator secret key</p>
            </div>
            <div id="adminError" class="hidden p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg"></div>
            <form onsubmit="handleAdminLoginSubmit(event)" class="space-y-4">
              <div>
                <label class="text-xs text-gray-400 block mb-1">Admin Username</label>
                <input id="adminUsername" type="text" value="admin" class="w-full bg-gray-950 border border-gray-800 text-sm p-3 rounded-xl text-white focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <label class="text-xs text-gray-400 block mb-1">Admin Key / Secret</label>
                <input id="adminKeyInput" type="password" required placeholder="vcore_admin_secret_key" class="w-full bg-gray-950 border border-gray-800 text-sm p-3 rounded-xl text-white focus:outline-none focus:border-amber-500" />
              </div>
              <button type="submit" class="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm py-3 rounded-xl transition shadow-lg shadow-amber-600/20">Sign In as Admin</button>
            </form>
          </div>
        </main>
      \`;
    }

    async function handleAdminLoginSubmit(e) {
      e.preventDefault();
      const errBox = document.getElementById('adminError');
      errBox.classList.add('hidden');
      const username = document.getElementById('adminUsername').value;
      const adminKey = document.getElementById('adminKeyInput').value;

      try {
        const res = await fetch(\`\${API_BASE}/admin/login\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, adminKey }),
        });
        const data = await res.json();
        if (res.ok) {
          adminToken = data.admin_token;
          localStorage.setItem('vcore_admin_token', adminToken);
          navigateRoute('/admin');
        } else {
          errBox.textContent = data.error?.message || 'Invalid administrator key';
          errBox.classList.remove('hidden');
        }
      } catch (err) {
        errBox.textContent = 'Error: ' + err.message;
        errBox.classList.remove('hidden');
      }
    }

    async function renderAdminDashboard(container) {
      try {
        const res = await fetch(\`\${API_BASE}/admin/overview\`, { headers: { 'x-vcore-admin-key': adminToken || 'vcore_admin_secret_key' } });
        const data = await res.json();
        const m = data.metrics || {};

        container.innerHTML = \`
          <header class="border-b border-gray-800 bg-gray-950 px-6 py-4 flex justify-between items-center">
            <div class="flex items-center space-x-3">
              <span class="w-3 h-3 rounded-full bg-amber-400"></span>
              <span class="font-bold text-white text-lg">Platform Administrator Control Center</span>
            </div>
            <button onclick="logoutAdmin()" class="bg-gray-800 text-rose-400 hover:bg-gray-700 text-xs px-3 py-1.5 rounded-lg font-semibold">Exit Admin</button>
          </header>
          <main class="max-w-7xl mx-auto px-6 py-12 space-y-8">
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
      } catch (err) {
        container.innerHTML = '<div class="p-8 text-rose-400">Admin dashboard error: ' + err.message + '</div>';
      }
    }

    async function triggerAdd25GB() {
      if (!currentProjectRef) return alert('Select or create a project first.');
      try {
        const res = await fetch(\`\${API_BASE}/projects/\${currentProjectRef}/billing/checkout\`, {
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

    async function openGitHubImporter() {
      if (!currentProjectRef) return alert('Select or create a project first.');
      const name = prompt('Enter GitHub repository name to import (e.g. saas-app):');
      if (!name) return;

      const res = await fetch(\`\${API_BASE}/projects/\${currentProjectRef}/github/import\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vcore-api-key': 'vcore_anon_default_key',
        },
        body: JSON.stringify({ owner: 'developer-octocat', name, branch: 'main' }),
      });
      const data = await res.json();
      alert('GitHub Repo imported & analyzed successfully! Language: ' + data.analysis?.language + ' | Health Score: ' + data.analysis?.project_health_score);
    }

    window.onload = renderApp;
  </script>
</body>
</html>`;

dashboardRouter.use((req: Request, res: Response) => {
  res.send(HTML_DASHBOARD);
});

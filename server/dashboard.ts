import { Router, Request, Response } from 'express';

export const dashboardRouter = Router();

const HTML_DASHBOARD = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VCoreDB — Your Intelligent Backend, Built Around Your Code</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: { 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca' },
            dark: { 950: '#070a11', 900: '#0f172a', 800: '#1e293b', 700: '#334155' }
          }
        }
      }
    }
  </script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #070a11; color: #f8fafc; }
    code, pre { font-family: 'Fira Code', monospace; }
    .glow-effect { box-shadow: 0 0 35px -5px rgba(99, 102, 241, 0.25); }
    .canvas-container { position: relative; width: 100%; height: 380px; }
    @media (prefers-reduced-motion: reduce) {
      .canvas-animated { animation: none !important; }
    }
  </style>
</head>
<body class="min-h-screen flex flex-col bg-dark-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
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
    let analyzerResult = null;
    let selectedWorkflowStep = 1;

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
        <header class="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50">
          <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div class="flex items-center space-x-8">
              <a href="/" onclick="event.preventDefault(); navigateRoute('/');" class="flex items-center space-x-3">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center font-extrabold text-white text-xl shadow-lg shadow-indigo-600/30">V</div>
                <span class="font-extrabold text-white text-lg tracking-tight">VCoreDB</span>
              </a>
              <nav class="hidden lg:flex items-center space-x-6 text-xs font-semibold text-slate-400">
                <a href="/features" onclick="event.preventDefault(); navigateRoute('/features');" class="hover:text-white transition">Product</a>
                <a href="/solutions" onclick="event.preventDefault(); navigateRoute('/solutions');" class="hover:text-white transition">Solutions</a>
                <a href="/pricing" onclick="event.preventDefault(); navigateRoute('/pricing');" class="hover:text-white transition">Pricing</a>
                <a href="/docs" onclick="event.preventDefault(); navigateRoute('/docs');" class="hover:text-white transition">Docs</a>
                <a href="/about" onclick="event.preventDefault(); navigateRoute('/about');" class="hover:text-white transition">Company</a>
              </nav>
            </div>
            <div class="flex items-center space-x-4">
              \${isLoggedIn ? \`
                <a href="/dashboard" onclick="event.preventDefault(); navigateRoute('/dashboard');" class="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-md transition">Console Dashboard</a>
                <button onclick="logoutUser()" class="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold text-xs px-3.5 py-2 rounded-lg transition">Sign Out</button>
              \` : \`
                <a href="/login" onclick="event.preventDefault(); navigateRoute('/login');" class="text-xs font-semibold text-slate-300 hover:text-white transition">Sign In</a>
                <a href="/signup" onclick="event.preventDefault(); navigateRoute('/signup');" class="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-md transition">Start Building Free</a>
              \`}
            </div>
          </div>
        </header>
      \`;
    }

    function renderFooter() {
      return \`
        <footer class="border-t border-slate-800/80 bg-slate-950 py-12 text-xs text-slate-400">
          <div class="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-5 gap-8">
            <div class="col-span-2 space-y-3">
              <div class="flex items-center space-x-2">
                <div class="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">V</div>
                <span class="font-bold text-white text-base">VCoreDB</span>
              </div>
              <p class="text-slate-400 max-w-sm leading-relaxed">Your Intelligent Backend, Built Around Your Code. Connect GitHub repositories to instantly analyze requirements and provision production infrastructure.</p>
              <div class="text-[11px] text-slate-500">© 2025 VCoreDB Inc. All rights reserved.</div>
            </div>
            <div>
              <div class="font-bold text-white mb-3">Product</div>
              <ul class="space-y-2">
                <li><a href="/features" onclick="event.preventDefault(); navigateRoute('/features');" class="hover:text-white">PostgreSQL Database</a></li>
                <li><a href="/features" onclick="event.preventDefault(); navigateRoute('/features');" class="hover:text-white">Authentication</a></li>
                <li><a href="/features" onclick="event.preventDefault(); navigateRoute('/features');" class="hover:text-white">Object Storage</a></li>
                <li><a href="/features" onclick="event.preventDefault(); navigateRoute('/features');" class="hover:text-white">Realtime WebSockets</a></li>
                <li><a href="/features" onclick="event.preventDefault(); navigateRoute('/features');" class="hover:text-white">GitHub Intelligence</a></li>
                <li><a href="/features" onclick="event.preventDefault(); navigateRoute('/features');" class="hover:text-white">Migrations Engine</a></li>
              </ul>
            </div>
            <div>
              <div class="font-bold text-white mb-3">Developers</div>
              <ul class="space-y-2">
                <li><a href="/docs" onclick="event.preventDefault(); navigateRoute('/docs');" class="hover:text-white">Documentation</a></li>
                <li><a href="/docs" onclick="event.preventDefault(); navigateRoute('/docs');" class="hover:text-white">API Reference</a></li>
                <li><a href="/docs" onclick="event.preventDefault(); navigateRoute('/docs');" class="hover:text-white">TypeScript SDK</a></li>
                <li><a href="/docs" onclick="event.preventDefault(); navigateRoute('/docs');" class="hover:text-white">CLI Tooling</a></li>
                <li><a href="https://github.com" target="_blank" class="hover:text-white">GitHub Org</a></li>
              </ul>
            </div>
            <div>
              <div class="font-bold text-white mb-3">Legal & Company</div>
              <ul class="space-y-2">
                <li><a href="/terms" onclick="event.preventDefault(); navigateRoute('/terms');" class="hover:text-white">Terms of Service</a></li>
                <li><a href="/privacy" onclick="event.preventDefault(); navigateRoute('/privacy');" class="hover:text-white">Privacy Policy</a></li>
                <li><a href="/security" onclick="event.preventDefault(); navigateRoute('/security');" class="hover:text-white">Security Center</a></li>
                <li><a href="/acceptable-use" onclick="event.preventDefault(); navigateRoute('/acceptable-use');" class="hover:text-white">Acceptable Use</a></li>
                <li><a href="/about" onclick="event.preventDefault(); navigateRoute('/about');" class="hover:text-white">About Us</a></li>
                <li><a href="/contact" onclick="event.preventDefault(); navigateRoute('/contact');" class="hover:text-white">Contact & Support</a></li>
              </ul>
            </div>
          </div>
        </footer>
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

      // Public static & legal pages
      const publicRoutes = ['/', '/features', '/solutions', '/pricing', '/docs', '/login', '/signup', '/terms', '/privacy', '/security', '/acceptable-use', '/about', '/contact', '/status'];
      if (publicRoutes.includes(currentPath)) {
        if (currentPath === '/login') { renderLoginPage(app); return; }
        if (currentPath === '/signup') { renderSignupPage(app); return; }
        if (currentPath === '/features') { renderFeaturesPage(app); return; }
        if (currentPath === '/solutions') { renderSolutionsPage(app); return; }
        if (currentPath === '/pricing') { renderPricingPage(app); return; }
        if (currentPath === '/docs') { renderDocsPage(app); return; }
        if (currentPath === '/terms') { renderLegalPage(app, 'Terms of Service', 'Terms and conditions governing the use of VCoreDB platform services.'); return; }
        if (currentPath === '/privacy') { renderLegalPage(app, 'Privacy Policy', 'How VCoreDB protects, processes, and respects user and application data.'); return; }
        if (currentPath === '/security') { renderLegalPage(app, 'Security Policy', 'Platform security controls, encryption, isolation, and compliance standards.'); return; }
        if (currentPath === '/acceptable-use') { renderLegalPage(app, 'Acceptable Use Policy', 'Guidelines for fair and compliant use of VCoreDB developer resources.'); return; }
        if (currentPath === '/about') { renderLegalPage(app, 'About VCoreDB', 'Building backend infrastructure that understands application code directly from source control.'); return; }
        if (currentPath === '/contact') { renderContactPage(app); return; }
        if (currentPath === '/status') { renderStatusPage(app); return; }
        renderPublicLanding(app);
        initHeroCanvas();
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
      initHeroCanvas();
    }

    // Interactive 3D Developer Infrastructure Canvas Visual
    function initHeroCanvas() {
      setTimeout(() => {
        const canvas = document.getElementById('hero3dCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let width = (canvas.width = canvas.parentElement.clientWidth);
        let height = (canvas.height = canvas.parentElement.clientHeight || 380);

        const nodes = [
          { name: 'VCoreDB Core', x: width / 2, y: height / 2, color: '#6366f1', radius: 32, isCenter: true },
          { name: 'PostgreSQL', angle: 0, dist: 130, color: '#38bdf8' },
          { name: 'Auth IAM', angle: 0.7, dist: 130, color: '#10b981' },
          { name: 'Storage', angle: 1.4, dist: 130, color: '#f59e0b' },
          { name: 'Realtime', angle: 2.1, dist: 130, color: '#ec4899' },
          { name: 'Functions', angle: 2.8, dist: 130, color: '#8b5cf6' },
          { name: 'GitHub Repo', angle: 3.5, dist: 130, color: '#f43f5e' },
          { name: 'API Gateway', angle: 4.2, dist: 130, color: '#06b6d4' },
          { name: 'Migrations', angle: 4.9, dist: 130, color: '#a855f7' },
          { name: 'Security', angle: 5.6, dist: 130, color: '#14b8a6' },
        ];

        let mouseX = width / 2;
        let mouseY = height / 2;
        let rotation = 0;

        canvas.addEventListener('mousemove', (e) => {
          const rect = canvas.getBoundingClientRect();
          mouseX = e.clientX - rect.left;
          mouseY = e.clientY - rect.top;
        });

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function animate() {
          ctx.clearRect(0, 0, width, height);

          if (!prefersReducedMotion) {
            rotation += 0.003;
          }

          const centerX = width / 2 + (mouseX - width / 2) * 0.05;
          const centerY = height / 2 + (mouseY - height / 2) * 0.05;
          nodes[0].x = centerX;
          nodes[0].y = centerY;

          for (let i = 1; i < nodes.length; i++) {
            const n = nodes[i];
            const a = n.angle + rotation;
            n.x = centerX + Math.cos(a) * n.dist;
            n.y = centerY + Math.sin(a) * (n.dist * 0.55); // Isometric perspective tilt

            // Draw connecting animated line
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(n.x, n.y);
            ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw node circle
            const distMouse = Math.hypot(mouseX - n.x, mouseY - n.y);
            const isHovered = distMouse < 25;

            ctx.beginPath();
            ctx.arc(n.x, n.y, isHovered ? 18 : 12, 0, Math.PI * 2);
            ctx.fillStyle = n.color;
            ctx.shadowColor = n.color;
            ctx.shadowBlur = isHovered ? 20 : 8;
            ctx.fill();
            ctx.shadowBlur = 0;

            // Label
            ctx.fillStyle = isHovered ? '#ffffff' : '#94a3b8';
            ctx.font = '10px Plus Jakarta Sans, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(n.name, n.x, n.y + (isHovered ? 30 : 22));
          }

          // Draw Center Core
          const centerMouse = Math.hypot(mouseX - centerX, mouseY - centerY);
          ctx.beginPath();
          ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
          ctx.fillStyle = '#4f46e5';
          ctx.shadowColor = '#6366f1';
          ctx.shadowBlur = centerMouse < 40 ? 35 : 20;
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px Plus Jakarta Sans, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('VCoreDB', centerX, centerY + 4);

          requestAnimationFrame(animate);
        }

        animate();
      }, 50);
    }

    function renderPublicLanding(container) {
      container.innerHTML = \`
        \${renderNavbar()}
        <main class="flex-1">
          <!-- HERO SECTION -->
          <section class="max-w-7xl mx-auto px-6 pt-16 pb-12 text-center space-y-8">
            <div class="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Your Intelligent Backend, Built Around Your Code</span>
            </div>

            <h1 class="text-4xl md:text-6xl font-extrabold text-white tracking-tight max-w-4xl mx-auto leading-tight">
              Connect a GitHub repository. VCoreDB builds your backend.
            </h1>

            <p class="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto font-normal leading-relaxed">
              Connect a GitHub repository or start from scratch. VCoreDB analyzes your application, understands its backend requirements, and gives you the database, authentication, storage, realtime infrastructure, APIs and developer tools needed to build and operate it.
            </p>

            <div class="flex flex-wrap justify-center items-center gap-4 pt-2">
              <button onclick="navigateRoute('/signup')" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-7 py-3.5 rounded-xl shadow-xl shadow-indigo-600/30 transition transform hover:-translate-y-0.5">Start Building Free</button>
              <button onclick="scrollToAnalyzer()" class="bg-slate-900 border border-indigo-500/40 hover:border-indigo-500 text-indigo-300 font-semibold text-sm px-6 py-3.5 rounded-xl transition flex items-center space-x-2"><span>🔍</span><span>Analyze a GitHub Repository</span></button>
              <button onclick="scrollToFeatures()" class="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold text-sm px-6 py-3.5 rounded-xl transition">Explore VCoreDB</button>
            </div>

            <!-- HERO 3D VISUAL -->
            <div class="mt-12 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 glow-effect max-w-5xl mx-auto overflow-hidden">
              <div class="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div class="flex items-center space-x-2 text-xs text-slate-400 font-mono">
                  <span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span class="ml-2 font-bold text-slate-300">Application ➔ GitHub ➔ VCoreDB Intelligence ➔ Infrastructure</span>
                </div>
                <span class="text-[11px] bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full font-mono font-semibold">Interactive Infrastructure Engine</span>
              </div>
              <div class="canvas-container">
                <canvas id="hero3dCanvas"></canvas>
              </div>
            </div>
          </section>

          <!-- REAL GITHUB REPOSITORY URL ANALYZER -->
          <section id="analyzerSection" class="max-w-5xl mx-auto px-6 py-12">
            <div class="bg-slate-900 border border-indigo-500/30 rounded-3xl p-8 space-y-6 shadow-2xl">
              <div class="text-center space-y-2">
                <span class="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-full uppercase tracking-wider">GitHub Repository Intelligence</span>
                <h2 class="text-2xl md:text-3xl font-extrabold text-white">Paste any public GitHub Repository URL</h2>
                <p class="text-xs text-slate-400 max-w-xl mx-auto">VCoreDB will fetch the codebase tree, detect dependencies, ORMs, auth handlers, and construct an exact Backend Gap Analysis Report.</p>
              </div>

              <div class="flex flex-col md:flex-row gap-3 max-w-2xl mx-auto">
                <input id="landingRepoUrl" type="text" placeholder="https://github.com/username/project" value="https://github.com/octocat/my-express-api" class="flex-1 bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-mono" />
                <button onclick="runLandingAnalyzer()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-3.5 rounded-xl shadow-lg transition flex items-center justify-center space-x-2">
                  <span>⚡</span><span>Analyze Codebase</span>
                </button>
              </div>

              <div id="landingAnalyzerOutput" class="hidden space-y-6 pt-4 border-t border-slate-800/80"></div>
            </div>
          </section>

          <!-- HOW IT WORKS INTERACTIVE STEPPER -->
          <section class="max-w-6xl mx-auto px-6 py-16 space-y-12">
            <div class="text-center space-y-3">
              <h2 class="text-3xl font-extrabold text-white">How VCoreDB Works</h2>
              <p class="text-slate-400 text-sm">Interactive 9-step codebase to operational infrastructure workflow.</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div class="space-y-2 lg:col-span-1">
                \${renderWorkflowSteps()}
              </div>

              <div class="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-4 flex flex-col justify-between">
                <div id="workflowDetailBox">
                  \${renderWorkflowStepDetail(selectedWorkflowStep)}
                </div>
              </div>
            </div>
          </section>

          <!-- WHY VCOREDB? (WITHOUT VS WITH) -->
          <section class="max-w-6xl mx-auto px-6 py-16 space-y-12">
            <div class="text-center space-y-3">
              <h2 class="text-3xl font-extrabold text-white">Why Choose VCoreDB?</h2>
              <p class="text-slate-400 text-sm">Stop manually assembling fragmented developer tools.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div class="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-8 space-y-4">
                <div class="flex items-center space-x-2 text-rose-400 font-bold text-base">
                  <span>❌</span><span>WITHOUT VCOREDB</span>
                </div>
                <ul class="space-y-3 text-xs text-slate-300 leading-relaxed font-mono">
                  <li class="flex items-start space-x-2"><span>•</span><span>Manual database server provisioning & security patching</span></li>
                  <li class="flex items-start space-x-2"><span>•</span><span>Fragmented third-party auth, storage, and WebSocket providers</span></li>
                  <li class="flex items-start space-x-2"><span>•</span><span>Writing custom migration scripts & out-of-sync schema state</span></li>
                  <li class="flex items-start space-x-2"><span>•</span><span>Secret keys scattered across multiple vendor dashboards</span></li>
                  <li class="flex items-start space-x-2"><span>•</span><span>Zero visibility into how code dependencies map to backend infrastructure</span></li>
                </ul>
              </div>

              <div class="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-8 space-y-4">
                <div class="flex items-center space-x-2 text-emerald-400 font-bold text-base">
                  <span>✓</span><span>WITH VCOREDB</span>
                </div>
                <ul class="space-y-3 text-xs text-slate-300 leading-relaxed font-mono">
                  <li class="flex items-start space-x-2"><span>✓</span><span>GitHub repository is analyzed automatically upon connect</span></li>
                  <li class="flex items-start space-x-2"><span>✓</span><span>PostgreSQL, Auth, Storage, APIs & Migrations provisioned in 1 click</span></li>
                  <li class="flex items-start space-x-2"><span>✓</span><span>Code-aware schema diffing and branch migration merging</span></li>
                  <li class="flex items-start space-x-2"><span>✓</span><span>Unified Developer Console, SQL Editor, and Security Center</span></li>
                  <li class="flex items-start space-x-2"><span>✓</span><span>Generous 25 GB free tier with simple $5 expansion packs</span></li>
                </ul>
              </div>
            </div>
          </section>

          <!-- EDUCATIONAL PRODUCT EXPLANATION SECTIONS -->
          <section id="features" class="max-w-6xl mx-auto px-6 py-12 space-y-12">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
                <div class="text-2xl">🗄️</div>
                <h3 class="font-bold text-white text-base">Managed PostgreSQL</h3>
                <p class="text-slate-400 text-xs leading-relaxed">Full relational database engine with automated REST API endpoints, schema discovery, table editor, and SQL query runner.</p>
              </div>
              <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
                <div class="text-2xl">🔑</div>
                <h3 class="font-bold text-white text-base">Authentication & IAM</h3>
                <p class="text-slate-400 text-xs leading-relaxed">Platform user signup, password hashing with bcrypt, JWT token generation, session verification, and row-level access control.</p>
              </div>
              <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
                <div class="text-2xl">📁</div>
                <h3 class="font-bold text-white text-base">Object File Storage</h3>
                <p class="text-slate-400 text-xs leading-relaxed">S3-compatible bucket management, public/private permissions, file uploads, asset streaming, and bandwidth metering.</p>
              </div>
              <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
                <div class="text-2xl">📡</div>
                <h3 class="font-bold text-white text-base">Realtime WebSockets</h3>
                <p class="text-slate-400 text-xs leading-relaxed">Subscribe to live PostgreSQL table updates and broadcast events over persistent WebSocket connections.</p>
              </div>
              <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
                <div class="text-2xl">⚡</div>
                <h3 class="font-bold text-white text-base">Serverless Edge Functions</h3>
                <p class="text-slate-400 text-xs leading-relaxed">Deploy serverless TypeScript/JavaScript routines with execution metrics, environment variables, and webhooks.</p>
              </div>
              <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
                <div class="text-2xl">🔄</div>
                <h3 class="font-bold text-white text-base">Migration Merge Engine</h3>
                <p class="text-slate-400 text-xs leading-relaxed">Detect schema diffs between local migration files and production database state, preview SQL, and resolve branch conflicts.</p>
              </div>
            </div>
          </section>
        </main>
        \${renderFooter()}
      \`;
    }

    function renderWorkflowSteps() {
      const steps = [
        '1. Connect GitHub Repository',
        '2. Codebase Intelligence Scan',
        '3. Requirement Detection',
        '4. Infrastructure Recommendation',
        '5. Developer Review & Approval',
        '6. Backend Provisioning',
        '7. Application Connection',
        '8. Realtime Monitoring',
        '9. Production Deployment'
      ];

      return steps.map((s, idx) => {
        const stepNum = idx + 1;
        const isActive = stepNum === selectedWorkflowStep;
        return \`
          <button onclick="selectWorkflowStep(\${stepNum})" class="w-full text-left p-3.5 rounded-xl border text-xs font-semibold transition flex items-center justify-between \${isActive ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'}\">
            <span>\${s}</span>
            \${isActive ? '<span class="text-indigo-400">➔</span>' : ''}
          </button>
        \`;
      }).join('');
    }

    function renderWorkflowStepDetail(stepNum) {
      const details = {
        1: { title: '1. Connect GitHub Repository', body: 'Paste any public HTTPS repository URL (or authenticate via OAuth for private repositories). VCoreDB securely reads the codebase structure.' },
        2: { title: '2. Codebase Intelligence Scan', body: 'The analysis engine inspects file trees, package.json, requirements.txt, Dockerfiles, and environment variable references.' },
        3: { title: '3. Requirement Detection', body: 'VCoreDB identifies relational schemas, authentication routes, file upload code, and background tasks automatically.' },
        4: { title: '4. Infrastructure Recommendation', body: 'Generates a tailored Backend Gap Report highlighting what your codebase already has and what infrastructure is missing.' },
        5: { title: '5. Developer Review & Approval', body: 'Developer reviews the exact provisioning plan before any database or storage resources are created. Zero secret resource creation.' },
        6: { title: '6. Backend Provisioning', body: 'PostgreSQL schemas, API keys, storage buckets, and auth policies are generated in milliseconds.' },
        7: { title: '7. Application Connection', body: 'Copy generated connection strings or initialize @vcoredb/client in your application.' },
        8: { title: '8. Realtime Monitoring', body: 'VCoreDB meters database storage, bandwidth, API requests, and execution logs in real time.' },
        9: { title: '9. Production Deployment', body: 'Ship your application with confidence backed by automated migrations and security score monitoring.' },
      };

      const d = details[stepNum] || details[1];
      return \`
        <div class="space-y-4">
          <div class="text-xs font-bold text-indigo-400 uppercase tracking-wider">Workflow Step \${stepNum} of 9</div>
          <h3 class="text-2xl font-bold text-white">\${d.title}</h3>
          <p class="text-slate-300 text-sm leading-relaxed">\${d.body}</p>
        </div>
      \`;
    }

    function selectWorkflowStep(stepNum) {
      selectedWorkflowStep = stepNum;
      const box = document.getElementById('workflowDetailBox');
      if (box) box.innerHTML = renderWorkflowStepDetail(stepNum);
    }

    function scrollToAnalyzer() {
      const el = document.getElementById('analyzerSection');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }

    function scrollToFeatures() {
      const el = document.getElementById('features');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }

    async function runLandingAnalyzer() {
      const urlInput = document.getElementById('landingRepoUrl');
      const outputBox = document.getElementById('landingAnalyzerOutput');
      if (!urlInput || !outputBox) return;

      const url = urlInput.value.trim();
      if (!url) return alert('Please enter a GitHub repository URL.');

      outputBox.innerHTML = '<div class="p-4 text-xs font-mono text-indigo-400 animate-pulse">Running VCoreDB Codebase Intelligence Analysis...</div>';
      outputBox.classList.remove('hidden');

      try {
        const res = await fetch(\`\${API_BASE}/projects/proj_default/github/analyze\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-vcore-api-key': 'vcore_anon_default_key' },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (res.ok) {
          analyzerResult = data.analysis;
          renderAnalyzerReport(outputBox, data);
        } else {
          outputBox.innerHTML = \`<div class="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl font-mono">Error: \${data.error?.message || 'Analysis failed'}</div>\`;
        }
      } catch (err) {
        outputBox.innerHTML = \`<div class="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl font-mono">Network error: \${err.message}</div>\`;
      }
    }

    function renderAnalyzerReport(container, data) {
      const a = data.analysis;
      const gap = a.gap_analysis || {};

      container.innerHTML = \`
        <div class="space-y-6 text-left">
          <div class="flex flex-wrap justify-between items-center gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div>
              <span class="text-xs text-slate-400">Target Repository</span>
              <div class="text-sm font-bold text-white font-mono">\${data.owner}/\${data.repo} (\${data.branch})</div>
            </div>
            <div class="flex items-center space-x-3">
              <span class="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20">Health Score: \${a.project_health_score}/100</span>
              <span class="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-bold rounded-full border border-indigo-500/20">\${a.framework}</span>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-3">
              <div class="text-xs font-bold text-emerald-400 uppercase tracking-wider">✓ Detected In Codebase</div>
              <ul class="space-y-2 text-xs text-slate-300 font-mono">
                \${(gap.detected || []).map(d => \`<li class="flex items-center space-x-2"><span class="text-emerald-400">✓</span><span>\${d}</span></li>\`).join('')}
              </ul>
            </div>

            <div class="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-3">
              <div class="text-xs font-bold text-amber-400 uppercase tracking-wider">⚠ Requirement Gaps (Missing)</div>
              <ul class="space-y-2 text-xs text-slate-300 font-mono">
                \${(gap.missing || []).map(m => \`<li class="flex items-center space-x-2"><span class="text-amber-400">⚠</span><span>\${m}</span></li>\`).join('')}
              </ul>
            </div>
          </div>

          <div class="bg-indigo-950/20 border border-indigo-500/30 p-6 rounded-2xl space-y-4">
            <div class="text-sm font-bold text-white">VCoreDB Backend Provisioning Plan</div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div class="p-3 bg-slate-900 border border-slate-800 rounded-lg"><span class="text-indigo-400 font-bold block">DATABASE</span>PostgreSQL</div>
              <div class="p-3 bg-slate-900 border border-slate-800 rounded-lg"><span class="text-emerald-400 font-bold block">AUTH</span>JWT Email/Pass</div>
              <div class="p-3 bg-slate-900 border border-slate-800 rounded-lg"><span class="text-amber-400 font-bold block">STORAGE</span>S3 Buckets</div>
              <div class="p-3 bg-slate-900 border border-slate-800 rounded-lg"><span class="text-violet-400 font-bold block">APIs</span>REST & Realtime</div>
            </div>

            <div class="flex justify-end space-x-3 pt-2">
              <button onclick="proceedCreateBackendFromAnalysis('\${data.owner}', '\${data.repo}')" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-lg transition">Approve & Create VCoreDB Backend</button>
            </div>
          </div>
        </div>
      \`;
    }

    async function proceedCreateBackendFromAnalysis(owner, repo) {
      if (!authToken) {
        alert('Authentication required to create a project backend. Please sign up or log in.');
        navigateRoute('/login');
        return;
      }

      try {
        const projRes = await fetch(\`\${API_BASE}/projects\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${authToken}\`,
          },
          body: JSON.stringify({ name: \`\${repo}-backend\`, region: 'us-east-1' }),
        });
        const projData = await projRes.json();
        if (!projRes.ok) throw new Error(projData.error?.message || 'Failed to create project');

        const newRef = projData.project.ref;

        const res = await fetch(\`\${API_BASE}/projects/\${newRef}/github/import\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${authToken}\`,
            'x-vcore-api-key': 'vcore_anon_default_key',
          },
          body: JSON.stringify({ owner, name: repo, branch: 'main' }),
        });
        const data = await res.json();
        if (res.ok) {
          alert('Backend created and repository linked successfully!');
          currentProjectRef = newRef;
          localStorage.setItem('vcore_current_project', currentProjectRef);
          await fetchUserProjects();
          navigateRoute('/dashboard');
        } else {
          alert('Failed to import repository: ' + (data.error?.message || 'Error'));
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }

    function renderLoginPage(container) {
      container.innerHTML = \`
        \${renderNavbar()}
        <main class="max-w-md mx-auto px-6 py-16 w-full flex-1">
          <div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 shadow-2xl">
            <div class="text-center space-y-2">
              <h2 class="text-2xl font-bold text-white">Welcome Back</h2>
              <p class="text-xs text-slate-400">Sign in to your VCoreDB developer workspace</p>
            </div>
            <div id="loginError" class="hidden p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg"></div>
            <form onsubmit="handleLoginSubmit(event)" class="space-y-4">
              <div>
                <label class="text-xs text-slate-400 block mb-1">Email address</label>
                <input id="loginEmail" type="email" required placeholder="dev@example.com" class="w-full bg-slate-950 border border-slate-800 text-sm p-3 rounded-xl text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label class="text-xs text-slate-400 block mb-1">Password</label>
                <input id="loginPassword" type="password" required placeholder="••••••••" class="w-full bg-slate-950 border border-slate-800 text-sm p-3 rounded-xl text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-3 rounded-xl transition shadow-lg shadow-indigo-600/20">Sign In</button>
            </form>
            <div class="text-center text-xs text-slate-500 pt-2 border-t border-slate-800">
              Don't have an account? <a href="/signup" onclick="event.preventDefault(); navigateRoute('/signup');" class="text-indigo-400 font-semibold hover:underline">Sign up free</a>
            </div>
          </div>
        </main>
        \${renderFooter()}
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
        <main class="max-w-md mx-auto px-6 py-16 w-full flex-1">
          <div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 shadow-2xl">
            <div class="text-center space-y-2">
              <h2 class="text-2xl font-bold text-white">Create Your Free Account</h2>
              <p class="text-xs text-slate-400">Get 25 GB free database & storage instantly</p>
            </div>
            <div id="signupError" class="hidden p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg"></div>
            <form onsubmit="handleSignupSubmit(event)" class="space-y-4">
              <div>
                <label class="text-xs text-slate-400 block mb-1">Email address</label>
                <input id="signupEmail" type="email" required placeholder="dev@example.com" class="w-full bg-slate-950 border border-slate-800 text-sm p-3 rounded-xl text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label class="text-xs text-slate-400 block mb-1">Password</label>
                <input id="signupPassword" type="password" required minlength="6" placeholder="••••••••" class="w-full bg-slate-950 border border-slate-800 text-sm p-3 rounded-xl text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-3 rounded-xl transition shadow-lg shadow-indigo-600/20">Create Free Account</button>
            </form>
            <div class="text-center text-xs text-slate-500 pt-2 border-t border-slate-800">
              Already have an account? <a href="/login" onclick="event.preventDefault(); navigateRoute('/login');" class="text-indigo-400 font-semibold hover:underline">Sign in</a>
            </div>
          </div>
        </main>
        \${renderFooter()}
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
        <main class="max-w-7xl mx-auto px-6 py-16 space-y-12 flex-1">
          <div class="text-center space-y-4">
            <h1 class="text-4xl font-extrabold text-white">Full BaaS Capabilities</h1>
            <p class="text-slate-400 text-base max-w-2xl mx-auto">Engineered to give developers an autonomous backend platform.</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
              <div class="text-2xl">🗄️</div>
              <h3 class="font-bold text-white text-base">PostgreSQL Database</h3>
              <p class="text-slate-400 text-xs leading-relaxed">Managed PostgreSQL engine with auto-generated REST APIs, schema discovery, table editor, and SQL runner.</p>
            </div>
            <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
              <div class="text-2xl">🔑</div>
              <h3 class="font-bold text-white text-base">Authentication & Security</h3>
              <p class="text-slate-400 text-xs leading-relaxed">JWT verification, password hashing, user session management, and row-level policies.</p>
            </div>
            <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
              <div class="text-2xl">📁</div>
              <h3 class="font-bold text-white text-base">Object Storage</h3>
              <p class="text-slate-400 text-xs leading-relaxed">S3-compatible object buckets for user file uploads, permissions, and CDN distribution.</p>
            </div>
          </div>
        </main>
        \${renderFooter()}
      \`;
    }

    function renderSolutionsPage(container) {
      container.innerHTML = \`
        \${renderNavbar()}
        <main class="max-w-7xl mx-auto px-6 py-16 space-y-12 flex-1">
          <div class="text-center space-y-4">
            <h1 class="text-4xl font-extrabold text-white">Solutions for Every Architecture</h1>
            <p class="text-slate-400 text-base max-w-2xl mx-auto">Whether building SaaS, mobile apps, or enterprise APIs, VCoreDB adapts to your code.</p>
          </div>
        </main>
        \${renderFooter()}
      \`;
    }

    function renderPricingPage(container) {
      container.innerHTML = \`
        \${renderNavbar()}
        <main class="max-w-7xl mx-auto px-6 py-16 space-y-12 flex-1">
          <div class="text-center space-y-4">
            <h1 class="text-4xl font-extrabold text-white">Simple, Predictable Pricing</h1>
            <p class="text-slate-400 text-base max-w-2xl mx-auto">Start free with 25 GB quotas. Expand capacity on demand for $5 one-time packs.</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
              <span class="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full">FREE</span>
              <h3 class="text-2xl font-bold text-white">Free Tier</h3>
              <div class="text-4xl font-extrabold text-white">$0 <span class="text-xs font-normal text-slate-500">/ forever</span></div>
              <ul class="space-y-3 text-xs text-slate-300 font-mono">
                <li>✓ 25 GB Database Storage</li>
                <li>✓ 25 GB File Storage</li>
                <li>✓ 25 GB Bandwidth</li>
                <li>✓ GitHub Repository Analyzer</li>
              </ul>
              <button onclick="navigateRoute(authToken ? '/dashboard' : '/signup')" class="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl text-xs">Start Free</button>
            </div>

            <div class="bg-indigo-950/40 border border-indigo-500/40 rounded-2xl p-8 space-y-6 shadow-2xl">
              <span class="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-full">CAPACITY PACK</span>
              <h3 class="text-2xl font-bold text-white">+25 GB Expansion</h3>
              <div class="text-4xl font-extrabold text-white">$5 <span class="text-xs font-normal text-slate-500">/ one-time</span></div>
              <ul class="space-y-3 text-xs text-slate-300 font-mono">
                <li>⚡ +25 GB Database Capacity</li>
                <li>⚡ +25 GB File Storage</li>
                <li>⚡ +25 GB Egress Bandwidth</li>
                <li>⚡ Stackable one-time expansion</li>
              </ul>
              <button onclick="triggerAdd25GB()" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl text-xs shadow-lg">Buy +25 GB Pack for $5</button>
            </div>

            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
              <span class="px-3 py-1 bg-violet-500/10 text-violet-400 text-xs font-bold rounded-full">PRO</span>
              <h3 class="text-2xl font-bold text-white">Pro Developer</h3>
              <div class="text-4xl font-extrabold text-white">$20 <span class="text-xs font-normal text-slate-500">/ month</span></div>
              <ul class="space-y-3 text-xs text-slate-300 font-mono">
                <li>✓ Higher Rate Limits</li>
                <li>✓ Priority DB Compute</li>
                <li>✓ Daily Backups</li>
                <li>✓ Advanced Migration Merges</li>
              </ul>
              <button onclick="navigateRoute('/signup')" class="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl text-xs">Upgrade to Pro</button>
            </div>
          </div>
        </main>
        \${renderFooter()}
      \`;
    }

    function renderDocsPage(container) {
      container.innerHTML = \`
        \${renderNavbar()}
        <main class="max-w-4xl mx-auto px-6 py-16 space-y-8 flex-1">
          <h1 class="text-3xl font-bold text-white">VCoreDB Developer Documentation</h1>
          <p class="text-slate-400 text-sm">Official documentation for @vcoredb/client TypeScript SDK & REST API integration.</p>
          <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 font-mono text-xs text-indigo-300">
            <h3 class="text-white font-sans font-bold text-sm">Client SDK Quickstart</h3>
            <pre class="bg-slate-950 p-4 rounded-xl overflow-x-auto">
npm install @vcoredb/client

import { createClient } from "@vcoredb/client";
const vcore = createClient("http://localhost:8080/api/v1/projects/proj_default", "API_KEY");
const { data } = await vcore.from("users").select("*").execute();
            </pre>
          </div>
        </main>
        \${renderFooter()}
      \`;
    }

    function renderLegalPage(container, title, description) {
      container.innerHTML = \`
        \${renderNavbar()}
        <main class="max-w-4xl mx-auto px-6 py-16 space-y-6 flex-1">
          <h1 class="text-3xl font-bold text-white">\${title}</h1>
          <p class="text-slate-400 text-sm font-mono">\${description}</p>
          <div class="bg-slate-900 border border-slate-800 p-8 rounded-2xl space-y-4 text-xs text-slate-300 leading-relaxed font-mono">
            <p>VCoreDB ("Platform") provides developer infrastructure services including managed database instances, authentication services, object storage, and codebase intelligence analysis.</p>
            <p>By connecting a repository or utilizing platform APIs, you agree to comply with our platform operational standards, data privacy protections, and rate-limiting controls.</p>
          </div>
        </main>
        \${renderFooter()}
      \`;
    }

    function renderContactPage(container) {
      container.innerHTML = \`
        \${renderNavbar()}
        <main class="max-w-2xl mx-auto px-6 py-16 w-full flex-1">
          <div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
            <h2 class="text-2xl font-bold text-white">Contact & Support</h2>
            <form onsubmit="event.preventDefault(); alert('Feedback submitted! Thank you.');" class="space-y-4">
              <div>
                <label class="text-xs text-slate-400 block mb-1">Your Email</label>
                <input type="email" required placeholder="dev@example.com" class="w-full bg-slate-950 border border-slate-800 text-sm p-3 rounded-xl text-white" />
              </div>
              <div>
                <label class="text-xs text-slate-400 block mb-1">Message</label>
                <textarea rows="4" required placeholder="How can we help with your VCoreDB infrastructure?" class="w-full bg-slate-950 border border-slate-800 text-sm p-3 rounded-xl text-white"></textarea>
              </div>
              <button type="submit" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-3 rounded-xl">Submit Feedback</button>
            </form>
          </div>
        </main>
        \${renderFooter()}
      \`;
    }

    function renderStatusPage(container) {
      container.innerHTML = \`
        \${renderNavbar()}
        <main class="max-w-4xl mx-auto px-6 py-16 space-y-6 flex-1">
          <h1 class="text-3xl font-bold text-white">Platform System Status</h1>
          <div class="bg-slate-900 border border-emerald-500/30 p-6 rounded-2xl flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <span class="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
              <span class="font-bold text-white text-sm">All VCoreDB Systems Operational</span>
            </div>
            <span class="text-xs font-mono text-emerald-400">100% Uptime</span>
          </div>
        </main>
        \${renderFooter()}
      \`;
    }

    function renderOnboarding(container) {
      container.innerHTML = \`
        \${renderNavbar()}
        <main class="max-w-2xl mx-auto px-6 py-16 space-y-8 flex-1">
          <div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 shadow-2xl">
            <div class="flex items-center space-x-3">
              <span class="px-3 py-1 bg-indigo-500/20 text-indigo-400 font-semibold text-xs rounded-full">First-Time Setup</span>
              <h2 class="text-2xl font-bold text-white">Create Your Project</h2>
            </div>
            <p class="text-slate-400 text-xs">Create a project from scratch or import from GitHub.</p>
            <div class="space-y-4">
              <div>
                <label class="text-xs text-slate-400 block mb-1">Project Name</label>
                <input id="newProjName" type="text" placeholder="My SaaS Project" value="My First Project" class="w-full bg-slate-950 border border-slate-800 text-sm p-3 rounded-xl text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div class="flex items-center space-x-4">
                <button onclick="createFirstProject()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-lg">Create New Project</button>
              </div>
            </div>
          </div>
        </main>
        \${renderFooter()}
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
          <aside class="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between">
            <div>
              <div class="p-5 border-b border-slate-800 flex items-center justify-between">
                <a href="/" onclick="event.preventDefault(); navigateRoute('/');" class="flex items-center space-x-3">
                  <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white">V</div>
                  <span class="font-bold text-white text-base tracking-wide">VCoreDB</span>
                </a>
                <span class="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-semibold">25 GB Free</span>
              </div>
              <div class="p-4 border-b border-slate-800 bg-slate-950/40 space-y-2">
                <div class="flex justify-between items-center">
                  <label class="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Active Project</label>
                  <button onclick="createFirstProjectPrompt()" class="text-[10px] text-indigo-400 font-bold hover:underline">+ New Project</button>
                </div>
                <select id="projectSelect" onchange="switchProject(this.value)" class="w-full bg-slate-800 text-white text-xs rounded-lg border border-slate-700 p-2">
                  \${userProjects.map(p => \`<option value="\${p.ref}" \${p.ref === currentProjectRef ? 'selected' : ''}>\${p.name} (\${p.ref})</option>\`).join('')}
                </select>
              </div>
              <nav class="p-3 space-y-1 text-xs font-semibold">
                <button onclick="loadTab('overview')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800">📊 Overview & Health</button>
                <button onclick="loadTab('database')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800">🗄️ Database Console</button>
                <button onclick="loadTab('sqleditor')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800">⚡ SQL Editor</button>
                <button onclick="loadTab('migrations')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800">🔄 Migration Center</button>
                <button onclick="loadTab('auth')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800">🔑 Authentication</button>
                <button onclick="loadTab('storage')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800">📁 Object Storage</button>
                <button onclick="loadTab('github')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800">🐙 GitHub Intelligence</button>
                <button onclick="loadTab('security')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800">🛡️ Security Center</button>
                <button onclick="loadTab('usage')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800">📈 Global Usage</button>
                <button onclick="loadTab('settings')" class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800">⚙️ Settings</button>
              </nav>
            </div>
            <div class="p-4 border-t border-slate-800">
              <button onclick="logoutUser()" class="w-full text-left text-xs text-rose-400 hover:underline font-semibold">Sign Out</button>
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
            <h2 class="text-2xl font-bold text-white">Project Operational Health (\${currentProjectRef})</h2>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <p class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Database Storage</p>
                <p class="text-2xl font-bold text-white mt-1">\${(q.database_storage?.used_bytes / (1024*1024)).toFixed(1) || 0} MB / 25 GB</p>
              </div>
              <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <p class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">File Storage</p>
                <p class="text-2xl font-bold text-white mt-1">\${(q.file_storage?.used_bytes / (1024*1024)).toFixed(1) || 0} MB / 25 GB</p>
              </div>
              <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <p class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Egress Bandwidth</p>
                <p class="text-2xl font-bold text-white mt-1">\${(q.bandwidth?.used_bytes / (1024*1024*1024)).toFixed(2) || 0} GB / 25 GB</p>
              </div>
              <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <p class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">API Requests</p>
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
              <h2 class="text-2xl font-bold text-white">PostgreSQL Table Editor</h2>
              <button onclick="createNewTablePrompt()" class="bg-indigo-600 text-white text-xs px-4 py-2 rounded-lg font-semibold">+ Create Table</button>
            </div>
            <div class="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
              <h3 class="font-bold text-white text-sm">Project Tables (\${tables.length})</h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                \${tables.map(t => \`<div class="p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-indigo-400 flex justify-between items-center"><span>📄 \${t}</span><button onclick="viewTableData('\${t}')" class="text-slate-400 hover:text-white">View Data ➔</button></div>\`).join('')}
              </div>
              <div id="tableDataViewBox" class="mt-4 hidden"></div>
            </div>
          </div>
        \`;
      } else if (tab === 'sqleditor') {
        workspace.innerHTML = \`
          <div class="space-y-6">
            <h2 class="text-2xl font-bold text-white">Interactive SQL Query Console</h2>
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
              <textarea id="sqlQueryInput" rows="4" class="w-full bg-slate-950 border border-slate-800 p-3 text-xs font-mono text-indigo-300 rounded-lg focus:outline-none" placeholder="SELECT * FROM auth.users;"></textarea>
              <div class="flex justify-between items-center">
                <button onclick="executeSqlQuery()" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-5 py-2 rounded-lg font-bold">Run Query</button>
                <span id="sqlDuration" class="text-xs font-mono text-slate-500"></span>
              </div>
            </div>
            <div id="sqlResultBox" class="bg-slate-900 border border-slate-800 p-4 rounded-xl hidden font-mono text-xs overflow-x-auto"></div>
          </div>
        \`;
      } else if (tab === 'migrations') {
        const res = await fetch(\`\${API_BASE}/projects/\${currentProjectRef}/migrations/status\`, { headers: { 'x-vcore-api-key': apiKey } });
        const data = await res.json();
        const migs = data.migrations || [];

        workspace.innerHTML = \`
          <div class="space-y-6">
            <div class="flex justify-between items-center">
              <h2 class="text-2xl font-bold text-white">Migration Center</h2>
              <button onclick="fetchSchemaDiff()" class="bg-indigo-600 text-white text-xs px-4 py-2 rounded-lg font-semibold">Calculate Schema Diff</button>
            </div>
            <div class="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
              <h3 class="font-bold text-white text-sm">Applied Schema Migrations (\${migs.length})</h3>
              <div class="space-y-2 font-mono text-xs">
                \${migs.map(m => \`<div class="p-3 bg-slate-950 border border-slate-800 rounded-lg flex justify-between text-slate-300"><span>📄 \${m.name}</span><span class="text-emerald-400">✓ \${m.status || 'applied'}</span></div>\`).join('')}
              </div>
            </div>
            <div id="schemaDiffBox" class="bg-slate-900 border border-slate-800 p-6 rounded-xl hidden space-y-3 font-mono text-xs"></div>
          </div>
        \`;
      } else if (tab === 'auth') {
        const res = await fetch(\`\${API_BASE}/projects/\${currentProjectRef}/auth/users\`, { headers: { 'x-vcore-api-key': apiKey } });
        const data = await res.json();
        const users = data.users || [];

        workspace.innerHTML = \`
          <div class="space-y-6">
            <h2 class="text-2xl font-bold text-white">Authentication Console</h2>
            <div class="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
              <h3 class="font-bold text-white text-sm">Registered Project Users (\${users.length})</h3>
              <div class="space-y-2 font-mono text-xs">
                \${users.map(u => \`<div class="p-3 bg-slate-950 border border-slate-800 rounded-lg flex justify-between text-slate-300"><span>👤 \${u.email}</span><span class="text-emerald-400">ID: \${u.id}</span></div>\`).join('')}
              </div>
            </div>
          </div>
        \`;
      } else if (tab === 'storage') {
        workspace.innerHTML = \`
          <div class="space-y-6">
            <h2 class="text-2xl font-bold text-white">Object Storage Buckets</h2>
            <div class="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
              <p class="text-xs text-slate-400 font-mono">S3-compatible bucket management for project uploads.</p>
            </div>
          </div>
        \`;
      } else if (tab === 'github') {
        const res = await fetch(\`\${API_BASE}/projects/\${currentProjectRef}/github/repo\`, { headers: { 'x-vcore-api-key': apiKey } });
        const data = await res.json();

        workspace.innerHTML = \`
          <div class="space-y-6">
            <div class="flex justify-between items-center">
              <h2 class="text-2xl font-bold text-white">GitHub Integration</h2>
              <button onclick="openGitHubImporter()" class="bg-indigo-600 text-white text-xs px-4 py-2 rounded-lg font-semibold">+ Connect Repo</button>
            </div>
            \${data.connected ? \`
              <div class="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                <div class="flex justify-between items-center">
                  <h3 class="font-bold text-white text-sm">🐙 Linked Repo: \${data.repo.owner}/\${data.repo.name}</h3>
                  <button onclick="disconnectGitHub()" class="text-xs text-rose-400 hover:underline font-semibold">Disconnect Repo</button>
                </div>
              </div>
            \` : \`
              <div class="bg-slate-900 border border-slate-800 p-8 rounded-xl text-center space-y-4">
                <p class="text-slate-400 text-xs">No GitHub repository currently linked to this VCoreDB project.</p>
                <button onclick="openGitHubImporter()" class="bg-indigo-600 text-white text-xs px-5 py-2.5 rounded-xl font-semibold">Connect GitHub Repo</button>
              </div>
            \`}
          </div>
        \`;
      } else if (tab === 'security') {
        workspace.innerHTML = \`
          <div class="space-y-6">
            <h2 class="text-2xl font-bold text-white">Security Center</h2>
            <div class="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
              <div class="flex justify-between items-center">
                <span class="text-sm font-bold text-white">Platform Security Score</span>
                <span class="px-3 py-1 bg-emerald-500/10 text-emerald-400 font-bold text-xs rounded-full border border-emerald-500/20">92 / 100</span>
              </div>
              <ul class="space-y-2 text-xs text-slate-300 font-mono">
                <li class="flex items-center space-x-2"><span class="text-emerald-400">✓</span><span>Database API keys isolated per tenant project</span></li>
                <li class="flex items-center space-x-2"><span class="text-emerald-400">✓</span><span>JWT signature verification enforced on protected routes</span></li>
                <li class="flex items-center space-x-2"><span class="text-emerald-400">✓</span><span>Platform Admin interface restricted behind server-side authentication</span></li>
              </ul>
            </div>
          </div>
        \`;
      } else if (tab === 'usage') {
        workspace.innerHTML = \`
          <div class="space-y-6">
            <h2 class="text-2xl font-bold text-white">Global Usage & Metering</h2>
            <div class="grid grid-cols-3 gap-4">
              <div class="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
                <div class="text-xs font-bold text-white">Database Storage</div>
                <div class="text-xl font-bold text-indigo-400">12.5 MB / 25 GB</div>
              </div>
              <div class="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
                <div class="text-xs font-bold text-white">File Storage</div>
                <div class="text-xl font-bold text-indigo-400">0 MB / 25 GB</div>
              </div>
              <div class="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
                <div class="text-xs font-bold text-white">Egress Bandwidth</div>
                <div class="text-xl font-bold text-emerald-400">2.85 GB / 25 GB</div>
              </div>
            </div>
          </div>
        \`;
      } else if (tab === 'settings') {
        workspace.innerHTML = \`
          <div class="space-y-6">
            <h2 class="text-2xl font-bold text-white">Project Settings</h2>
            <div class="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
              <div>
                <label class="text-xs text-slate-400 block mb-1">Project Identifier (Ref)</label>
                <input readonly value="\${currentProjectRef}" class="bg-slate-950 text-slate-400 p-2 text-xs rounded border border-slate-800 w-full font-mono" />
              </div>
            </div>

            <!-- Danger Zone -->
            <div class="bg-rose-950/20 border border-rose-500/30 p-6 rounded-xl space-y-4">
              <h3 class="text-sm font-bold text-rose-400">Danger Zone — Delete Project</h3>
              <p class="text-xs text-slate-400">Permanently delete this project and all associated database, storage, keys, and GitHub resources.</p>
              <button onclick="confirmDeleteProject()" class="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl">Delete Project</button>
            </div>
          </div>
        \`;
      }
    }

    async function confirmDeleteProject() {
      const confirmName = prompt(\`To confirm deletion, type project ref "\${currentProjectRef}":\`);
      if (confirmName !== currentProjectRef) {
        return alert('Project ref confirmation did not match.');
      }

      try {
        const res = await fetch(\`\${API_BASE}/projects/\${currentProjectRef}\`, {
          method: 'DELETE',
          headers: {
            'Authorization': \`Bearer \${authToken}\`,
            'x-vcore-api-key': 'vcore_anon_default_key',
          },
        });
        if (res.ok) {
          alert('Project deleted successfully.');
          currentProjectRef = null;
          localStorage.removeItem('vcore_current_project');
          await fetchUserProjects();
          navigateRoute('/dashboard');
        } else {
          alert('Failed to delete project');
        }
      } catch (err) {
        alert(err.message);
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

    async function viewTableData(tableName) {
      const box = document.getElementById('tableDataViewBox');
      if (!box) return;
      box.classList.remove('hidden');
      box.innerHTML = '<div class="text-xs font-mono text-slate-400 animate-pulse">Loading data for ' + tableName + '...</div>';

      try {
        const res = await fetch(\`\${API_BASE}/projects/\${currentProjectRef}/tables/\${tableName}\`, {
          headers: { 'x-vcore-api-key': 'vcore_anon_default_key' },
        });
        const data = await res.json();
        box.innerHTML = \`<pre class="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-indigo-300 font-mono overflow-x-auto">\${JSON.stringify(data.data, null, 2)}</pre>\`;
      } catch (err) {
        box.innerHTML = '<div class="text-xs text-rose-400 font-mono">' + err.message + '</div>';
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

    async function fetchSchemaDiff() {
      const box = document.getElementById('schemaDiffBox');
      if (!box) return;
      box.classList.remove('hidden');
      box.innerHTML = '<div class="animate-pulse">Calculating schema diff against target model...</div>';

      try {
        const res = await fetch(\`\${API_BASE}/projects/\${currentProjectRef}/migrations/diff\`, {
          headers: { 'x-vcore-api-key': 'vcore_anon_default_key' },
        });
        const data = await res.json();
        box.innerHTML = \`<pre class="text-indigo-300">\${JSON.stringify(data.diff, null, 2)}</pre>\`;
      } catch (err) {
        box.innerHTML = '<div class="text-rose-400">Diff error: ' + err.message + '</div>';
      }
    }

    function renderAdminLogin(container) {
      container.innerHTML = \`
        \${renderNavbar()}
        <main class="max-w-md mx-auto px-6 py-16 w-full flex-1">
          <div class="bg-slate-900 border border-amber-500/30 rounded-2xl p-8 space-y-6 shadow-2xl">
            <div class="text-center space-y-2">
              <div class="inline-block px-3 py-1 bg-amber-500/10 text-amber-400 text-xs font-semibold rounded-full mb-2">Platform Admin Access</div>
              <h2 class="text-2xl font-bold text-white">Admin Control Center</h2>
              <p class="text-xs text-slate-400">Enter administrator secret key</p>
            </div>
            <div id="adminError" class="hidden p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg"></div>
            <form onsubmit="handleAdminLoginSubmit(event)" class="space-y-4">
              <div>
                <label class="text-xs text-slate-400 block mb-1">Admin Key / Secret</label>
                <input id="adminKeyInput" type="password" required placeholder="vcore_admin_secret_key" class="w-full bg-slate-950 border border-slate-800 text-sm p-3 rounded-xl text-white focus:outline-none focus:border-amber-500" />
              </div>
              <button type="submit" class="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm py-3 rounded-xl transition shadow-lg shadow-amber-600/20">Sign In as Admin</button>
            </form>
          </div>
        </main>
        \${renderFooter()}
      \`;
    }

    async function handleAdminLoginSubmit(e) {
      e.preventDefault();
      const errBox = document.getElementById('adminError');
      errBox.classList.add('hidden');
      const adminKey = document.getElementById('adminKeyInput').value;

      try {
        const res = await fetch(\`\${API_BASE}/admin/login\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminKey }),
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
          <header class="border-b border-slate-800 bg-slate-950 px-6 py-4 flex justify-between items-center">
            <div class="flex items-center space-x-3">
              <span class="w-3 h-3 rounded-full bg-amber-400"></span>
              <span class="font-bold text-white text-base">Platform Administrator Control Center</span>
            </div>
            <button onclick="logoutAdmin()" class="bg-slate-800 text-rose-400 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-lg font-semibold">Exit Admin</button>
          </header>
          <main class="max-w-7xl mx-auto px-6 py-12 space-y-8 flex-1">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <p class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Platform Users</p>
                <p class="text-3xl font-extrabold text-white mt-1">\${m.total_users || 0}</p>
              </div>
              <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <p class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Active Projects</p>
                <p class="text-3xl font-extrabold text-white mt-1">\${m.total_projects || 0}</p>
              </div>
              <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <p class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">GitHub Repos Connected</p>
                <p class="text-3xl font-extrabold text-white mt-1">\${m.github_projects || 0}</p>
              </div>
              <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <p class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Platform Revenue</p>
                <p class="text-3xl font-extrabold text-emerald-400 mt-1">$\${(m.total_revenue_usd || 0).toFixed(2)} USD</p>
              </div>
            </div>
          </main>
          \${renderFooter()}
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
      const name = prompt('Enter GitHub repository name to import (e.g. my-express-api):');
      if (!name) return;

      const res = await fetch(\`\${API_BASE}/projects/\${currentProjectRef}/github/import\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vcore-api-key': 'vcore_anon_default_key',
        },
        body: JSON.stringify({ owner: 'octocat', name, branch: 'main' }),
      });
      const data = await res.json();
      alert('GitHub Repo imported successfully! Health Score: ' + data.analysis?.project_health_score);
      loadTab('github');
    }

    async function disconnectGitHub() {
      if (!confirm('Disconnect GitHub repository from project?')) return;
      await fetch(\`\${API_BASE}/projects/\${currentProjectRef}/github/disconnect\`, {
        method: 'DELETE',
        headers: { 'x-vcore-api-key': 'vcore_anon_default_key' },
      });
      loadTab('github');
    }

    window.onload = renderApp;
  </script>
</body>
</html>`;

dashboardRouter.use((req: Request, res: Response) => {
  res.send(HTML_DASHBOARD);
});

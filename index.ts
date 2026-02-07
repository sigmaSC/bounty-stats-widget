import { serve } from "bun";

const API_BASE = process.env.API_BASE || "https://bounty.owockibot.xyz";
const PORT = parseInt(process.env.PORT || "3000");
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface BountyStats {
  completedToday: number;
  completedWeek: number;
  completedMonth: number;
  totalUSDCPaid: number;
  avgCompletionHours: number;
  successRate: number;
  totalBounties: number;
  activeBounties: number;
  lastUpdated: string;
}

interface Bounty {
  id: number;
  title: string;
  reward: number;
  status: string;
  created_at: string;
  claimed_at?: string;
  completed_at?: string;
}

let cachedStats: BountyStats | null = null;
let cacheTimestamp = 0;

async function fetchStats(): Promise<BountyStats> {
  const now = Date.now();
  if (cachedStats && now - cacheTimestamp < CACHE_TTL) {
    return cachedStats;
  }

  try {
    const [bountiesRes, statsRes] = await Promise.allSettled([
      fetch(`${API_BASE}/bounties`),
      fetch(`${API_BASE}/stats`),
    ]);

    let bounties: Bounty[] = [];
    let apiStats: any = {};

    if (bountiesRes.status === "fulfilled" && bountiesRes.value.ok) {
      const data = await bountiesRes.value.json();
      bounties = Array.isArray(data) ? data : data.bounties || [];
    }

    if (statsRes.status === "fulfilled" && statsRes.value.ok) {
      apiStats = await statsRes.value.json();
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setMonth(monthStart.getMonth() - 1);

    const completed = bounties.filter((b) => b.status === "completed" || b.status === "done");
    const claimed = bounties.filter(
      (b) => b.status === "claimed" || b.status === "completed" || b.status === "done"
    );

    const completedToday = completed.filter(
      (b) => b.completed_at && new Date(b.completed_at) >= todayStart
    ).length;
    const completedWeek = completed.filter(
      (b) => b.completed_at && new Date(b.completed_at) >= weekStart
    ).length;
    const completedMonth = completed.filter(
      (b) => b.completed_at && new Date(b.completed_at) >= monthStart
    ).length;

    const totalUSDCPaid = completed.reduce((sum, b) => sum + (b.reward || 0), 0);

    let avgCompletionHours = 0;
    const withTimes = completed.filter((b) => b.claimed_at && b.completed_at);
    if (withTimes.length > 0) {
      const totalHours = withTimes.reduce((sum, b) => {
        const diff = new Date(b.completed_at!).getTime() - new Date(b.claimed_at!).getTime();
        return sum + diff / (1000 * 60 * 60);
      }, 0);
      avgCompletionHours = Math.round((totalHours / withTimes.length) * 10) / 10;
    }

    const successRate = claimed.length > 0 ? Math.round((completed.length / claimed.length) * 100) : 0;

    const stats: BountyStats = {
      completedToday: apiStats.completedToday ?? completedToday,
      completedWeek: apiStats.completedWeek ?? completedWeek,
      completedMonth: apiStats.completedMonth ?? completedMonth,
      totalUSDCPaid: apiStats.totalUSDCPaid ?? totalUSDCPaid,
      avgCompletionHours: apiStats.avgCompletionHours ?? avgCompletionHours,
      successRate: apiStats.successRate ?? successRate,
      totalBounties: apiStats.totalBounties ?? bounties.length,
      activeBounties: apiStats.activeBounties ?? bounties.filter((b) => b.status === "open").length,
      lastUpdated: new Date().toISOString(),
    };

    cachedStats = stats;
    cacheTimestamp = Date.now();
    return stats;
  } catch (err) {
    console.error("Failed to fetch stats:", err);
    if (cachedStats) return cachedStats;
    return {
      completedToday: 0,
      completedWeek: 0,
      completedMonth: 0,
      totalUSDCPaid: 0,
      avgCompletionHours: 0,
      successRate: 0,
      totalBounties: 0,
      activeBounties: 0,
      lastUpdated: new Date().toISOString(),
    };
  }
}

function widgetHTML(theme: "light" | "dark" = "dark"): string {
  const isDark = theme === "dark";
  const bg = isDark ? "#1A1A2E" : "#FFFFFF";
  const cardBg = isDark ? "#16213E" : "#F8F9FA";
  const text = isDark ? "#E8E8F0" : "#1A1A2E";
  const textMuted = isDark ? "#9090A8" : "#6C757D";
  const border = isDark ? "#2A2A40" : "#E9ECEF";
  const accent = "#6C5CE7";
  const green = "#00B894";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bounty Stats Widget</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: ${bg};
  color: ${text};
  max-width: 520px;
  margin: 0 auto;
  padding: 0;
}
.widget {
  background: ${bg};
  border: 1px solid ${border};
  border-radius: 16px;
  padding: 24px;
  max-width: 520px;
}
.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.widget-title {
  font-size: 1.1rem;
  font-weight: 700;
}
.widget-badge {
  background: ${accent};
  color: white;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}
.stat-card {
  background: ${cardBg};
  border-radius: 12px;
  padding: 16px;
  border: 1px solid ${border};
}
.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: ${accent};
}
.stat-value.green { color: ${green}; }
.stat-label {
  font-size: 0.8rem;
  color: ${textMuted};
  margin-top: 2px;
}
.completions-row {
  display: flex;
  justify-content: space-between;
  background: ${cardBg};
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 12px;
  border: 1px solid ${border};
}
.completion-item { text-align: center; }
.completion-value {
  font-size: 1.2rem;
  font-weight: 700;
}
.completion-label {
  font-size: 0.7rem;
  color: ${textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.widget-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid ${border};
}
.footer-link {
  color: ${accent};
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 600;
}
.footer-link:hover { text-decoration: underline; }
.footer-updated {
  font-size: 0.75rem;
  color: ${textMuted};
}
.loading { text-align: center; padding: 40px; color: ${textMuted}; }
</style>
</head>
<body>
<div class="widget" id="widget">
  <div class="loading">Loading stats...</div>
</div>
<script>
async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const s = await res.json();
    document.getElementById('widget').innerHTML = \`
      <div class="widget-header">
        <div class="widget-title">AI Bounty Board</div>
        <div class="widget-badge">\${s.activeBounties} Active</div>
      </div>
      <div class="completions-row">
        <div class="completion-item">
          <div class="completion-value">\${s.completedToday}</div>
          <div class="completion-label">Today</div>
        </div>
        <div class="completion-item">
          <div class="completion-value">\${s.completedWeek}</div>
          <div class="completion-label">This Week</div>
        </div>
        <div class="completion-item">
          <div class="completion-value">\${s.completedMonth}</div>
          <div class="completion-label">This Month</div>
        </div>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value green">$\${s.totalUSDCPaid.toLocaleString()}</div>
          <div class="stat-label">Total USDC Paid</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${s.avgCompletionHours}h</div>
          <div class="stat-label">Avg Completion Time</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${s.successRate}%</div>
          <div class="stat-label">Success Rate</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${s.totalBounties}</div>
          <div class="stat-label">Total Bounties</div>
        </div>
      </div>
      <div class="widget-footer">
        <a href="https://bounty.owockibot.xyz" target="_blank" class="footer-link">View Bounty Board &rarr;</a>
        <div class="footer-updated">Updated \${new Date(s.lastUpdated).toLocaleTimeString()}</div>
      </div>
    \`;
  } catch (e) {
    document.getElementById('widget').innerHTML = '<div class="loading">Failed to load stats</div>';
  }
}
loadStats();
setInterval(loadStats, 5 * 60 * 1000);
</script>
</body>
</html>`;
}

function embedPageHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bounty Stats Widget - Embed Instructions</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0F0F1A;
  color: #E8E8F0;
  padding: 40px 20px;
}
.container { max-width: 800px; margin: 0 auto; }
h1 {
  font-size: 2rem;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #6C5CE7, #00B894);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.subtitle { color: #9090A8; margin-bottom: 32px; }
h2 { margin: 32px 0 12px; font-size: 1.3rem; }
.code-block {
  background: #1A1A2E;
  border: 1px solid #2A2A40;
  border-radius: 10px;
  padding: 16px;
  margin: 12px 0 24px;
  overflow-x: auto;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  color: #A29BFE;
}
.preview-frame {
  border: 1px solid #2A2A40;
  border-radius: 12px;
  overflow: hidden;
  margin: 16px 0;
}
.tabs { display: flex; gap: 8px; margin-bottom: 12px; }
.tab {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid #2A2A40;
  background: transparent;
  color: #9090A8;
  cursor: pointer;
  font-size: 0.9rem;
}
.tab.active { background: #6C5CE7; color: white; border-color: #6C5CE7; }
p { line-height: 1.6; color: #C0C0D0; margin: 8px 0; }
</style>
</head>
<body>
<div class="container">
  <h1>Bounty Stats Widget</h1>
  <p class="subtitle">Embed real-time AI Bounty Board statistics on your site</p>

  <h2>Live Preview (Dark Theme)</h2>
  <div class="preview-frame">
    <iframe src="/widget?theme=dark" width="100%" height="380" frameborder="0"></iframe>
  </div>

  <h2>Live Preview (Light Theme)</h2>
  <div class="preview-frame" style="background: white;">
    <iframe src="/widget?theme=light" width="100%" height="380" frameborder="0"></iframe>
  </div>

  <h2>Option 1: Iframe Embed</h2>
  <p>Paste this HTML snippet wherever you want the widget:</p>
  <div class="code-block">&lt;iframe
  src="${process.env.PUBLIC_URL || "http://localhost:3000"}/widget?theme=dark"
  width="520"
  height="380"
  frameborder="0"
  style="border-radius: 16px; max-width: 100%;"
&gt;&lt;/iframe&gt;</div>

  <h2>Option 2: Script Tag Embed</h2>
  <p>Add this script tag to auto-inject the widget into a container:</p>
  <div class="code-block">&lt;div id="bounty-stats-widget"&gt;&lt;/div&gt;
&lt;script src="${process.env.PUBLIC_URL || "http://localhost:3000"}/embed.js"&gt;&lt;/script&gt;</div>

  <h2>Theme Options</h2>
  <p>Add <code>?theme=light</code> or <code>?theme=dark</code> to the URL. Default is dark.</p>

  <h2>API Endpoint</h2>
  <p>Raw JSON stats are available at:</p>
  <div class="code-block">GET /api/stats</div>
</div>
</body>
</html>`;
}

function embedJS(): string {
  const baseUrl = process.env.PUBLIC_URL || "http://localhost:3000";
  return `(function() {
  var container = document.getElementById('bounty-stats-widget');
  if (!container) return;
  var theme = container.getAttribute('data-theme') || 'dark';
  var iframe = document.createElement('iframe');
  iframe.src = '${baseUrl}/widget?theme=' + theme;
  iframe.width = '520';
  iframe.height = '380';
  iframe.frameBorder = '0';
  iframe.style.borderRadius = '16px';
  iframe.style.maxWidth = '100%';
  iframe.style.border = 'none';
  container.appendChild(iframe);
})();`;
}

serve({
  port: PORT,
  hostname: "0.0.0.0",
  async fetch(req) {
    const url = new URL(req.url);
    const theme = (url.searchParams.get("theme") as "light" | "dark") || "dark";

    // CORS headers
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
    };

    if (url.pathname === "/api/stats") {
      const stats = await fetchStats();
      return new Response(JSON.stringify(stats, null, 2), {
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/widget") {
      return new Response(widgetHTML(theme), {
        headers: { ...headers, "Content-Type": "text/html" },
      });
    }

    if (url.pathname === "/embed.js") {
      return new Response(embedJS(), {
        headers: { ...headers, "Content-Type": "application/javascript" },
      });
    }

    // Default: embed instructions page
    return new Response(embedPageHTML(), {
      headers: { ...headers, "Content-Type": "text/html" },
    });
  },
});

console.log(`Bounty Stats Widget running on http://localhost:${PORT}`);
console.log(`  Widget:     http://localhost:${PORT}/widget`);
console.log(`  API:        http://localhost:${PORT}/api/stats`);
console.log(`  Embed JS:   http://localhost:${PORT}/embed.js`);
console.log(`  Docs:       http://localhost:${PORT}/`);

# Bounty Stats Widget

Embeddable widget with **real-time updates**, **multiple time frames**, **dark mode** support, and **embeddable via iframe/script**. **Published on GitHub**.

## Features

- **Real-time updates** — auto-refreshes data every 5 minutes with server-side caching
- **Multiple time frames** — shows bounties completed today, this week, and this month
- **Embeddable via iframe/script** — two embed options: `<iframe>` tag and `<script>` tag
- **Dark mode** — full dark theme support with optional light theme toggle
- **Published on GitHub** — open source, ready to fork and deploy
- **Responsive design** — max-width 520px, works on all devices
- **Self-contained** — single Bun server with no external dependencies

## Quick Start

```bash
# Install Bun if needed
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install

# Start the server
bun run start
```

The server starts at `http://localhost:3000`.

## Endpoints

| Path | Description |
|------|-------------|
| `/` | Embed instructions and live preview |
| `/widget?theme=dark` | Widget page (dark theme) |
| `/widget?theme=light` | Widget page (light theme) |
| `/api/stats` | Raw JSON stats endpoint |
| `/embed.js` | JavaScript embed script |

## Embed Options

### Option 1: Iframe

```html
<iframe
  src="https://your-domain.com/widget?theme=dark"
  width="520"
  height="380"
  frameborder="0"
  style="border-radius: 16px; max-width: 100%;"
></iframe>
```

### Option 2: Script Tag

```html
<div id="bounty-stats-widget" data-theme="dark"></div>
<script src="https://your-domain.com/embed.js"></script>
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `API_BASE` | `https://bounty.owockibot.xyz/api` | Bounty board API base URL |
| `PUBLIC_URL` | `http://localhost:3000` | Public URL for embed code generation |

## Docker

```bash
docker build -t bounty-stats-widget .
docker run -p 3000:3000 bounty-stats-widget
```

## Stats Displayed

- Bounties completed: today, this week, this month
- Total USDC paid out
- Average completion time (hours)
- Success rate (claimed to completed ratio)
- Total bounties and active count

## License

MIT

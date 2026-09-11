# MapleDoro

A free, open-source companion app for the MapleStory community, characters, progression tools, and event tracking, all in one place. No ads, no accounts, no hidden fees. Everything you save lives in your browser's localStorage.

## Features

### Dashboard
- Live patch notes feed, filterable by category
- Sunny Sunday and Miracle Time schedule panels
- Ursus 2x Meso and daily/weekly reset countdowns
- Character roster panel with quick links
- Customizable quick-launch tool grid

### Characters
- Add and track characters via in-game name lookup
- Per-character storage for tool progress (symbols, liberation, HEXA, Mystic Frontier, EXP tracking)

### Tools
- **Star Force Calculator** — expected meso and booms for a star force run, from a full simulation
- **Cubing Calculator** — expected cubes and meso to reach a target tier and lines
- **Flaming Calculator** — expected flames to hit a bonus stat target
- **EXP Calculator** — hourly farming rates, weekly EXP gained, and level resources
- **Event Planner** — star force spending planner for an entire event, item by item
- **Mystic Frontier Solver** — whether a dice roll passes, and which rerolls would
- **Boss Crystal Tracker** — weekly crystal income, per character and in total
- **Daily Tracker** — one checklist for every daily, across every character
- **Symbol Tracker** — Arcane and Sacred symbol progress, with a daily projection to max
- **Liberation Tracker** — Genesis, Destiny, and Astra Secondary progress with estimated completion dates
- **HEXA Skill Tracker** — Sol Erda and Fragment cost to max HEXA skills, per character
- **Drop Tracker** — rare boss drop history, charted by item and by month
- **Trace Restoration Tracker** — Whisper crystal totals and mission progress

### Games
- **Mapledle** — guess which class learns the daily skill icon in 5 tries

### Guides
- New Players guide
- Character guides covering every class, with link skills and legion bonuses

## Local setup

1. Install Node.js 20+ (LTS recommended)
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run dev server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000`

## Local Redis cache (character lookup API)

The character lookup route (`/api/characters/lookup`) uses Redis when `REDIS_URL` is set.

1. Start Redis with Docker (i.e):
   ```bash
   docker run --name mapledoro-redis -p 6379:6379 -d redis:7-alpine
   ```
2. Create `.env.local` in the project root:
   ```env
   REDIS_URL=redis://127.0.0.1:6379
   ```
3. Restart dev server after changing env vars.
4. Optional: verify cached keys:
   ```bash
   docker exec -it mapledoro-redis redis-cli keys "mapledoro:characters:lookup:v1:*"
   ```

## Bug reports to Discord (optional)

The Report a Bug page posts to `/api/bug-report`, which relays the report to a Discord
channel through a webhook. Without the env var the route answers 503 and the page shows
that bug reporting is not set up.

1. In Discord, open the channel's settings, choose Integrations, and create a webhook.
2. Add it to `.env.local` (and to the Vercel project's environment variables):
   ```env
   DISCORD_BUG_REPORT_WEBHOOK_URL=https://discord.com/api/webhooks/<id>/<token>
   ```
3. Restart the dev server after changing env vars.

Rate limits (5 reports per IP per hour, 40 total per hour) use Redis when `REDIS_URL` is set
and fall back to per-instance memory otherwise. The embed's build field reads
`VERCEL_GIT_COMMIT_SHA`, which Vercel provides when "Automatically expose System Environment
Variables" is enabled for the project.

## Google Drive backup (optional)

The Settings page has an optional Google Drive backup panel. It only renders when an OAuth
client ID is configured; without one the feature is simply absent. The flow is pure client
side (Google Identity Services token client + Drive REST from the browser) with the
non-sensitive `drive.appdata` scope, so there is no backend, database, or client secret.

1. In the Google Cloud console, create an OAuth 2.0 Client ID of type "Web application" and
   add the site's origin (e.g. `http://localhost:3000`) under "Authorized JavaScript origins".
   The consent screen only needs the `https://www.googleapis.com/auth/drive.appdata` scope.
2. Add it to `.env.local`:
   ```env
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your client id>.apps.googleusercontent.com
   ```
3. Restart the dev server after changing env vars.

## Legal Disclaimer
**MapleDoro is a non-commercial, fan-made project.** It is not affiliated with, endorsed, or supported by **Nexon**, Wizet, or any of their partners.

- **MapleStory** and all related game assets, including but not limited to character designs, names, and images, are the intellectual property and registered trademarks of **Nexon**.
- This tool is developed for the community to help with gameplay tracking and planning. No fees are charged for its use, and it contains no official MapleStory game files.

All rights to MapleStory belong to Nexon. If you are a Nexon representative and have concerns about this project, please contact the maintainers.
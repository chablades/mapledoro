# MapleDoro

Next.js + TypeScript app for the MapleDoro landing/dashboard site.

## Local setup

1. Install Node.js 20+ (LTS recommended).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run dev server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000`.

## Local Redis cache (character lookup API)

The character lookup route (`/api/characters/lookup`) uses Redis when `REDIS_URL` is set.

1. Start Redis with Docker:
   ```bash
   docker run --name mapledoro-redis -p 6379:6379 -d redis:7-alpine
   ```
   If the container already exists:
   ```bash
   docker start mapledoro-redis
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

## Build and run

```bash
npm run build
npm run start
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. Framework preset: `Next.js`.
4. Build command: `npm run build` (default).
5. Output directory: `.next` (default)

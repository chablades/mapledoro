# MapleDoro

Just another MapleStory website for seeing events, sharing characters and more!

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

## Legal Disclaimer
**MapleDoro is a non-commercial, fan-made project.** It is not affiliated with, endorsed, or supported by **Nexon**, Wizet, or any of their partners.

- **MapleStory** and all related game assets, including but not limited to character designs, names, and images, are the intellectual property and registered trademarks of **Nexon**.
- This tool is developed for the community to help with gameplay tracking and planning. No fees are charged for its use, and it contains no official MapleStory game files.

All rights to MapleStory belong to Nexon. If you are a Nexon representative and have concerns about this project, please contact the maintainers.
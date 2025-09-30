# VatraMC Playtime API (Paper)

Simple Node/Express endpoint that reads Paper/Vanilla stats files and exposes a player's total playtime in seconds.

## Endpoint

- `GET /api/playtime?uuid=<uuid>`
  - Accepts either dashed or undashed UUIDs
  - Responds: `{ "seconds": number }`

## How it works

- Reads the JSON file at `<WORLD_STATS_DIR>/<uuid-with-dashes>.json`
- Extracts `minecraft:custom.minecraft:play_time` (or `minecraft:play_one_minute` on older versions)
- Converts ticks to seconds (20 ticks = 1 second)

## Requirements

- Node.js 18+
- Access to your Paper server's `world/stats/` directory

## Setup

1. Install dependencies:

```bash
npm install
```

2. Run the server (set the path to your stats dir):

```bash
WORLD_STATS_DIR="/absolute/path/to/your/paper/world/stats" PORT=3001 node server.js
```

- Example path on Linux: `/home/minecraft/server/world/stats`
- `PORT` defaults to `3001` if not set

3. Frontend configuration

In `../script.js`, the frontend calls `PLAYTIME_API` (default: `/api/playtime`).

- If you reverse-proxy `/api/*` to this server, you can keep it as-is.
- Otherwise, change it to your full URL, e.g.:

```js
const PLAYTIME_API = 'http://your-host:3001/api/playtime';
```

## Security notes

- By default, CORS is open. For production, restrict it to your site domain in `server.js`:

```js
app.use(cors({ origin: 'https://your-domain.tld' }));
```

- This API exposes only total playtime, not raw files.

## Health check

- `GET /health` returns `{ ok: true }` if the server is running.


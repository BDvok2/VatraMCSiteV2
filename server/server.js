const express = require('express');
const cors = require('cors');
const fs = require('fs/promises');
const path = require('path');

const app = express();
app.use(cors()); // Allow all origins; tighten if you need

const PORT = process.env.PORT || 3001;
const WORLD_STATS_DIR = process.env.WORLD_STATS_DIR || '';

function isValidUuidNoDashes(u) {
  return typeof u === 'string' && /^[0-9a-fA-F]{32}$/.test(u);
}

function isValidUuidDashed(u) {
  return (
    typeof u === 'string' &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(u)
  );
}

function toDashedUuid(uuid) {
  if (isValidUuidDashed(uuid)) return uuid.toLowerCase();
  if (!isValidUuidNoDashes(uuid)) return null;
  const u = uuid.toLowerCase();
  return `${u.slice(0, 8)}-${u.slice(8, 12)}-${u.slice(12, 16)}-${u.slice(16, 20)}-${u.slice(20)}`;
}

function secondsFromStatsJson(statsJson) {
  try {
    const custom = statsJson?.stats?.['minecraft:custom'];
    if (!custom || typeof custom !== 'object') return null;

    // Prefer modern key first, then older pre-1.20 key
    let ticks = null;
    if (custom['minecraft:play_time'] != null) {
      ticks = Number(custom['minecraft:play_time']);
    } else if (custom['minecraft:play_one_minute'] != null) {
      ticks = Number(custom['minecraft:play_one_minute']);
    }

    if (Number.isFinite(ticks)) {
      return Math.max(0, Math.floor(ticks / 20)); // 20 ticks = 1 second
    }
    return null;
  } catch {
    return null;
  }
}

app.get('/api/playtime', async (req, res) => {
  try {
    const { uuid } = req.query;
    if (!uuid) return res.status(400).json({ error: 'uuid query param required' });

    if (!WORLD_STATS_DIR) {
      return res.status(500).json({ error: 'WORLD_STATS_DIR not configured on server' });
    }

    const dashed = toDashedUuid(uuid);
    if (!dashed) return res.status(400).json({ error: 'invalid uuid format' });

    const filePath = path.join(WORLD_STATS_DIR, `${dashed}.json`);

    let raw;
    try {
      raw = await fs.readFile(filePath, 'utf8');
    } catch (e) {
      if (e.code === 'ENOENT') {
        return res.status(404).json({ error: 'stats_not_found' });
      }
      throw e;
    }

    let json;
    try {
      json = JSON.parse(raw);
    } catch {
      return res.status(500).json({ error: 'invalid_stats_json' });
    }

    const seconds = secondsFromStatsJson(json);
    if (seconds == null) {
      return res.status(404).json({ error: 'playtime_not_available' });
    }

    return res.json({ seconds });
  } catch (e) {
    console.error('playtime endpoint error:', e);
    return res.status(500).json({ error: 'server_error' });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Playtime API listening on http://localhost:${PORT}`);
  if (!WORLD_STATS_DIR) {
    console.warn('WORLD_STATS_DIR is not set; /api/playtime will return an error until configured.');
  } else {
    console.log('Using WORLD_STATS_DIR =', WORLD_STATS_DIR);
  }
});

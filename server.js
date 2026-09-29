const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app      = express();
const PORT     = process.env.PORT || 3000;
const DB_FILE  = path.join(process.env.DATA_DIR || __dirname, 'data.json');

const DEFAULT_DB = {
  items: [],
  locations:  ['Keller','Dachboden','Erdgeschoss','Wohnzimmer','Küche','Schlafzimmer','Kinderzimmer','Bad','Garage','Flur','Büro'],
  categories: ['Werkzeug','Kleidung','Bücher','Elektronik','Dokumente','Sport','Dekoration','Haushalt','Spielzeug','Lebensmittel'],
  spots: {}  // { [location]: string[] }
};

function readDb() {
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    db.spots = db.spots || {};  // migration: alte data.json ohne spots
    return db;
  } catch {
    return structuredClone(DEFAULT_DB);
  }
}

function writeDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function trim(val, max = 200) {
  return String(val ?? '').trim().slice(0, max);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── API ──────────────────────────────────────────────────

app.get('/api/data', (_req, res) => {
  res.json(readDb());
});

app.post('/api/items', (req, res) => {
  const name     = trim(req.body?.name);
  const location = trim(req.body?.location, 100);
  const spot     = trim(req.body?.spot, 100);
  const category = trim(req.body?.category, 100);

  if (!name || !location) {
    return res.status(400).json({ error: 'Name und Ort sind erforderlich.' });
  }

  const db   = readDb();
  const item = { id: uid(), name, location, spot, category, ts: Date.now() };

  db.items.unshift(item);
  if (!db.locations.includes(location))               db.locations.push(location);
  if (category && !db.categories.includes(category)) db.categories.push(category);
  if (spot) {
    if (!db.spots[location]) db.spots[location] = [];
    if (!db.spots[location].includes(spot)) db.spots[location].push(spot);
  }

  writeDb(db);
  res.status(201).json(item);
});

app.delete('/api/items/:id', (req, res) => {
  const db     = readDb();
  const before = db.items.length;
  db.items     = db.items.filter(i => i.id !== req.params.id);

  if (db.items.length === before) {
    return res.status(404).json({ error: 'Item nicht gefunden.' });
  }

  writeDb(db);
  res.json({ ok: true });
});

// ── Start ─────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  const interfaces = require('os').networkInterfaces();
  const ips = Object.values(interfaces)
    .flat()
    .filter(i => i.family === 'IPv4' && !i.internal)
    .map(i => i.address);

  console.log(`\nWoLiegt? läuft ✓`);
  console.log(`  Lokal:    http://localhost:${PORT}`);
  ips.forEach(ip => console.log(`  Netzwerk: http://${ip}:${PORT}`));
  console.log('');
});

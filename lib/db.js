import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

let db = null

function getDb() {
  if (db) return db

  if (process.env.DATABASE_URL) {
    // Turso / libsql
    db = createClient({
      url: process.env.DATABASE_URL,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    })
  } else {
    // Local SQLite fallback via libsql file
    db = createClient({
      url: 'file:./quoflow.db',
    })
  }
  return db
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  subscription_tier TEXT DEFAULT 'starter',
  settings_json TEXT DEFAULT '{}',
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','staff','builder')),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  location TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  label TEXT,
  role TEXT DEFAULT 'builder',
  claimed INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  filename TEXT NOT NULL,
  page_count INTEGER,
  file_b64 TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  page_num INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  model_type TEXT DEFAULT 'doors',
  raw_results_json TEXT,
  image_b64 TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS detections (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL,
  class_name TEXT NOT NULL,
  confidence REAL,
  bbox_json TEXT,
  corrected INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  analysis_id TEXT,
  builder_id TEXT,
  status TEXT DEFAULT 'draft',
  client_name TEXT,
  items_json TEXT,
  subtotal REAL DEFAULT 0,
  gst REAL DEFAULT 0,
  total REAL DEFAULT 0,
  notes TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  quote_id TEXT,
  builder_id TEXT,
  status TEXT DEFAULT 'pending',
  data_json TEXT,
  floor_plan_data TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  config_json TEXT DEFAULT '{}',
  connected INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);
`

let initialized = false

export async function initDb() {
  if (initialized) return
  const client = getDb()

  // Execute schema statements one by one
  const statements = SCHEMA.split(';').map(s => s.trim()).filter(Boolean)
  for (const stmt of statements) {
    await client.execute(stmt)
  }

  // Seed demo data if not exists
  const tenantCheck = await client.execute({
    sql: 'SELECT id FROM tenants WHERE id = ?',
    args: ['demo'],
  })

  if (tenantCheck.rows.length === 0) {
    await client.execute({
      sql: `INSERT INTO tenants (id, name, slug, settings_json) VALUES (?, ?, ?, ?)`,
      args: ['demo', 'Demo Company', 'demo', JSON.stringify({
        email: 'admin@quoflow.co.nz',
        phone: '+64 9 123 4567',
        address: 'Auckland, New Zealand',
        currency: 'NZD',
        gst_rate: 0.15,
        pricing: {
          'L Prehung Door': 285,
          'R Prehung Door': 285,
          'Double Prehung Door': 520,
          'Single Cavity Slider': 420,
          'Double Cavity Slider': 680,
          'Bi-Folding Door': 680,
          'Double Bi-Folding Door': 980,
          'Barn Wall Slider': 590,
          'Wardrobe 2-Door': 340,
          'Wardrobe 3-Door': 480,
          'Wardrobe 4-Door': 620,
        }
      })],
    })

    const adminHash = await bcrypt.hash('demo1234', 10)
    await client.execute({
      sql: `INSERT INTO users (id, tenant_id, role, email, name, password_hash) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [randomUUID(), 'demo', 'admin', 'admin@quoflow.co.nz', 'Admin User', adminHash],
    })

    const builderHash = await bcrypt.hash('demo1234', 10)
    await client.execute({
      sql: `INSERT INTO users (id, tenant_id, role, email, name, password_hash, location) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [randomUUID(), 'demo', 'builder', 'builder@acme.co.nz', 'Builder User', builderHash, 'Auckland'],
    })

    // Seed some demo quotes
    const demoQuotes = [
      { id: 'Q-2847', client: 'Acme Construction Ltd', components: 13, value: 5025.50, status: 'pending' },
      { id: 'Q-2846', client: 'Kiwi Homes Ltd', components: 21, value: 8340.00, status: 'sent' },
      { id: 'Q-2845', client: 'Pacific Builds', components: 8, value: 3120.00, status: 'accepted' },
      { id: 'Q-2844', client: 'Southland Construction', components: 17, value: 6750.00, status: 'draft' },
      { id: 'Q-2843', client: 'North Shore Homes', components: 31, value: 12480.00, status: 'accepted' },
    ]

    for (const q of demoQuotes) {
      const subtotal = q.value / 1.15
      const gst = q.value - subtotal
      await client.execute({
        sql: `INSERT INTO quotes (id, tenant_id, status, client_name, items_json, subtotal, gst, total, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          q.id, 'demo', q.status, q.client,
          JSON.stringify([{ name: 'Doors & Components', qty: q.components, unit_price: subtotal / q.components, total: subtotal }]),
          subtotal, gst, q.value,
          Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400 * 7),
        ],
      })
    }
  }

  initialized = true
}

export function query(sql, args = []) {
  const client = getDb()
  return client.execute({ sql, args })
}

export default getDb

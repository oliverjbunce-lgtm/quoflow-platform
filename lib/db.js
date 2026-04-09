import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import path from 'path'
import fs from 'fs'

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data')
try { fs.mkdirSync(DATA_DIR, { recursive: true }) } catch {}

let client

export function getDb() {
  if (!client) {
    const dbPath = path.join(DATA_DIR, 'quoflow.db')
    client = createClient({ url: `file:${dbPath}` })
  }
  return client
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    subscription_tier TEXT DEFAULT 'starter',
    settings_json TEXT DEFAULT '{}',
    created_at INTEGER DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    role TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    location TEXT,
    created_at INTEGER DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS invites (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    label TEXT,
    role TEXT DEFAULT 'builder',
    claimed INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    filename TEXT NOT NULL,
    page_count INTEGER,
    file_b64 TEXT,
    created_at INTEGER DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS analyses (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    page_num INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    model_type TEXT DEFAULT 'doors',
    raw_results_json TEXT,
    image_b64 TEXT,
    created_at INTEGER DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS detections (
    id TEXT PRIMARY KEY,
    analysis_id TEXT NOT NULL,
    class_name TEXT NOT NULL,
    confidence REAL,
    bbox_json TEXT,
    corrected INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS quotes (
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
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    quote_id TEXT,
    builder_id TEXT,
    status TEXT DEFAULT 'pending',
    data_json TEXT,
    floor_plan_data TEXT,
    created_at INTEGER DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS integrations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    config_json TEXT DEFAULT '{}',
    connected INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'door',
    active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    sku TEXT,
    width_mm INTEGER,
    height_mm INTEGER,
    core TEXT,
    finish TEXT,
    frame TEXT,
    handing TEXT,
    fire_rated INTEGER DEFAULT 0,
    price REAL NOT NULL DEFAULT 0,
    active INTEGER DEFAULT 1
  )`,
]

const DOOR_TYPES = [
  'Single Prehung - LH', 'Single Prehung - RH', 'Double Prehung',
  'Single Cavity Slider', 'Double Cavity Slider',
  'Bi-Fold Door', 'Double Bi-Fold Door', 'Barn / Wall Slider',
  'Wardrobe Slider 2-Door', 'Wardrobe Slider 3-Door',
  'Wardrobe Slider 4-Door', 'French Door',
]
const WIDTHS = [600, 700, 760, 810, 860, 910]
const HEIGHTS = [2040, 2100]
const CORES = ['Hollow Core', 'Solid Core']
const FINISHES = ['Raw', 'Primed', 'Pre-finished White']
const FRAMES = ['LJ&P Standard', 'Rebate Only', 'No Frame']
const BASE_PRICES = {
  'Single Prehung - LH': 285, 'Single Prehung - RH': 285, 'Double Prehung': 520,
  'Single Cavity Slider': 420, 'Double Cavity Slider': 680,
  'Bi-Fold Door': 680, 'Double Bi-Fold Door': 980, 'Barn / Wall Slider': 590,
  'Wardrobe Slider 2-Door': 340, 'Wardrobe Slider 3-Door': 480,
  'Wardrobe Slider 4-Door': 620, 'French Door': 560,
}

function calcPrice(type, width, height, core, finish, frame) {
  let price = BASE_PRICES[type] || 285
  if (width > 860) price += 90
  else if (width > 810) price += 60
  else if (width > 760) price += 30
  if (height === 2100) price += 20
  if (core === 'Solid Core') price += 80
  if (finish === 'Pre-finished White') price += 45
  else if (finish === 'Primed') price += 15
  if (frame === 'No Frame') price -= 40
  else if (frame === 'Rebate Only') price -= 20
  return Math.max(price, 50)
}

export async function seedCatalogue(tenantId) {
  const db = getDb()
  const existing = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM products WHERE tenant_id = ?', args: [tenantId] })
  if (existing.rows[0]?.cnt > 0) return

  for (const type of DOOR_TYPES) {
    const productId = `${tenantId}-${type.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`
    await db.execute({ sql: 'INSERT OR IGNORE INTO products (id, tenant_id, name, category) VALUES (?, ?, ?, ?)', args: [productId, tenantId, type, 'door'] })
    for (const width of WIDTHS) {
      for (const height of HEIGHTS) {
        for (const core of CORES) {
          for (const finish of FINISHES) {
            for (const frame of FRAMES) {
              const price = calcPrice(type, width, height, core, finish, frame)
              const sku = [type.replace(/[^a-z0-9]/gi,'').substring(0,8).toUpperCase(), width, height,
                core==='Hollow Core'?'HC':'SC', finish==='Raw'?'RW':finish==='Primed'?'PR':'PW',
                frame==='LJ&P Standard'?'LJ':frame==='Rebate Only'?'RO':'NF'].join('-')
              await db.execute({ sql: 'INSERT OR IGNORE INTO product_variants (id, product_id, sku, width_mm, height_mm, core, finish, frame, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [randomUUID(), productId, sku, width, height, core, finish, frame, price] })
            }
          }
        }
      }
    }
  }
}

let initialized = false

export async function initDb() {
  if (initialized) return
  const db = getDb()
  for (const stmt of SCHEMA_STATEMENTS) {
    await db.execute(stmt)
  }

  const tenantCheck = await db.execute({ sql: 'SELECT id FROM tenants WHERE id = ?', args: ['demo'] })
  if (tenantCheck.rows.length === 0) {
    await db.execute({ sql: `INSERT INTO tenants (id, name, slug, settings_json) VALUES (?, ?, ?, ?)`, args: ['demo', 'Demo Company', 'demo', JSON.stringify({ email: 'admin@quoflow.co.nz', phone: '+64 9 123 4567', address: 'Auckland, New Zealand', currency: 'NZD', gst_rate: 0.15 })] })
    const adminHash = await bcrypt.hash('demo1234', 10)
    await db.execute({ sql: `INSERT INTO users (id, tenant_id, role, email, name, password_hash) VALUES (?, ?, ?, ?, ?, ?)`, args: [randomUUID(), 'demo', 'admin', 'admin@quoflow.co.nz', 'Admin User', adminHash] })
    const builderHash = await bcrypt.hash('demo1234', 10)
    await db.execute({ sql: `INSERT INTO users (id, tenant_id, role, email, name, password_hash, location) VALUES (?, ?, ?, ?, ?, ?, ?)`, args: [randomUUID(), 'demo', 'builder', 'builder@acme.co.nz', 'Builder User', builderHash, 'Auckland'] })
    await seedCatalogue('demo')
  }

  initialized = true
}

export async function query(sql, args = []) {
  const db = getDb()
  const result = await db.execute({ sql, args })
  return { rows: result.rows, rowsAffected: result.rowsAffected }
}

export default getDb

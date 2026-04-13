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
    corrected INTEGER DEFAULT 0,
    x1 REAL,
    y1 REAL,
    x2 REAL,
    y2 REAL,
    raw_class TEXT,
    raw_confidence REAL,
    raw_bbox TEXT,
    is_user_added INTEGER DEFAULT 0,
    correction_type TEXT,
    corrected_at TEXT
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
    base_price REAL DEFAULT 0,
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
  `CREATE TABLE IF NOT EXISTS custom_items (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    default_price REAL,
    price_type TEXT DEFAULT 'fixed',
    active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    link TEXT,
    read INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS product_modifiers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    attribute TEXT NOT NULL,
    value TEXT NOT NULL,
    adjustment REAL NOT NULL DEFAULT 0,
    adjustment_type TEXT DEFAULT 'add',
    created_at INTEGER DEFAULT (unixepoch())
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

const DEFAULT_MODIFIERS = [
  { attribute: 'width_mm', value: '810', adjustment: 30, type: 'add' },
  { attribute: 'width_mm', value: '860', adjustment: 60, type: 'add' },
  { attribute: 'width_mm', value: '910', adjustment: 90, type: 'add' },
  { attribute: 'height_mm', value: '2100', adjustment: 20, type: 'add' },
  { attribute: 'core', value: 'Solid Core', adjustment: 80, type: 'add' },
  { attribute: 'core', value: 'Fire Rated (FD30)', adjustment: 150, type: 'add' },
  { attribute: 'finish', value: 'Primed', adjustment: 15, type: 'add' },
  { attribute: 'finish', value: 'Pre-finished White', adjustment: 45, type: 'add' },
  { attribute: 'frame', value: 'Rebate Only', adjustment: -20, type: 'add' },
  { attribute: 'frame', value: 'No Frame', adjustment: -40, type: 'add' },
]

export async function seedCatalogue(tenantId) {
  const db = getDb()
  const existing = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM products WHERE tenant_id = ?', args: [tenantId] })
  if (existing.rows[0]?.cnt > 0) return

  for (const type of DOOR_TYPES) {
    const productId = `${tenantId}-${type.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`
    const basePrice = BASE_PRICES[type] || 285
    await db.execute({ sql: 'INSERT OR IGNORE INTO products (id, tenant_id, name, category, base_price) VALUES (?, ?, ?, ?, ?)', args: [productId, tenantId, type, 'door', basePrice] })
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
    // Seed default modifiers for this product
    const modCheck = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM product_modifiers WHERE product_id = ?', args: [productId] })
    if (modCheck.rows[0]?.cnt === 0) {
      for (const mod of DEFAULT_MODIFIERS) {
        await db.execute({ sql: 'INSERT OR IGNORE INTO product_modifiers (id, tenant_id, product_id, attribute, value, adjustment, adjustment_type) VALUES (?, ?, ?, ?, ?, ?, ?)', args: [randomUUID(), tenantId, productId, mod.attribute, mod.value, mod.adjustment, mod.type] })
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

  // Migrations for existing databases
  try { await db.execute('ALTER TABLE products ADD COLUMN base_price REAL DEFAULT 0') } catch {}

  // Plans table migrations
  try { await db.execute('ALTER TABLE plans ADD COLUMN client_id TEXT') } catch {}
  try { await db.execute('ALTER TABLE plans ADD COLUMN client_name TEXT') } catch {}
  try { await db.execute('ALTER TABLE plans ADD COLUMN client_company TEXT') } catch {}
  try { await db.execute('ALTER TABLE plans ADD COLUMN original_filename TEXT') } catch {}
  try { await db.execute('ALTER TABLE plans ADD COLUMN file_path TEXT') } catch {}
  try { await db.execute('ALTER TABLE plans ADD COLUMN thumbnail_b64 TEXT') } catch {}
  try { await db.execute("ALTER TABLE plans ADD COLUMN review_status TEXT DEFAULT 'pending'") } catch {}
  try { await db.execute('ALTER TABLE plans ADD COLUMN notes TEXT') } catch {}

  // Detections table migrations
  try { await db.execute('ALTER TABLE detections ADD COLUMN corrected_class TEXT') } catch {}
  try { await db.execute('ALTER TABLE detections ADD COLUMN specs_json TEXT') } catch {}
  try { await db.execute('ALTER TABLE detections ADD COLUMN is_correction INTEGER DEFAULT 0') } catch {}
  try { await db.execute('ALTER TABLE detections ADD COLUMN deleted INTEGER DEFAULT 0') } catch {}

  // Training flywheel migrations
  const detCols = await db.execute('PRAGMA table_info(detections)')
  const detColNames = detCols.rows.map(r => r.name)
  const detMigrations = [
    ['x1', 'ALTER TABLE detections ADD COLUMN x1 REAL'],
    ['y1', 'ALTER TABLE detections ADD COLUMN y1 REAL'],
    ['x2', 'ALTER TABLE detections ADD COLUMN x2 REAL'],
    ['y2', 'ALTER TABLE detections ADD COLUMN y2 REAL'],
    ['raw_class', 'ALTER TABLE detections ADD COLUMN raw_class TEXT'],
    ['raw_confidence', 'ALTER TABLE detections ADD COLUMN raw_confidence REAL'],
    ['raw_bbox', 'ALTER TABLE detections ADD COLUMN raw_bbox TEXT'],
    ['is_user_added', 'ALTER TABLE detections ADD COLUMN is_user_added INTEGER DEFAULT 0'],
    ['correction_type', 'ALTER TABLE detections ADD COLUMN correction_type TEXT'],
    ['corrected_at', 'ALTER TABLE detections ADD COLUMN corrected_at TEXT'],
  ]
  for (const [col, sql] of detMigrations) {
    if (!detColNames.includes(col)) await db.execute(sql)
  }

  // Onboarding migration
  const userCols = await db.execute('PRAGMA table_info(users)')
  const userColNames = userCols.rows.map(r => r.name)
  if (!userColNames.includes('onboarding_completed')) {
    await db.execute('ALTER TABLE users ADD COLUMN onboarding_completed INTEGER DEFAULT 0')
  }

  // Quotes table migration
  try { await db.execute('ALTER TABLE quotes ADD COLUMN plan_id TEXT') } catch {}

  // Clients table
  await db.execute(`CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    notes TEXT,
    created_at INTEGER DEFAULT (unixepoch())
  )`)

  // Seed demo client
  await db.execute({ sql: `INSERT OR IGNORE INTO clients (id, tenant_id, name, company, email, phone) VALUES ('client-demo-1', 'demo', 'James Builder', 'Acme Construction Ltd', 'james@acme.co.nz', '021 555 1234')`, args: [] })

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

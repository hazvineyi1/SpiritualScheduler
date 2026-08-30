import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

// When DATABASE_URL isn't set (e.g. local dev without a database attached),
// db/pool are left undefined and storage.ts falls back to pure in-memory
// behavior — nothing here throws at import time.
export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : undefined;

export const db = pool ? drizzle(pool, { schema }) : undefined;

// Idempotent startup migration — creates tables if they don't exist yet.
// Kept as plain SQL (rather than drizzle-kit push) so it can safely run as
// part of normal server boot with no extra deploy step or CLI dependency.
export async function ensureSchema() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS healers (
      id SERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      tagline TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      whatsapp TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      header_image_url TEXT NOT NULL DEFAULT '',
      zinatha_verified BOOLEAN NOT NULL DEFAULT false,
      shop_enabled BOOLEAN NOT NULL DEFAULT true,
      readings JSON NOT NULL DEFAULT '[]',
      products JSON NOT NULL DEFAULT '[]',
      availability JSON,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS appointments (
      id SERIAL PRIMARY KEY,
      healer_id INTEGER NOT NULL,
      reading_id INTEGER,
      reading_name TEXT NOT NULL,
      category TEXT NOT NULL,
      format TEXT NOT NULL,
      datetime TEXT,
      duration INTEGER,
      question_count INTEGER,
      status TEXT NOT NULL DEFAULT 'pending_verification',
      whatsapp_number TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      payment_amount INTEGER NOT NULL,
      payment_reference TEXT,
      client_name TEXT,
      intake_answers JSON,
      session_link TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_appointments_healer_id ON appointments (healer_id);
    ALTER TABLE healers ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT '';
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      contact TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '';
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS whatsapp TEXT NOT NULL DEFAULT '';
    CREATE TABLE IF NOT EXISTS feedback (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS visits (
      id SERIAL PRIMARY KEY,
      path TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT '',
      started_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    );
  `);
}

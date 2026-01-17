import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

// Open database synchronously
const expo = openDatabaseSync('pesalog.db');

// Create drizzle database instance
export const db = drizzle(expo, { schema });

// Export schema for convenience
export * from './schema';

// Database initialization function
export async function initializeDatabase(): Promise<void> {
  // Create tables if they don't exist
  expo.execSync(`
    -- Raw SMS table
    CREATE TABLE IF NOT EXISTS raw_sms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender TEXT NOT NULL,
      body TEXT NOT NULL,
      received_at INTEGER NOT NULL,
      parsed_at INTEGER,
      parse_status TEXT DEFAULT 'pending',
      parse_error TEXT,
      linked_ref_code TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );

    -- Categories table
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      parent_id INTEGER,
      is_system INTEGER DEFAULT 0,
      budget INTEGER,
      created_at INTEGER DEFAULT (unixepoch())
    );

    -- Transactions table
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      primary_ref_code TEXT NOT NULL,
      secondary_ref_code TEXT,
      type TEXT NOT NULL,
      source TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT DEFAULT 'KES',
      fee INTEGER DEFAULT 0,
      counterparty TEXT,
      counterparty_phone TEXT,
      counterparty_account TEXT,
      category_id INTEGER REFERENCES categories(id),
      is_auto_classified INTEGER DEFAULT 0,
      confidence REAL,
      balance_after INTEGER,
      transaction_date INTEGER NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      raw_sms_id INTEGER REFERENCES raw_sms(id),
      status TEXT DEFAULT 'pending_classification',
      notes TEXT
    );

    -- Merchant mappings table
    CREATE TABLE IF NOT EXISTS merchant_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_pattern TEXT NOT NULL,
      match_type TEXT DEFAULT 'contains',
      category_id INTEGER NOT NULL REFERENCES categories(id),
      learned_from_transaction_id INTEGER,
      times_matched INTEGER DEFAULT 1,
      last_matched_at INTEGER,
      is_user_created INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch())
    );

    -- Debts table
    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      source TEXT,
      principal_amount INTEGER NOT NULL,
      fees_charged INTEGER DEFAULT 0,
      interest_rate REAL,
      total_outstanding INTEGER NOT NULL,
      last_updated_amount INTEGER,
      created_date INTEGER NOT NULL,
      due_date INTEGER,
      counterparty TEXT,
      counterparty_phone TEXT,
      status TEXT DEFAULT 'active',
      original_transaction_id INTEGER REFERENCES transactions(id),
      notes TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );

    -- Debt payments table
    CREATE TABLE IF NOT EXISTS debt_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      debt_id INTEGER NOT NULL REFERENCES debts(id),
      transaction_id INTEGER REFERENCES transactions(id),
      amount INTEGER NOT NULL,
      payment_date INTEGER NOT NULL,
      notes TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );

    -- Related messages table
    CREATE TABLE IF NOT EXISTS related_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      primary_sms_id INTEGER NOT NULL REFERENCES raw_sms(id),
      secondary_sms_id INTEGER NOT NULL REFERENCES raw_sms(id),
      ref_code TEXT NOT NULL,
      transaction_id INTEGER REFERENCES transactions(id),
      created_at INTEGER DEFAULT (unixepoch())
    );

    -- User settings table
    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT,
      updated_at INTEGER DEFAULT (unixepoch())
    );

    -- Notification queue table
    CREATE TABLE IF NOT EXISTS notification_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      data TEXT,
      transaction_id INTEGER REFERENCES transactions(id),
      debt_id INTEGER REFERENCES debts(id),
      scheduled_for INTEGER,
      sent_at INTEGER,
      status TEXT DEFAULT 'pending',
      created_at INTEGER DEFAULT (unixepoch())
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
    CREATE INDEX IF NOT EXISTS idx_transactions_ref_code ON transactions(primary_ref_code);
    CREATE INDEX IF NOT EXISTS idx_raw_sms_ref_code ON raw_sms(linked_ref_code);
    CREATE INDEX IF NOT EXISTS idx_merchant_pattern ON merchant_mappings(merchant_pattern);
    CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
  `);
}

// Helper to reset database (for development)
export function resetDatabase(): void {
  expo.execSync(`
    DROP TABLE IF EXISTS notification_queue;
    DROP TABLE IF EXISTS related_messages;
    DROP TABLE IF EXISTS debt_payments;
    DROP TABLE IF EXISTS debts;
    DROP TABLE IF EXISTS merchant_mappings;
    DROP TABLE IF EXISTS transactions;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS raw_sms;
    DROP TABLE IF EXISTS user_settings;
  `);
}

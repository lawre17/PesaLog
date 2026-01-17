import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ============ RAW SMS STORAGE ============
export const rawSms = sqliteTable('raw_sms', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sender: text('sender').notNull(),
  body: text('body').notNull(),
  receivedAt: integer('received_at', { mode: 'timestamp' }).notNull(),
  parsedAt: integer('parsed_at', { mode: 'timestamp' }),
  parseStatus: text('parse_status', {
    enum: ['pending', 'parsed', 'failed', 'ignored'],
  }).default('pending'),
  parseError: text('parse_error'),
  linkedRefCode: text('linked_ref_code'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`
  ),
});

// ============ CATEGORIES TABLE ============
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  parentId: integer('parent_id'),
  isSystem: integer('is_system', { mode: 'boolean' }).default(false),
  budget: integer('budget'), // Monthly budget in cents
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`
  ),
});

// ============ TRANSACTIONS TABLE ============
export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // Reference codes (for linking related messages)
  primaryRefCode: text('primary_ref_code').notNull(),
  secondaryRefCode: text('secondary_ref_code'),

  // Transaction details
  type: text('type', {
    enum: ['income', 'expense', 'transfer', 'debt', 'debt_repayment'],
  }).notNull(),
  source: text('source', {
    enum: ['mpesa', 'bank', 'card', 'cash_manual'],
  }).notNull(),

  // Amount handling (store in smallest unit - cents)
  amount: integer('amount').notNull(),
  currency: text('currency').default('KES'),
  fee: integer('fee').default(0),

  // Parties involved
  counterparty: text('counterparty'),
  counterpartyPhone: text('counterparty_phone'),
  counterpartyAccount: text('counterparty_account'),

  // Categorization
  categoryId: integer('category_id').references(() => categories.id),
  isAutoClassified: integer('is_auto_classified', { mode: 'boolean' }).default(
    false
  ),
  confidence: real('confidence'),

  // Balance tracking
  balanceAfter: integer('balance_after'),

  // Timestamps
  transactionDate: integer('transaction_date', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`
  ),

  // Raw SMS storage for audit
  rawSmsId: integer('raw_sms_id').references(() => rawSms.id),

  // Status
  status: text('status', {
    enum: ['pending_classification', 'classified', 'archived', 'duplicate'],
  }).default('pending_classification'),

  // Notes
  notes: text('notes'),
});

// ============ MERCHANT MAPPINGS (for auto-learning) ============
export const merchantMappings = sqliteTable('merchant_mappings', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // Matching criteria
  merchantPattern: text('merchant_pattern').notNull(),
  matchType: text('match_type', {
    enum: ['exact', 'contains', 'starts_with', 'regex'],
  }).default('contains'),

  // Classification
  categoryId: integer('category_id')
    .references(() => categories.id)
    .notNull(),

  // Learning metadata
  learnedFromTransactionId: integer('learned_from_transaction_id'),
  timesMatched: integer('times_matched').default(1),
  lastMatchedAt: integer('last_matched_at', { mode: 'timestamp' }),

  // User control
  isUserCreated: integer('is_user_created', { mode: 'boolean' }).default(true),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),

  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`
  ),
});

// ============ DEBTS TABLE ============
export const debts = sqliteTable('debts', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // Debt identification
  type: text('type', {
    enum: ['fuliza', 'loan', 'owed_to_person', 'owed_by_person'],
  }).notNull(),
  source: text('source'), // Fuliza, KCB M-Pesa, etc.

  // Original debt
  principalAmount: integer('principal_amount').notNull(),
  feesCharged: integer('fees_charged').default(0),
  interestRate: real('interest_rate'), // Annual rate as decimal

  // Current state
  totalOutstanding: integer('total_outstanding').notNull(),
  lastUpdatedAmount: integer('last_updated_amount'),

  // Dates
  createdDate: integer('created_date', { mode: 'timestamp' }).notNull(),
  dueDate: integer('due_date', { mode: 'timestamp' }),

  // Counterparty (for personal debts)
  counterparty: text('counterparty'),
  counterpartyPhone: text('counterparty_phone'),

  // Status
  status: text('status', {
    enum: ['active', 'partially_paid', 'paid', 'overdue', 'written_off'],
  }).default('active'),

  // Linking
  originalTransactionId: integer('original_transaction_id').references(
    () => transactions.id
  ),

  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`
  ),
});

// ============ DEBT PAYMENTS TABLE ============
export const debtPayments = sqliteTable('debt_payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  debtId: integer('debt_id')
    .references(() => debts.id)
    .notNull(),
  transactionId: integer('transaction_id').references(() => transactions.id),
  amount: integer('amount').notNull(),
  paymentDate: integer('payment_date', { mode: 'timestamp' }).notNull(),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`
  ),
});

// ============ RELATED MESSAGES TABLE ============
export const relatedMessages = sqliteTable('related_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  primarySmsId: integer('primary_sms_id')
    .references(() => rawSms.id)
    .notNull(),
  secondarySmsId: integer('secondary_sms_id')
    .references(() => rawSms.id)
    .notNull(),
  refCode: text('ref_code').notNull(),
  transactionId: integer('transaction_id').references(() => transactions.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`
  ),
});

// ============ USER SETTINGS ============
export const userSettings = sqliteTable('user_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`
  ),
});

// ============ NOTIFICATION QUEUE ============
export const notificationQueue = sqliteTable('notification_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type', {
    enum: [
      'classify_transaction',
      'debt_due',
      'recurring_expected',
      'budget_alert',
    ],
  }).notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  data: text('data'), // JSON payload
  transactionId: integer('transaction_id').references(() => transactions.id),
  debtId: integer('debt_id').references(() => debts.id),
  scheduledFor: integer('scheduled_for', { mode: 'timestamp' }),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  status: text('status', {
    enum: ['pending', 'sent', 'dismissed', 'actioned'],
  }).default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`
  ),
});

// Type exports for use in services
export type RawSms = typeof rawSms.$inferSelect;
export type NewRawSms = typeof rawSms.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type MerchantMapping = typeof merchantMappings.$inferSelect;
export type NewMerchantMapping = typeof merchantMappings.$inferInsert;

export type Debt = typeof debts.$inferSelect;
export type NewDebt = typeof debts.$inferInsert;

export type DebtPayment = typeof debtPayments.$inferSelect;
export type NewDebtPayment = typeof debtPayments.$inferInsert;

export type RelatedMessage = typeof relatedMessages.$inferSelect;
export type NewRelatedMessage = typeof relatedMessages.$inferInsert;

export type UserSetting = typeof userSettings.$inferSelect;
export type NewUserSetting = typeof userSettings.$inferInsert;

export type NotificationQueueItem = typeof notificationQueue.$inferSelect;
export type NewNotificationQueueItem = typeof notificationQueue.$inferInsert;

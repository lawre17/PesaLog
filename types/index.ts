/**
 * PesaLog Type Definitions
 */

// Re-export database types
export type {
  RawSms,
  NewRawSms,
  Category,
  NewCategory,
  Transaction,
  NewTransaction,
  MerchantMapping,
  NewMerchantMapping,
  Debt,
  NewDebt,
  DebtPayment,
  NewDebtPayment,
  RelatedMessage,
  NewRelatedMessage,
  UserSetting,
  NewUserSetting,
  NotificationQueueItem,
  NewNotificationQueueItem,
} from '@/db/schema';

// Transaction type constants
export type TransactionType =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'debt'
  | 'debt_repayment';

export type TransactionSource = 'mpesa' | 'bank' | 'card' | 'cash_manual';

export type TransactionStatus =
  | 'pending_classification'
  | 'classified'
  | 'archived'
  | 'duplicate';

// Debt type constants
export type DebtType = 'fuliza' | 'loan' | 'owed_to_person' | 'owed_by_person';

export type DebtStatus =
  | 'active'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'written_off';

// SMS Parsing types
export interface ParsedSmsBase {
  refCode: string;
  amount: number; // in cents
  currency: string;
  transactionDate: Date;
  rawBody: string;
}

export interface ParsedMpesaSend extends ParsedSmsBase {
  type: 'mpesa_send';
  recipient: string;
  phone?: string;
  balance?: number;
  fee?: number;
}

export interface ParsedMpesaPaybill extends ParsedSmsBase {
  type: 'mpesa_paybill';
  paybillName: string;
  account: string;
  balance?: number;
  fee?: number;
}

export interface ParsedMpesaTill extends ParsedSmsBase {
  type: 'mpesa_till';
  tillName: string;
  tillNumber: string;
}

export interface ParsedMpesaAirtime extends ParsedSmsBase {
  type: 'mpesa_airtime';
  balance?: number;
}

export interface ParsedMpesaAgent extends ParsedSmsBase {
  type: 'mpesa_agent';
  agentName: string;
  balance?: number;
}

export interface ParsedMpesaReceived extends ParsedSmsBase {
  type: 'mpesa_received';
  sender: string;
  phone?: string;
}

export interface ParsedBankTransfer extends ParsedSmsBase {
  type: 'bank_transfer';
  sender: string;
  bankRef?: string;
}

export interface ParsedBankConfirmation extends ParsedSmsBase {
  type: 'bank_confirmation';
  business: string;
  account: string;
}

export interface ParsedCardTransaction extends ParsedSmsBase {
  type: 'card_transaction';
  bank: string;
  cardMask: string;
  merchant: string;
  balance?: number;
  balanceCurrency?: string;
}

export interface ParsedFuliza extends ParsedSmsBase {
  type: 'fuliza';
  principal: number; // in cents
  fee: number; // in cents
  totalOutstanding: number; // in cents
  dueDate: Date;
}

export interface ParsedFulizaRepayment extends ParsedSmsBase {
  type: 'fuliza_repayment';
  amountRepaid: number; // in cents
}

export interface ParsedFulizaAutoRepayment extends ParsedSmsBase {
  type: 'fuliza_auto_repayment';
  amountRepaid: number; // in cents
  paymentType: 'partially' | 'fully';
  availableLimit: number; // in cents
  balance: number; // M-PESA balance after repayment
}

export interface ParsedMshwariTransfer extends ParsedSmsBase {
  type: 'mshwari_transfer';
  shwariBalance?: number; // M-Shwari balance after transfer
  mpesaBalance?: number; // M-Pesa balance after transfer
}

export type ParsedSms =
  | ParsedMpesaSend
  | ParsedMpesaPaybill
  | ParsedMpesaTill
  | ParsedMpesaAirtime
  | ParsedMpesaAgent
  | ParsedMpesaReceived
  | ParsedBankTransfer
  | ParsedBankConfirmation
  | ParsedCardTransaction
  | ParsedFuliza
  | ParsedFulizaRepayment
  | ParsedFulizaAutoRepayment
  | ParsedMshwariTransfer;

// Classification types
export interface ClassificationResult {
  categoryId: number;
  confidence: number;
  mappingId?: number;
  isAutoClassified: boolean;
}

export interface ClassificationPrompt {
  transactionId: number;
  amount: number;
  counterparty: string;
  counterpartyPhone?: string;
  isPerson: boolean; // Has phone number = likely a person
  suggestedCategories?: number[];
}

// Debt summary types
export interface DebtSummary {
  fuliza: {
    outstanding: number;
    dueDate?: Date;
    isOverdue: boolean;
  };
  owedByOthers: {
    total: number;
    count: number;
    items: Array<{
      id: number;
      counterparty: string;
      amount: number;
    }>;
  };
  owedToOthers: {
    total: number;
    count: number;
    items: Array<{
      id: number;
      counterparty: string;
      amount: number;
    }>;
  };
}

// Statistics types
export interface PeriodStats {
  period: 'day' | 'week' | 'month' | 'year';
  startDate: Date;
  endDate: Date;
  totalIncome: number;
  totalExpenses: number;
  netFlow: number;
  transactionCount: number;
  categoryBreakdown: Array<{
    categoryId: number;
    categoryName: string;
    amount: number;
    percentage: number;
    color: string;
  }>;
}

// Related messages types
export interface RelatedMessageGroup {
  merged: MergedTransactionData;
  originalMessages: Array<{
    id: number;
    sender: string;
    body: string;
  }>;
}

export interface MergedTransactionData {
  refCode: string;
  amount: number;
  fee?: number;
  counterparty: string;
  account?: string;
  transactionDate: Date;
  sources: Array<{
    smsId: number;
    sender: string;
  }>;
}

// Notification types
export type NotificationType =
  | 'classify_transaction'
  | 'debt_due'
  | 'recurring_expected'
  | 'budget_alert';

export interface NotificationData {
  type: NotificationType;
  transactionId?: number;
  debtId?: number;
  patternId?: number;
  notificationId: number;
}

// App settings
export interface AppSettings {
  hasCompletedOnboarding: boolean;
  notificationsEnabled: boolean;
  smsListenerEnabled: boolean;
  darkModeOverride?: 'light' | 'dark' | 'system';
  defaultCurrency: string;
}

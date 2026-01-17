/**
 * SMS Parsing Patterns for Kenyan Financial Messages
 * Supports: M-Pesa, Bank Transfers, Card Transactions, Fuliza
 */

// Known financial SMS senders
export const FINANCIAL_SENDERS = [
  'MPESA',
  'M-PESA',
  'SAFARICOM',
  'KCB',
  'KCBMPESA',
  'EQUITEL',
  'EQUITY',
  'COOP',
  'COOPERATIVE',
  'CO-OPERATIVE',
  'ABSA',
  'NCBA',
  'STANBIC',
  'DTB',
  'FAMILY',
  'I&M',
  'SIDIAN',
  'HF',
  'ECOBANK',
  'STANDARD',
  'PRIME',
  'CREDIT',
] as const;

// Sender type mapping
export function getSenderType(
  sender: string
): 'mpesa' | 'bank' | 'card' | 'unknown' {
  const normalized = sender.toUpperCase().trim();

  if (normalized.includes('MPESA') || normalized.includes('M-PESA')) {
    return 'mpesa';
  }

  if (
    FINANCIAL_SENDERS.some(
      (s) => normalized.includes(s) && !normalized.includes('MPESA')
    )
  ) {
    return 'bank';
  }

  return 'unknown';
}

// Check if sender is a financial institution
export function isFinancialSender(sender: string): boolean {
  const normalized = sender.toUpperCase().trim();
  return FINANCIAL_SENDERS.some((s) => normalized.includes(s));
}

// ============ REGEX PATTERNS ============

/**
 * M-Pesa Send Money Pattern
 * Example: "UAH3H46D7H Confirmed. Ksh330.00 sent to EDWARD KAMAU 0718824980 on 17/1/26 at 5:34 AM..."
 */
export const MPESA_SEND_PATTERN =
  /^(?<refCode>[A-Z0-9]{10})\s+Confirmed\.\s+Ksh\s*(?<amount>[\d,]+(?:\.\d{2})?)\s+sent\s+to\s+(?<recipient>.+?)\s+(?<phone>0\d{9})?\s*on\s+(?<date>\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(?<time>\d{1,2}:\d{2}\s*[AP]M)\.?\s*(?:New\s+M-PESA\s+balance\s+is\s+Ksh\s*(?<balance>[\d,]+(?:\.\d{2})?))?\.?\s*(?:Transaction\s+cost,?\s*Ksh\s*(?<fee>[\d,]+(?:\.\d{2})?))?/i;

/**
 * M-Pesa Paybill/Buy Goods Pattern
 * Example: "UAF3H3ZJNR Confirmed. Ksh670.00 sent to Co-operative Bank Money Transfer for account 1053773..."
 */
export const MPESA_PAYBILL_PATTERN =
  /^(?<refCode>[A-Z0-9]{10})\s+Confirmed\.\s+Ksh\s*(?<amount>[\d,]+(?:\.\d{2})?)\s+sent\s+to\s+(?<paybillName>.+?)\s+for\s+account\s+(?<account>[\w]+)\s+on\s+(?<date>\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(?<time>\d{1,2}:\d{2}\s*[AP]M)\.?\s*(?:New\s+M-PESA\s+balance\s+is\s+Ksh\s*(?<balance>[\d,]+(?:\.\d{2})?))?\.?\s*(?:Transaction\s+cost,?\s*Ksh\s*(?<fee>[\d,]+(?:\.\d{2})?))?/i;

/**
 * M-Pesa Received Money Pattern
 * Example: "UAH3H46D7H Confirmed. You have received Ksh1,000.00 from JOHN DOE 0712345678..."
 */
export const MPESA_RECEIVED_PATTERN =
  /^(?<refCode>[A-Z0-9]{10})\s+Confirmed\.\s*You\s+have\s+received\s+Ksh\s*(?<amount>[\d,]+(?:\.\d{2})?)\s+from\s+(?<sender>.+?)\s+(?<phone>0\d{9})?\s*on\s+(?<date>\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(?<time>\d{1,2}:\d{2}\s*[AP]M)/i;

/**
 * Bank Transfer to M-Pesa Pattern
 * Example: "EVITECH COMPUTER SOLUTION LTD has transferred KES 37500.00 to your MPESA..."
 */
export const BANK_TRANSFER_PATTERN =
  /^(?<sender>.+?)\s+has\s+transferred\s+KES\s+(?<amount>[\d,]+(?:\.\d{2})?)\s+to\s+your\s+MPESA\.\s*(?:Please\s+await\s+MPESA\s+notification\.)?\s*MPESA\s+ref\s+is\s+(?<mpesaRef>[A-Z0-9]+)\s*(?:&?\s*Bank\s+transaction\s+ref\s+is\s+(?<bankRef>\d+))?/i;

/**
 * Bank Confirmation Pattern (related message)
 * Example: "Dear LAWRENCE WAINAINA, you have sent Ksh. 670.0 to LUGXURIOUS T/A LUGXURIOUS PMG LOUNGE..."
 */
export const BANK_CONFIRMATION_PATTERN =
  /^Dear\s+(?<recipient>.+?),\s*you\s+have\s+sent\s+Ksh\.?\s*(?<amount>[\d,]+(?:\.\d+)?)\s+to\s+(?<business>.+?)\s+for\s+(?<account>[\w]+)\s+on\s+(?<date>\d{2}\/\d{2}\/\d{4})\s+at\s+(?<time>[\d:]+)\.\s*MPESA\s+Ref\.\s*(?<refCode>[A-Z0-9]+)/i;

/**
 * Card Transaction Pattern
 * Example: "USD 19.00 transaction made on KCB card 5249***5733 at LARAVEL FORGE on 15/01/2026 16:08pm..."
 */
export const CARD_TRANSACTION_PATTERN =
  /^(?<currency>[A-Z]{3})\s+(?<amount>[\d,]+(?:\.\d{2})?)\s+transaction\s+made\s+on\s+(?<bank>\w+)\s+card\s+(?<cardMask>\d{4}\*{2,3}\d{4})\s+at\s+(?<merchant>.+?)\s+on\s+(?<date>\d{2}\/\d{2}\/\d{4})\s+(?<time>\d{2}:\d{2}(?:am|pm)?),?\s*(?:Avail\s+balance\s+(?<balanceCurrency>[A-Z]{3})\s+(?<balance>[\d,]+(?:\.\d{2})?))?/i;

/**
 * Fuliza Overdraft Pattern
 * Example: "UAH3H46G3P Confirmed. Fuliza M-Pesa amount is Ksh 716.62. Access Fee charged Ksh 7.17..."
 */
export const FULIZA_PATTERN =
  /^(?<refCode>[A-Z0-9]{10})\s+Confirmed\.\s+Fuliza\s+M-Pesa\s+amount\s+is\s+Ksh\s*(?<principal>[\d,]+(?:\.\d{2})?)\.\s*Access\s+Fee\s+charged\s+Ksh\s*(?<fee>[\d,]+(?:\.\d{2})?)\.\s*Total\s+Fuliza\s+M-Pesa\s+outstanding\s+amount\s+is\s+Ksh\s*(?<totalOutstanding>[\d,]+(?:\.\d{2})?)\s+due\s+on\s+(?<dueDate>\d{2}\/\d{2}\/\d{2})/i;

/**
 * Fuliza Repayment Pattern
 * Example: "UAH3H46G3Q Confirmed. Your Fuliza M-Pesa loan of Ksh 500.00 has been repaid..."
 */
export const FULIZA_REPAYMENT_PATTERN =
  /^(?<refCode>[A-Z0-9]{10})\s+Confirmed\.\s*(?:Your\s+)?Fuliza\s+M-Pesa\s+(?:loan\s+)?(?:of\s+)?Ksh\s*(?<amount>[\d,]+(?:\.\d{2})?)\s+has\s+been\s+(?:repaid|paid)/i;

/**
 * M-Pesa Balance Check Pattern
 * For detecting balance updates without transactions
 */
export const MPESA_BALANCE_PATTERN =
  /(?:New\s+)?M-PESA\s+balance\s+is\s+Ksh\s*(?<balance>[\d,]+(?:\.\d{2})?)/i;

// ============ PATTERN TYPES ============

export type SmsPatternType =
  | 'mpesa_send'
  | 'mpesa_paybill'
  | 'mpesa_received'
  | 'bank_transfer'
  | 'bank_confirmation'
  | 'card_transaction'
  | 'fuliza'
  | 'fuliza_repayment'
  | 'unknown';

// Pattern matching order (most specific first)
export const PATTERNS: Array<{
  type: SmsPatternType;
  pattern: RegExp;
  transactionType: 'income' | 'expense' | 'debt' | 'debt_repayment' | 'transfer';
}> = [
  { type: 'fuliza', pattern: FULIZA_PATTERN, transactionType: 'debt' },
  {
    type: 'fuliza_repayment',
    pattern: FULIZA_REPAYMENT_PATTERN,
    transactionType: 'debt_repayment',
  },
  {
    type: 'mpesa_received',
    pattern: MPESA_RECEIVED_PATTERN,
    transactionType: 'income',
  },
  {
    type: 'bank_transfer',
    pattern: BANK_TRANSFER_PATTERN,
    transactionType: 'income',
  },
  {
    type: 'mpesa_paybill',
    pattern: MPESA_PAYBILL_PATTERN,
    transactionType: 'expense',
  },
  { type: 'mpesa_send', pattern: MPESA_SEND_PATTERN, transactionType: 'expense' },
  {
    type: 'bank_confirmation',
    pattern: BANK_CONFIRMATION_PATTERN,
    transactionType: 'expense',
  },
  {
    type: 'card_transaction',
    pattern: CARD_TRANSACTION_PATTERN,
    transactionType: 'expense',
  },
];

// Reference code extraction pattern
export const REF_CODE_PATTERN = /\b([A-Z]{2,3}[A-Z0-9]{7,8})\b/g;

// Extract all reference codes from SMS body
export function extractRefCodes(body: string): string[] {
  const matches = body.match(REF_CODE_PATTERN);
  return matches ? [...new Set(matches)] : [];
}

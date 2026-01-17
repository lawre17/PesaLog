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
 * M-Pesa Send Money Pattern (supports both "sent to" and "paid to")
 * Example: "UAH3H46D7H Confirmed. Ksh330.00 sent to EDWARD KAMAU 0718824980 on 17/1/26 at 5:34 AM..."
 * Example: "UA23H2THZT Confirmed. Ksh400.00 paid to DAVID HUNGIH. on 2/1/26 at 1:49 PM..."
 */
export const MPESA_SEND_PATTERN =
  /^(?<refCode>[A-Z0-9]{10})\s+[Cc]onfirmed\.\s+Ksh\s*(?<amount>[\d,]+(?:\.\d{2})?)\s+(?:sent|paid)\s+to\s+(?<recipient>.+?)\.?\s+(?:(?<phone>0\d{9})\s+)?on\s+(?<date>\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(?<time>\d{1,2}:\d{2}\s*[AP]M)\.?\s*(?:New\s+M-PESA\s+balance\s+is\s+Ksh\s*(?<balance>[\d,]+(?:\.\d{2})?))?\.?\s*(?:Transaction\s+cost,?\s*Ksh\s*(?<fee>[\d,]+(?:\.\d{2})?))?/i;

/**
 * M-Pesa Paybill/Buy Goods Pattern
 * Example: "UAF3H3ZJNR Confirmed. Ksh670.00 sent to Co-operative Bank Money Transfer for account 1053773..."
 */
export const MPESA_PAYBILL_PATTERN =
  /^(?<refCode>[A-Z0-9]{10})\s+Confirmed\.\s+Ksh\s*(?<amount>[\d,]+(?:\.\d{2})?)\s+sent\s+to\s+(?<paybillName>.+?)\s+for\s+account\s+(?<account>[\w]+)\s+on\s+(?<date>\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(?<time>\d{1,2}:\d{2}\s*[AP]M)\.?\s*(?:New\s+M-PESA\s+balance\s+is\s+Ksh\s*(?<balance>[\d,]+(?:\.\d{2})?))?\.?\s*(?:Transaction\s+cost,?\s*Ksh\s*(?<fee>[\d,]+(?:\.\d{2})?))?/i;

/**
 * M-Pesa Paybill Alternate Pattern (merchant-initiated confirmation)
 * Example: "Confirmed. Your M-PESA transaction UA33H2XY8R of Ksh 5000.00 to KCB Paybill A/C for account 5249110087145733 on 03/01/2026 at 07:41 PM has been received."
 */
export const MPESA_PAYBILL_ALT_PATTERN =
  /Confirmed\.\s*Your\s+M-PESA\s+transaction\s+(?<refCode>[A-Z0-9]{10})\s+of\s+Ksh\s*(?<amount>[\d,]+(?:\.\d{2})?)\s+to\s+(?<paybillName>.+?)\s+(?:Paybill\s+)?(?:A\/C\s+)?for\s+account\s+(?<account>[\w]+)\s+on\s+(?<date>\d{2}[\/-]\d{2}[\/-]\d{2,4})\s+at\s+(?<time>\d{1,2}:\d{2}\s*[AP]M)/i;

/**
 * M-Pesa Till/Buy Goods Pattern (merchant-initiated)
 * Example: "Confirmed. Payment of KES. 150.00 to QUICK URBAN MINIMART Till No. 0766109079 has been received. Ref. UA33H2X9IB on 03-01-2026 at 16:30."
 */
export const MPESA_TILL_PATTERN =
  /Confirmed\.\s*Payment\s+of\s+KES\.?\s*(?<amount>[\d,]+(?:\.\d{2})?)\s+to\s+(?<tillName>.+?)\s+Till\s+No\.?\s*(?<tillNumber>\d+)\s+has\s+been\s+received\.\s*Ref\.?\s*(?<refCode>[A-Z0-9]{10})\s+on\s+(?<date>\d{2}-\d{2}-\d{4})\s+at\s+(?<time>\d{2}:\d{2})/i;

/**
 * M-Pesa Airtime Purchase Pattern
 * Example: "UA23H2U42X confirmed.You bought Ksh100.00 of airtime on 2/1/26 at 4:15 PM.New M-PESA balance is Ksh0.00."
 */
export const MPESA_AIRTIME_PATTERN =
  /^(?<refCode>[A-Z0-9]{10})\s+[Cc]onfirmed\.?\s*You\s+bought\s+Ksh\s*(?<amount>[\d,]+(?:\.\d{2})?)\s+of\s+airtime\s+on\s+(?<date>\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(?<time>\d{1,2}:\d{2}\s*[AP]M)\.?\s*(?:New\s+M-PESA\s+balance\s+is\s+Ksh\s*(?<balance>[\d,]+(?:\.\d{2})?))?/i;

/**
 * M-Pesa Agent Withdrawal Pattern
 * Example: "UA33H2XVOX Confirmed. On 3/1/26 at 7:25 PM Give Ksh17,000.00 cash to Joker Enterprises God Favour New M-PESA balance is Ksh17,000.00."
 */
export const MPESA_AGENT_PATTERN =
  /^(?<refCode>[A-Z0-9]{10})\s+Confirmed\.\s*On\s+(?<date>\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(?<time>\d{1,2}:\d{2}\s*[AP]M)\s+Give\s+Ksh\s*(?<amount>[\d,]+(?:\.\d{2})?)\s+cash\s+to\s+(?<agentName>.+?)\s+(?:New\s+)?M-PESA\s+balance\s+is\s+Ksh\s*(?<balance>[\d,]+(?:\.\d{2})?)/i;

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
 * Fuliza Repayment Pattern (original format)
 * Example: "UAH3H46G3Q Confirmed. Your Fuliza M-Pesa loan of Ksh 500.00 has been repaid..."
 */
export const FULIZA_REPAYMENT_PATTERN =
  /^(?<refCode>[A-Z0-9]{10})\s+Confirmed\.\s*(?:Your\s+)?Fuliza\s+M-Pesa\s+(?:loan\s+)?(?:of\s+)?Ksh\s*(?<amount>[\d,]+(?:\.\d{2})?)\s+has\s+been\s+(?:repaid|paid)/i;

/**
 * Fuliza Auto-Repayment Pattern (partial/full repayment from M-PESA balance)
 * Example: "UA33H2XD7S Confirmed. Ksh 60.00 from your M-PESA has been used to partially pay your outstanding Fuliza M-PESA."
 * Example: "UA33H2XVOY Confirmed. Ksh 1775.51 from your M-PESA has been used to fully pay your outstanding Fuliza M-PESA."
 */
export const FULIZA_AUTO_REPAYMENT_PATTERN =
  /^(?<refCode>[A-Z0-9]{10})[\s\n]+Confirmed\.\s*Ksh\s*(?<amount>[\d,]+(?:\.\d{2})?)\s+from\s+your\s+M-PESA\s+has\s+been\s+used\s+to\s+(?<paymentType>partially|fully)\s+pay\s+your\s+outstanding\s+Fuliza\s+M-PESA\.?\s*(?:Your\s+)?(?:Available\s+)?Fuliza\s+M-PESA\s+limit\s+is\s+Ksh\s*(?<availableLimit>[\d,]+(?:\.\d{2})?)\.?\s*M-PESA\s+balance\s+is\s+Ksh\s*(?<balance>[\d,]+(?:\.\d{2})?)/i;

/**
 * M-Shwari Transfer Pattern
 * Example: "UAH3H48NSC Confirmed.Ksh5,000.00 transferred from M-Shwari account on 17/1/26 at 6:06 PM..."
 */
export const MSHWARI_TRANSFER_PATTERN =
  /^(?<refCode>[A-Z0-9]{10})\s+Confirmed\.?\s*Ksh\s*(?<amount>[\d,]+(?:\.\d{2})?)\s+transferred\s+from\s+M-Shwari\s+account\s+on\s+(?<date>\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(?<time>\d{1,2}:\d{2}\s*[AP]M)\.?\s*(?:M-Shwari\s+balance\s+is\s+Ksh\s*(?<shwariBalance>[\d,]+(?:\.\d{2})?))?\.?\s*(?:M-PESA\s+balance\s+is\s+Ksh\s*(?<mpesaBalance>[\d,]+(?:\.\d{2})?))?/i;

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
  | 'mpesa_paybill_alt'
  | 'mpesa_till'
  | 'mpesa_airtime'
  | 'mpesa_agent'
  | 'mpesa_received'
  | 'bank_transfer'
  | 'bank_confirmation'
  | 'card_transaction'
  | 'fuliza'
  | 'fuliza_repayment'
  | 'fuliza_auto_repayment'
  | 'mshwari_transfer'
  | 'unknown';

// Pattern matching order (most specific first)
export const PATTERNS: Array<{
  type: SmsPatternType;
  pattern: RegExp;
  transactionType: 'income' | 'expense' | 'debt' | 'debt_repayment' | 'transfer';
}> = [
  // Fuliza patterns first (most specific)
  { type: 'fuliza', pattern: FULIZA_PATTERN, transactionType: 'debt' },
  {
    type: 'fuliza_auto_repayment',
    pattern: FULIZA_AUTO_REPAYMENT_PATTERN,
    transactionType: 'debt_repayment',
  },
  {
    type: 'fuliza_repayment',
    pattern: FULIZA_REPAYMENT_PATTERN,
    transactionType: 'debt_repayment',
  },
  // M-Shwari
  {
    type: 'mshwari_transfer',
    pattern: MSHWARI_TRANSFER_PATTERN,
    transactionType: 'transfer',
  },
  // Income patterns
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
  // Expense patterns (most specific first)
  {
    type: 'mpesa_airtime',
    pattern: MPESA_AIRTIME_PATTERN,
    transactionType: 'expense',
  },
  {
    type: 'mpesa_agent',
    pattern: MPESA_AGENT_PATTERN,
    transactionType: 'expense',
  },
  {
    type: 'mpesa_till',
    pattern: MPESA_TILL_PATTERN,
    transactionType: 'expense',
  },
  {
    type: 'mpesa_paybill_alt',
    pattern: MPESA_PAYBILL_ALT_PATTERN,
    transactionType: 'expense',
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

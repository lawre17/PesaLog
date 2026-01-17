import { db, categories } from '../index';

export const DEFAULT_CATEGORIES = [
  // Income categories
  {
    name: 'Salary',
    icon: 'banknote.fill',
    color: '#34C759',
    isSystem: true,
  },
  {
    name: 'Business Income',
    icon: 'building.2.fill',
    color: '#30D158',
    isSystem: true,
  },
  {
    name: 'Freelance',
    icon: 'laptopcomputer',
    color: '#32D74B',
    isSystem: true,
  },
  {
    name: 'Gifts Received',
    icon: 'gift.fill',
    color: '#63E6BE',
    isSystem: true,
  },
  {
    name: 'Refund',
    icon: 'arrow.uturn.backward',
    color: '#00C7BE',
    isSystem: true,
  },

  // Expense categories
  {
    name: 'Food & Dining',
    icon: 'fork.knife',
    color: '#FF9500',
    isSystem: true,
  },
  {
    name: 'Transport',
    icon: 'car.fill',
    color: '#5856D6',
    isSystem: true,
  },
  {
    name: 'Utilities',
    icon: 'bolt.fill',
    color: '#FFCC00',
    isSystem: true,
  },
  {
    name: 'Entertainment',
    icon: 'tv.fill',
    color: '#FF2D55',
    isSystem: true,
  },
  {
    name: 'Shopping',
    icon: 'bag.fill',
    color: '#AF52DE',
    isSystem: true,
  },
  {
    name: 'Healthcare',
    icon: 'heart.fill',
    color: '#FF3B30',
    isSystem: true,
  },
  {
    name: 'Education',
    icon: 'book.fill',
    color: '#007AFF',
    isSystem: true,
  },
  {
    name: 'Subscriptions',
    icon: 'repeat',
    color: '#5AC8FA',
    isSystem: true,
  },
  {
    name: 'Bills & Fees',
    icon: 'doc.text.fill',
    color: '#8E8E93',
    isSystem: true,
  },
  {
    name: 'Airtime & Data',
    icon: 'phone.fill',
    color: '#00BCD4',
    isSystem: true,
  },
  {
    name: 'Rent',
    icon: 'house.fill',
    color: '#795548',
    isSystem: true,
  },

  // Transfer categories
  {
    name: 'Personal Transfer',
    icon: 'arrow.left.arrow.right',
    color: '#64D2FF',
    isSystem: true,
  },
  {
    name: 'Family Support',
    icon: 'person.2.fill',
    color: '#BF5AF2',
    isSystem: true,
  },
  {
    name: 'Lending',
    icon: 'hand.raised.fill',
    color: '#FFD60A',
    isSystem: true,
  },

  // Debt categories
  {
    name: 'Loan Repayment',
    icon: 'creditcard.fill',
    color: '#FF453A',
    isSystem: true,
  },
  {
    name: 'Fuliza',
    icon: 'exclamationmark.circle.fill',
    color: '#FF6961',
    isSystem: true,
  },

  // Other
  {
    name: 'Other',
    icon: 'ellipsis.circle.fill',
    color: '#636366',
    isSystem: true,
  },
];

export async function seedCategories(): Promise<void> {
  // Check if categories already exist
  const existingCategories = await db.select().from(categories);

  if (existingCategories.length > 0) {
    console.log('Categories already seeded');
    return;
  }

  // Insert default categories
  for (const category of DEFAULT_CATEGORIES) {
    await db.insert(categories).values(category);
  }

  console.log(`Seeded ${DEFAULT_CATEGORIES.length} default categories`);
}

// Get category ID by name
export async function getCategoryIdByName(
  name: string
): Promise<number | null> {
  const result = await db.select().from(categories);
  const category = result.find((c) => c.name === name);
  return category?.id ?? null;
}

import { Category, CategoryBudget } from '../models/category.model';
import { Transaction } from '../models/transaction.model';
import { sumByType } from './transaction-stats';

export function buildCategoryBudgets(
  categories: Category[],
  monthTransactions: Transaction[],
): CategoryBudget[] {
  return categories.map((category) => {
    const categoryTransactions = monthTransactions.filter((t) => t.category === category.name);
    const spent = sumByType(categoryTransactions, 'expense');

    return { ...category, spent, over: spent > category.budget };
  });
}

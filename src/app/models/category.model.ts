export interface Category {
  id: number;
  name: string;
  budget: number;
}

export type NewCategory = Omit<Category, 'id'>;

export interface CategoryBudget extends Category {
  spent: number;
  over: boolean;
}

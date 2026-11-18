export interface Goal {
  id: number;
  name: string;
  target: number;
  saved: number;
  dueDate: string;
}

export type NewGoal = Omit<Goal, 'id' | 'saved'>;

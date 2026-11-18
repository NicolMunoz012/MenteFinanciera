export interface Reminder {
  id: number;
  name: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
}

export type NewReminder = Omit<Reminder, 'id' | 'isPaid'>;

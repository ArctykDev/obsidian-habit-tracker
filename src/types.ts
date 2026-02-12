export interface Habit {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string; // ISO date string
  archived: boolean;
}

export interface HabitCompletion {
  habitId: string;
  date: string; // YYYY-MM-DD format
  completed: boolean;
  note?: string;
}

export interface HabitData {
  habits: Habit[];
  completions: HabitCompletion[];
}

export interface HabitTrackerSettings {
  showStreaks: boolean;
  showCompletionRate: boolean;
  weekStartsOnMonday: boolean;
  defaultHabitColor: string;
  habitSuggestions: string[];
  habitsFolder: string;
}
  
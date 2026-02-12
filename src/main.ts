import { Plugin, WorkspaceLeaf, Notice, TFile, TAbstractFile } from "obsidian";
import { HabitTrackerSettingTab, DEFAULT_SETTINGS } from "./settings";
import { VIEW_TYPE_HABIT_TRACKER, HabitsView } from "./ui/ThingsView";
import { AddHabitModal } from "./ui/AddHabitModal";
import { HabitStorage } from "./storage";
import type { Habit, HabitCompletion, HabitData, HabitTrackerSettings } from "./types";

const DEFAULT_DATA: HabitData = {
  habits: [],
  completions: [],
};

export default class HabitTrackerPlugin extends Plugin {
  settings!: HabitTrackerSettings;
  data!: HabitData;
  storage!: HabitStorage;

  async onload() {
    console.log("Loading Habit Tracker plugin");
    
    try {
      await this.loadSettings();
      
      // Initialize storage
      this.storage = new HabitStorage(this.app, this.settings.habitsFolder);
      
      // Initialize with empty data first
      this.data = { habits: [], completions: [] };
      
      // Wait for workspace to be ready before loading habits
      this.app.workspace.onLayoutReady(async () => {
        try {
          await this.loadHabitData();
          // Refresh any open habit tracker views
          const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_HABIT_TRACKER);
          for (const leaf of leaves) {
            if (leaf.view instanceof HabitsView) {
              leaf.view.refresh();
            }
          }
        } catch (error) {
          console.error("Error loading habit data:", error);
          new Notice("Error loading habit data. Check console for details.");
        }
      });

      // Watch for file changes in the Habits folder
      this.registerEvent(
        this.app.vault.on("modify", async (file) => {
          if (file instanceof TFile && this.isHabitFile(file)) {
            await this.reloadHabitData();
          }
        })
      );

      this.registerEvent(
        this.app.vault.on("create", async (file) => {
          if (file instanceof TFile && this.isHabitFile(file)) {
            await this.reloadHabitData();
          }
        })
      );

      this.registerEvent(
        this.app.vault.on("delete", async (file) => {
          if (this.isHabitFile(file)) {
            await this.reloadHabitData();
          }
        })
      );

      this.registerEvent(
        this.app.vault.on("rename", async (file, oldPath) => {
          if (this.isHabitFile(file) || oldPath.startsWith(this.settings.habitsFolder + "/")) {
            await this.reloadHabitData();
          }
        })
      );
    } catch (error) {
      console.error("Error loading Habit Tracker plugin:", error);
      new Notice("Error loading Habit Tracker plugin. Check console for details.");
      // Initialize with empty data as fallback
      this.data = { habits: [], completions: [] };
    }

    // Register the habit tracker view
    this.registerView(
      VIEW_TYPE_HABIT_TRACKER,
      (leaf) => new HabitsView(leaf, this)
    );

    // Add ribbon icon to open habit tracker
    this.addRibbonIcon("check-circle", "Open Habit Tracker", () => {
      this.activateView();
    });

    // Command to open habit tracker view
    this.addCommand({
      id: "open-habit-tracker",
      name: "Open Habit Tracker",
      callback: () => {
        this.activateView();
      },
    });

    // Command to add a new habit
    this.addCommand({
      id: "add-new-habit",
      name: "Add New Habit",
      callback: () => {
        this.promptForHabitName();
      },
    });

    // Command to toggle today's completion for a habit
    this.addCommand({
      id: "quick-toggle-habit",
      name: "Quick Toggle Habit Completion",
      callback: async () => {
        // This could open a suggester with all habits
        const view = this.app.workspace.getLeavesOfType(VIEW_TYPE_HABIT_TRACKER)[0]?.view;
        if (view instanceof HabitsView) {
          view.focusFirstHabit();
        } else {
          await this.activateView();
        }
      },
    });

    this.addSettingTab(new HabitTrackerSettingTab(this.app, this));
  }

  async onunload() {
    console.log("Unloading Habit Tracker plugin");
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_HABIT_TRACKER);
  }

  async activateView() {
    const { workspace } = this.app;
    
    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_HABIT_TRACKER);

    if (leaves.length > 0) {
      // View already exists, reveal it
      leaf = leaves[0];
    } else {
      // Create new leaf in right sidebar
      leaf = workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({
          type: VIEW_TYPE_HABIT_TRACKER,
          active: true,
        });
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  async loadSettings() {
    const loaded = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded || {});
  }

  async saveSettings() {
    // Save only settings to data.json
    await this.saveData(this.settings);
  }

  async loadHabitData() {
    // Load habits from notes
    this.data = await this.storage.loadAllHabits();
    console.log(`Loaded ${this.data.habits.length} habits, ${this.data.completions.length} completions`);
  }

  async saveHabitData() {
    // Save all habits to their respective note files
    for (const habit of this.data.habits) {
      const habitCompletions = this.data.completions.filter(c => c.habitId === habit.id);
      await this.storage.saveHabit(habit, habitCompletions);
    }
  }

  async saveHabit(habitId: string) {
    // Save a single habit to its note file
    const habit = this.data.habits.find(h => h.id === habitId);
    if (habit) {
      const habitCompletions = this.data.completions.filter(c => c.habitId === habit.id);
      await this.storage.saveHabit(habit, habitCompletions);
    }
  }

  async addHabit(name: string, description?: string) {
    const newHabit: Habit = {
      id: this.generateId(),
      name,
      description: description || "",
      color: this.settings.defaultHabitColor,
      createdAt: new Date().toISOString(),
      archived: false,
    };

    this.data.habits.push(newHabit);
    await this.saveHabit(newHabit.id);
    
    // Refresh the view
    this.refreshView();
    
    return newHabit;
  }

  async deleteHabit(habitId: string) {
    const habit = this.data.habits.find(h => h.id === habitId);
    if (habit) {
      await this.storage.deleteHabit(habit);
      this.data.habits = this.data.habits.filter(h => h.id !== habitId);
      this.data.completions = this.data.completions.filter(c => c.habitId !== habitId);
      this.refreshView();
    }
  }

  async updateHabit(habitId: string, name: string, description?: string, color?: string) {
    const habit = this.data.habits.find(h => h.id === habitId);
    if (habit) {
      const oldName = habit.name;
      habit.name = name;
      habit.description = description || "";
      habit.color = color || this.settings.defaultHabitColor;
      
      // Rename file if name changed
      if (oldName !== name) {
        await this.storage.renameHabit(oldName, name);
      }
      
      const habitCompletions = this.data.completions.filter(c => c.habitId === habit.id);
      await this.storage.saveHabit(habit, habitCompletions);
      this.refreshView();
    }
  }

  async toggleHabitCompletion(habitId: string, date: string) {
    const existing = this.data.completions.find(
      c => c.habitId === habitId && c.date === date
    );

    if (existing) {
      existing.completed = !existing.completed;
    } else {
      this.data.completions.push({
        habitId,
        date,
        completed: true,
      });
    }

    await this.saveHabit(habitId);
    this.refreshView();
  }

  getHabitCompletion(habitId: string, date: string): boolean {
    const completion = this.data.completions.find(
      c => c.habitId === habitId && c.date === date
    );
    return completion?.completed || false;
  }

  getHabitStreak(habitId: string): number {
    const today = new Date();
    let streak = 0;
    
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = this.formatDate(checkDate);
      
      if (this.getHabitCompletion(habitId, dateStr)) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  getTodayDate(): string {
    return this.formatDate(new Date());
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  promptForHabitName(): void {
    new AddHabitModal(this.app, async (habitName) => {
      if (habitName) {
        await this.addHabit(habitName);
      }
    }).open();
  }

  private refreshView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_HABIT_TRACKER);
    leaves.forEach((leaf) => {
      if (leaf.view instanceof HabitsView) {
        leaf.view.refresh();
      }
    });
  }

  private isHabitFile(file: TAbstractFile): boolean {
    return file.path.startsWith(this.settings.habitsFolder + "/") && 
           file.path.endsWith(".md");
  }

  private async reloadHabitData() {
    try {
      await this.loadHabitData();
      this.refreshView();
    } catch (error) {
      console.error("Error reloading habit data:", error);
    }
  }
}

import { ItemView, WorkspaceLeaf, setIcon, Menu } from "obsidian";
import type HabitTrackerPlugin from "../main";
import type { Habit } from "../types";
import { EditHabitModal } from "./EditHabitModal";
import { HabitHistoryModal } from "./HabitHistoryModal";

export const VIEW_TYPE_HABIT_TRACKER = "habit-tracker-view";

export class HabitsView extends ItemView {
  private plugin: HabitTrackerPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: HabitTrackerPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_HABIT_TRACKER;
  }

  getDisplayText(): string {
    return "Habit Tracker";
  }

  getIcon(): string {
    return "check-circle";
  }

  async onOpen() {
    this.refresh();
  }

  async onClose() {
    // Cleanup if needed
  }

  refresh() {
    this.render();
  }

  focusFirstHabit() {
    // Focus the first habit checkbox
    const firstCheckbox = this.containerEl.querySelector<HTMLInputElement>(
      ".habit-checkbox"
    );
    if (firstCheckbox) {
      firstCheckbox.focus();
    }
  }

  private render() {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass("habit-tracker-view");

    // Header
    const headerDiv = container.createDiv({ cls: "habit-tracker-header" });
    
    const titleRow = headerDiv.createDiv({ cls: "habit-tracker-title-row" });
    const title = titleRow.createEl("h2", { text: "Habit Tracker" });
    
    // Settings button
    const settingsButton = titleRow.createEl("button", {
      cls: "habit-settings-button",
      attr: { "aria-label": "Open Habit Tracker settings" },
    });
    setIcon(settingsButton, "settings");
    settingsButton.addEventListener("click", () => {
      // Open plugin settings
      (this.app as any).setting.open();
      (this.app as any).setting.openTabById("habit-tracker");
    });
    
    const todayDate = this.plugin.getTodayDate();
    const dateDisplay = headerDiv.createEl("div", {
      cls: "habit-tracker-date",
      text: this.formatDateDisplay(todayDate),
    });

    // Add Habit Button
    const addButton = headerDiv.createEl("button", {
      cls: "habit-add-button",
      text: "+ Add Habit",
    });
    addButton.addEventListener("click", () => {
      this.plugin.promptForHabitName();
    });

    // Habits List
    const habitsContainer = container.createDiv({ cls: "habits-container" });
    
    const activeHabits = this.plugin.data.habits.filter(h => !h.archived);
    
    if (activeHabits.length === 0) {
      const emptyState = habitsContainer.createDiv({ cls: "habits-empty-state" });
      emptyState.createEl("p", { text: "No habits yet. Start building your routine!" });
      
      // Show suggestions if available
      if (this.plugin.settings.habitSuggestions.length > 0) {
        emptyState.createEl("p", { text: "Suggestions:" });
        const suggestionsList = emptyState.createEl("ul", { cls: "habit-suggestions" });
        
        this.plugin.settings.habitSuggestions.forEach(suggestion => {
          const li = suggestionsList.createEl("li", { cls: "habit-suggestion-item" });
          li.createEl("span", { text: suggestion });
          const addBtn = li.createEl("button", { text: "Add", cls: "suggestion-add-btn" });
          addBtn.addEventListener("click", () => {
            this.plugin.addHabit(suggestion);
          });
        });
      }
    } else {
      activeHabits.forEach(habit => {
        this.renderHabitItem(habitsContainer, habit, todayDate);
      });
    }

    // Stats section (if enabled)
    if (this.plugin.settings.showCompletionRate && activeHabits.length > 0) {
      this.renderStats(container, activeHabits, todayDate);
    }
  }

  private renderHabitItem(container: HTMLElement, habit: Habit, date: string) {
    const habitDiv = container.createDiv({ cls: "habit-item" });
    
    // Checkbox
    const checkbox = habitDiv.createEl("input", {
      type: "checkbox",
      cls: "habit-checkbox",
    });
    checkbox.checked = this.plugin.getHabitCompletion(habit.id, date);
    checkbox.addEventListener("change", async () => {
      await this.plugin.toggleHabitCompletion(habit.id, date);
    });

    // Habit info
    const infoDiv = habitDiv.createDiv({ cls: "habit-info" });
    const nameSpan = infoDiv.createEl("span", {
      cls: "habit-name",
      text: habit.name,
    });

    if (habit.color) {
      nameSpan.style.color = habit.color;
    }

    if (habit.description) {
      infoDiv.createEl("div", {
        cls: "habit-description",
        text: habit.description,
      });
    }

    // Streak display (if enabled)
    if (this.plugin.settings.showStreaks) {
      const streak = this.plugin.getHabitStreak(habit.id);
      if (streak > 0) {
        const streakSpan = infoDiv.createEl("span", {
          cls: "habit-streak",
          text: `🔥 ${streak} day${streak !== 1 ? 's' : ''}`,
        });
      }
    }

    // Actions menu
    const actionsBtn = habitDiv.createEl("button", {
      cls: "habit-actions-btn",
      text: "⋮",
    });
    actionsBtn.addEventListener("click", (e) => {
      this.showHabitMenu(habit, actionsBtn);
    });
  }

  private renderStats(container: HTMLElement, habits: Habit[], date: string) {
    const statsDiv = container.createDiv({ cls: "habit-stats" });
    statsDiv.createEl("h3", { text: "Today's Progress" });

    const completed = habits.filter(h =>
      this.plugin.getHabitCompletion(h.id, date)
    ).length;
    const total = habits.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    const progressBar = statsDiv.createDiv({ cls: "progress-bar" });
    const progressFill = progressBar.createDiv({ cls: "progress-fill" });
    progressFill.style.width = `${percentage}%`;

    statsDiv.createEl("div", {
      cls: "progress-text",
      text: `${completed} of ${total} habits completed (${percentage}%)`,
    });
  }

  private showHabitMenu(habit: Habit, buttonEl: HTMLElement) {
    const menu = new Menu();

    menu.addItem((item) => {
      item
        .setTitle("Edit")
        .setIcon("pencil")
        .onClick(() => {
          new EditHabitModal(this.app, habit, (name, description, color) => {
            this.plugin.updateHabit(habit.id, name, description, color);
          }).open();
        });
    });

    menu.addItem((item) => {
      item
        .setTitle("Delete")
        .setIcon("trash")
        .onClick(async () => {
          if (confirm(`Delete habit "${habit.name}"?`)) {
            await this.plugin.deleteHabit(habit.id);
          }
        });
    });

    menu.addItem((item) => {
      item
        .setTitle("View History")
        .setIcon("calendar")
        .onClick(() => {
          new HabitHistoryModal(this.app, this.plugin, habit).open();
        });
    });

    menu.addItem((item) => {
      item
        .setTitle(habit.archived ? "Unarchive" : "Archive")
        .setIcon("archive")
        .onClick(async () => {
          habit.archived = !habit.archived;
          await this.plugin.saveHabit(habit.id);
          this.refresh();
        });
    });

    menu.showAtMouseEvent(new MouseEvent('click', {
      clientX: buttonEl.getBoundingClientRect().right,
      clientY: buttonEl.getBoundingClientRect().bottom,
    }));
  }

  private formatDateDisplay(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    
    if (this.isSameDay(date, today)) {
      return "Today";
    }
    
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }
}

import { App, Modal } from "obsidian";
import type HabitTrackerPlugin from "../main";
import type { Habit } from "../types";

export class HabitHistoryModal extends Modal {
  plugin: HabitTrackerPlugin;
  habit: Habit;

  constructor(app: App, plugin: HabitTrackerPlugin, habit: Habit) {
    super(app);
    this.plugin = plugin;
    this.habit = habit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("habit-history-modal");

    // Header
    contentEl.createEl("h2", { text: `History: ${this.habit.name}` });

    if (this.habit.description) {
      contentEl.createEl("p", { 
        text: this.habit.description,
        cls: "habit-history-description"
      });
    }

    // Statistics section
    const statsDiv = contentEl.createDiv({ cls: "habit-history-stats" });
    
    const completions = this.plugin.data.completions.filter(
      c => c.habitId === this.habit.id && c.completed
    );

    const streak = this.plugin.getHabitStreak(this.habit.id);
    const totalCompletions = completions.length;
    
    // Calculate days since creation
    const createdDate = new Date(this.habit.createdAt);
    const today = new Date();
    const daysSinceCreation = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const completionRate = daysSinceCreation > 0 ? Math.round((totalCompletions / daysSinceCreation) * 100) : 0;

    // Stats grid
    const statsGrid = statsDiv.createDiv({ cls: "stats-grid" });
    
    this.createStatBox(statsGrid, "Current Streak", `${streak} day${streak !== 1 ? 's' : ''}`, "🔥");
    this.createStatBox(statsGrid, "Total Completions", totalCompletions.toString(), "✓");
    this.createStatBox(statsGrid, "Completion Rate", `${completionRate}%`, "📊");
    this.createStatBox(statsGrid, "Days Tracked", daysSinceCreation.toString(), "📅");

    // Completion history
    contentEl.createEl("h3", { text: "Recent Completions", cls: "history-section-title" });

    if (completions.length === 0) {
      contentEl.createEl("p", { 
        text: "No completions yet. Start tracking today!",
        cls: "history-empty"
      });
    } else {
      // Sort completions by date (most recent first)
      const sortedCompletions = [...completions].sort((a, b) => 
        b.date.localeCompare(a.date)
      );

      const historyList = contentEl.createDiv({ cls: "history-list" });
      
      // Show last 30 days or all completions (whichever is less)
      const recentCompletions = sortedCompletions.slice(0, 30);
      
      recentCompletions.forEach(completion => {
        const item = historyList.createDiv({ cls: "history-item" });
        
        const dateObj = new Date(completion.date);
        const formattedDate = this.formatDate(dateObj);
        const daysAgo = this.getDaysAgo(dateObj);
        
        item.createEl("span", { 
          text: "✓",
          cls: "history-checkmark"
        });
        
        const dateDiv = item.createDiv({ cls: "history-date-info" });
        dateDiv.createEl("div", { 
          text: formattedDate,
          cls: "history-date"
        });
        dateDiv.createEl("div", { 
          text: daysAgo,
          cls: "history-days-ago"
        });

        if (completion.note) {
          item.createDiv({ 
            text: completion.note,
            cls: "history-note"
          });
        }
      });

      if (completions.length > 30) {
        contentEl.createEl("p", { 
          text: `Showing 30 most recent completions of ${completions.length} total`,
          cls: "history-note-text"
        });
      }
    }

    // Calendar visualization (last 7 weeks)
    contentEl.createEl("h3", { text: "Last 7 Weeks", cls: "history-section-title" });
    this.renderCalendar(contentEl);

    // Close button
    const buttonDiv = contentEl.createDiv({ cls: "modal-button-container" });
    const closeButton = buttonDiv.createEl("button", { 
      text: "Close",
      cls: "mod-cta"
    });
    closeButton.addEventListener("click", () => this.close());
  }

  createStatBox(container: HTMLElement, label: string, value: string, icon: string) {
    const box = container.createDiv({ cls: "stat-box" });
    box.createEl("div", { text: icon, cls: "stat-icon" });
    box.createEl("div", { text: value, cls: "stat-value" });
    box.createEl("div", { text: label, cls: "stat-label" });
  }

  renderCalendar(container: HTMLElement) {
    const calendarDiv = container.createDiv({ cls: "habit-calendar" });
    
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 48); // 7 weeks back

    // Create day labels
    const daysRow = calendarDiv.createDiv({ cls: "calendar-days" });
    const dayLabels = this.plugin.settings.weekStartsOnMonday 
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    dayLabels.forEach(day => {
      daysRow.createEl("div", { text: day, cls: "calendar-day-label" });
    });

    // Create calendar grid
    const gridDiv = calendarDiv.createDiv({ cls: "calendar-grid" });

    for (let i = 0; i < 49; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      const dateStr = this.plugin.formatDate(date);
      const isCompleted = this.plugin.getHabitCompletion(this.habit.id, dateStr);
      const isToday = this.isToday(date);
      const isFuture = date > today;

      const dayCell = gridDiv.createDiv({ cls: "calendar-cell" });
      
      if (isFuture) {
        dayCell.addClass("future");
      } else if (isCompleted) {
        dayCell.addClass("completed");
      } else {
        dayCell.addClass("missed");
      }
      
      if (isToday) {
        dayCell.addClass("today");
      }

      dayCell.title = `${dateStr}${isCompleted ? ' ✓' : ''}`;
    }
  }

  formatDate(date: Date): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }

  getDaysAgo(date: Date): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - compareDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return "1 week ago";
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 60) return "1 month ago";
    return `${Math.floor(diffDays / 30)} months ago`;
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

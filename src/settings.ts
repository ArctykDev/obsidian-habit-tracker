import { App, PluginSettingTab, Setting } from "obsidian";
import type HabitTrackerPlugin from "./main";
import type { HabitTrackerSettings } from "./types";

export const DEFAULT_SETTINGS: HabitTrackerSettings = {
  showStreaks: true,
  showCompletionRate: true,
  weekStartsOnMonday: true,
  defaultHabitColor: "#4a9eff",
  habitsFolder: "Habits",
  habitSuggestions: [
    "Exercise for 30 minutes",
    "Read for 20 minutes",
    "Meditate",
    "Drink 8 glasses of water",
    "Practice gratitude",
    "Learn something new",
    "No social media after 9 PM",
  ]
};

export class HabitTrackerSettingTab extends PluginSettingTab {
  plugin: HabitTrackerPlugin;

  constructor(app: App, plugin: HabitTrackerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Habit Tracker Settings" });

    // Show Streaks
    new Setting(containerEl)
      .setName("Show Streaks")
      .setDesc("Display the current streak for each habit.")
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.showStreaks)
          .onChange(async (value) => {
            this.plugin.settings.showStreaks = value;
            await this.plugin.saveSettings();
            this.plugin.app.workspace.getLeavesOfType("habit-tracker-view")
              .forEach(leaf => (leaf.view as any).refresh?.());
          })
      );

    // Show Completion Rate
    new Setting(containerEl)
      .setName("Show Completion Rate")
      .setDesc("Display today's progress and completion percentage.")
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.showCompletionRate)
          .onChange(async (value) => {
            this.plugin.settings.showCompletionRate = value;
            await this.plugin.saveSettings();
            this.plugin.app.workspace.getLeavesOfType("habit-tracker-view")
              .forEach(leaf => (leaf.view as any).refresh?.());
          })
      );

    // Week Starts On Monday
    new Setting(containerEl)
      .setName("Week Starts on Monday")
      .setDesc("Use Monday as the first day of the week (otherwise Sunday).")
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.weekStartsOnMonday)
          .onChange(async (value) => {
            this.plugin.settings.weekStartsOnMonday = value;
            await this.plugin.saveSettings();
          })
      );

    // Default Habit Color
    new Setting(containerEl)
      .setName("Default Habit Color")
      .setDesc("Default color for new habits (hex color code).")
      .addText(text =>
        text
          .setPlaceholder("#4a9eff")
          .setValue(this.plugin.settings.defaultHabitColor)
          .onChange(async (value) => {
            if (/^#[0-9A-F]{6}$/i.test(value) || value === "") {
              this.plugin.settings.defaultHabitColor = value || "#4a9eff";
              await this.plugin.saveSettings();
            }
          })
      );

    // Habits Folder
    new Setting(containerEl)
      .setName("Habits Folder")
      .setDesc("Folder where habit notes are stored. Changing this will not move existing habits.")
      .addText(text =>
        text
          .setPlaceholder("Habits")
          .setValue(this.plugin.settings.habitsFolder)
          .onChange(async (value) => {
            this.plugin.settings.habitsFolder = value || "Habits";
            await this.plugin.saveSettings();
            this.plugin.storage = new (await import("./storage")).HabitStorage(
              this.plugin.app,
              this.plugin.settings.habitsFolder
            );
          })
      );

    // Habit Suggestions
    containerEl.createEl("h3", { text: "Habit Suggestions" });
    containerEl.createEl("p", {
      text: "Suggestions shown when creating new habits. One per line.",
      cls: "setting-item-description"
    });

    new Setting(containerEl)
      .setName("Suggestions")
      .addTextArea(text => {
        text
          .setPlaceholder("Enter suggestions, one per line")
          .setValue(this.plugin.settings.habitSuggestions.join("\n"))
          .onChange(async (value) => {
            this.plugin.settings.habitSuggestions = value
              .split("\n")
              .map(s => s.trim())
              .filter(s => s.length > 0);
            await this.plugin.saveSettings();
          });
        text.inputEl.rows = 8;
        text.inputEl.cols = 40;
      });

    containerEl.createEl("hr", { attr: { style: "margin: 32px 0 24px 0;" } });
    
    new Setting(containerEl).setName("Support development").setHeading();
    
    new Setting(containerEl)
      .setName("Documentation & Updates")
      .setDesc("Visit the official website for documentation, guides, and updates")
      .addButton((btn) => {
        btn
          .setButtonText("Visit projectplanner.md")
          .onClick(() => {
            window.open("https://projectplanner.md", "_blank");
          });
      });
    
    const coffeeSetting = new Setting(containerEl)
      .setName("Buy me a coffee")
      .setDesc("If you find this plugin useful, consider supporting development!");
    
    // Add Buy Me a Coffee button in the same row
    const coffeeLink = coffeeSetting.controlEl.createEl("a", {
      href: "https://www.buymeacoffee.com/arctykdev"
    });
    coffeeLink.setAttribute("target", "_blank");
    coffeeLink.setAttribute("rel", "noopener noreferrer");
    
    const coffeeImg = coffeeLink.createEl("img", {
      attr: {
        src: "https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png",
        alt: "Buy Me A Coffee"
      }
    });
    coffeeImg.style.height = "40px";
    coffeeImg.style.width = "145px";
    coffeeImg.style.verticalAlign = "middle";
  }
}

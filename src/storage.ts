import { App, TFile, TFolder, normalizePath } from "obsidian";
import type { Habit, HabitCompletion, HabitData } from "./types";

export class HabitStorage {
  private app: App;
  private habitsFolder: string = "Habits";

  constructor(app: App, habitsFolder?: string) {
    this.app = app;
    if (habitsFolder) {
      this.habitsFolder = habitsFolder;
    }
  }

  async ensureHabitsFolder(): Promise<void> {
    const normalizedPath = normalizePath(this.habitsFolder);
    const folder = this.app.vault.getAbstractFileByPath(normalizedPath);
    
    if (!folder) {
      try {
        await this.app.vault.createFolder(normalizedPath);
      } catch (error) {
        // Only ignore "already exists" errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes("already exists")) {
          throw error;
        }
      }
    }
  }

  async loadAllHabits(): Promise<HabitData> {
    await this.ensureHabitsFolder();

    const habits: Habit[] = [];
    const completions: HabitCompletion[] = [];

    const normalizedPath = normalizePath(this.habitsFolder);
    
    // Search all markdown files in vault and filter by path
    const allFiles = this.app.vault.getMarkdownFiles();
    console.log(`Total markdown files in vault: ${allFiles.length}`);
    
    for (const file of allFiles) {
      if (file.path.startsWith(normalizedPath + "/")) {
        console.log(`Loading habit from: ${file.path}`);
        const habitData = await this.loadHabitFromFile(file);
        if (habitData) {
          habits.push(habitData.habit);
          completions.push(...habitData.completions);
        }
      }
    }

    console.log(`Loaded ${habits.length} habits from ${normalizedPath}`);
    return { habits, completions };
  }

  private async loadHabitFromFile(file: TFile): Promise<{ habit: Habit; completions: HabitCompletion[] } | null> {
    try {
      const content = await this.app.vault.read(file);
      
      // Parse frontmatter manually
      const frontmatter = this.parseFrontmatter(content);

      if (!frontmatter) {
        console.warn(`No frontmatter found in ${file.path}`);
        return null;
      }
      
      if (!frontmatter.id) {
        console.warn(`No id in frontmatter for ${file.path}`);
        return null;
      }

      console.log(`Creating habit from ${file.path} with id: ${frontmatter.id}`);
      
      const habit: Habit = {
        id: frontmatter.id,
        name: frontmatter.name || file.basename,
        description: frontmatter.description || "",
        color: frontmatter.color || "#4a9eff",
        createdAt: frontmatter.createdAt || new Date().toISOString(),
        archived: frontmatter.archived === "true" || frontmatter.archived === true,
      };

    // Parse completions from content
    const completions: HabitCompletion[] = [];
    const lines = content.split("\n");
    let inCompletionsSection = false;

    for (const line of lines) {
      if (line.startsWith("## Completions")) {
        inCompletionsSection = true;
        continue;
      }

      if (inCompletionsSection && line.startsWith("- ")) {
        const match = line.match(/^- (\d{4}-\d{2}-\d{2}) ([✓✗])(.*)?$/);
        if (match) {
          const [, date, status, noteText] = match;
          completions.push({
            habitId: habit.id,
            date,
            completed: status === "✓",
            note: noteText ? noteText.trim() : undefined,
          });
        }
      } else if (inCompletionsSection && line.startsWith("#")) {
        // New section, stop parsing completions
        break;
      }
    }

    return { habit, completions };
    } catch (error) {
      console.error(`Error loading habit from ${file.path}:`, error);
      return null;
    }
  }

  async saveHabit(habit: Habit, completions: HabitCompletion[]): Promise<void> {
    await this.ensureHabitsFolder();

    const fileName = this.sanitizeFileName(habit.name);
    const filePath = normalizePath(`${this.habitsFolder}/${fileName}.md`);

    // Build frontmatter
    const frontmatter = [
      "---",
      `id: ${habit.id}`,
      `name: ${habit.name}`,
      `description: ${habit.description || ""}`,
      `color: ${habit.color || "#4a9eff"}`,
      `createdAt: ${habit.createdAt}`,
      `archived: ${habit.archived}`,
      "---",
    ].join("\n");

    // Build content
    let content = frontmatter + "\n\n";
    content += `# ${habit.name}\n\n`;

    if (habit.description) {
      content += `${habit.description}\n\n`;
    }

    // Add completions section
    const habitCompletions = completions
      .filter(c => c.habitId === habit.id)
      .sort((a, b) => b.date.localeCompare(a.date)); // Most recent first

    if (habitCompletions.length > 0) {
      content += "## Completions\n\n";
      for (const completion of habitCompletions) {
        const status = completion.completed ? "✓" : "✗";
        const note = completion.note ? ` ${completion.note}` : "";
        content += `- ${completion.date} ${status}${note}\n`;
      }
    } else {
      content += "## Completions\n\n";
      content += "_No completions yet. Start tracking today!_\n";
    }

    // Check if file exists
    const existingFile = this.app.vault.getAbstractFileByPath(filePath);
    if (existingFile instanceof TFile) {
      await this.app.vault.modify(existingFile, content);
    } else {
      try {
        await this.app.vault.create(filePath, content);
      } catch (error) {
        // File might already exist, try to modify it instead
        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (file instanceof TFile) {
          await this.app.vault.modify(file, content);
        } else {
          // If it's still not found, re-throw the error
          throw error;
        }
      }
    }
  }

  async deleteHabit(habit: Habit): Promise<void> {
    const fileName = this.sanitizeFileName(habit.name);
    const filePath = normalizePath(`${this.habitsFolder}/${fileName}.md`);
    const file = this.app.vault.getAbstractFileByPath(filePath);

    if (file instanceof TFile) {
      await this.app.vault.delete(file);
    }
  }

  async renameHabit(oldName: string, newName: string): Promise<void> {
    const oldFileName = this.sanitizeFileName(oldName);
    const newFileName = this.sanitizeFileName(newName);
    const oldPath = normalizePath(`${this.habitsFolder}/${oldFileName}.md`);
    const newPath = normalizePath(`${this.habitsFolder}/${newFileName}.md`);

    const file = this.app.vault.getAbstractFileByPath(oldPath);
    if (file instanceof TFile) {
      await this.app.vault.rename(file, newPath);
    }
  }

  private parseFrontmatter(content: string): Record<string, any> | null {
    // Check if content starts with ---
    if (!content.startsWith("---")) {
      return null;
    }

    const lines = content.split("\n");
    const frontmatterLines: string[] = [];
    let inFrontmatter = false;
    let frontmatterEndIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (i === 0 && lines[i].trim() === "---") {
        inFrontmatter = true;
        continue;
      }
      if (inFrontmatter && lines[i].trim() === "---") {
        frontmatterEndIndex = i;
        break;
      }
      if (inFrontmatter) {
        frontmatterLines.push(lines[i]);
      }
    }

    if (frontmatterEndIndex === -1) {
      return null;
    }

    // Simple YAML parser for frontmatter
    const frontmatter: Record<string, any> = {};
    for (const line of frontmatterLines) {
      // Skip empty lines
      if (!line.trim()) continue;
      
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value: any = match[2].trim();
        
        // Handle empty values
        if (value === "" || value.toLowerCase() === "empty") {
          value = "";
        }
        // Parse booleans
        else if (value === "true") {
          value = true;
        } else if (value === "false") {
          value = false;
        }
        
        frontmatter[key] = value;
      }
    }

    return frontmatter;
  }

  private sanitizeFileName(name: string): string {
    // Remove invalid file system characters
    return name.replace(/[\\/:*?"<>|]/g, "-").trim();
  }


}

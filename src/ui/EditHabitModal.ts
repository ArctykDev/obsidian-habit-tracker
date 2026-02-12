import { App, Modal, Setting } from "obsidian";
import type { Habit } from "../types";

export class EditHabitModal extends Modal {
  habit: Habit;
  name: string;
  description: string;
  color: string;
  onSubmit: (name: string, description: string, color: string) => void;

  constructor(app: App, habit: Habit, onSubmit: (name: string, description: string, color: string) => void) {
    super(app);
    this.habit = habit;
    this.name = habit.name;
    this.description = habit.description || "";
    this.color = habit.color || "#4a9eff";
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h2", { text: "Edit Habit" });

    new Setting(contentEl)
      .setName("Habit name")
      .addText((text) => {
        text.setValue(this.name)
          .setPlaceholder("e.g., Exercise for 30 minutes")
          .onChange((value) => {
            this.name = value;
          });
        text.inputEl.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            this.submit();
          }
        });
        // Focus the input field
        setTimeout(() => {
          text.inputEl.focus();
          text.inputEl.select();
        }, 10);
      });

    new Setting(contentEl)
      .setName("Description")
      .setDesc("Optional description for this habit")
      .addText((text) => {
        text.setValue(this.description)
          .setPlaceholder("e.g., Morning workout routine")
          .onChange((value) => {
            this.description = value;
          });
      });

    new Setting(contentEl)
      .setName("Color")
      .setDesc("Color for this habit (hex code)")
      .addText((text) => {
        text.setValue(this.color)
          .setPlaceholder("#4a9eff")
          .onChange((value) => {
            if (/^#[0-9A-F]{6}$/i.test(value) || value === "") {
              this.color = value || "#4a9eff";
            }
          });
        text.inputEl.type = "color";
        text.inputEl.style.width = "100px";
      });

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText("Save")
          .setCta()
          .onClick(() => {
            this.submit();
          })
      )
      .addButton((btn) =>
        btn.setButtonText("Cancel").onClick(() => {
          this.close();
        })
      );
  }

  submit() {
    if (this.name && this.name.trim()) {
      this.onSubmit(this.name.trim(), this.description.trim(), this.color);
      this.close();
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

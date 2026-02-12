import { App, Modal, Setting } from "obsidian";

export class AddHabitModal extends Modal {
  result: string = "";
  onSubmit: (result: string) => void;

  constructor(app: App, onSubmit: (result: string) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h2", { text: "Add New Habit" });

    new Setting(contentEl)
      .setName("Habit name")
      .addText((text) => {
        text.setPlaceholder("e.g., Exercise for 30 minutes")
          .onChange((value) => {
            this.result = value;
          });
        text.inputEl.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            this.submit();
          }
        });
        // Focus the input field
        setTimeout(() => text.inputEl.focus(), 10);
      });

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText("Add")
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
    if (this.result && this.result.trim()) {
      this.onSubmit(this.result.trim());
      this.close();
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

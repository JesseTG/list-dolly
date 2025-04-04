/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ListItemMoverPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");

// moveListItemModal.ts
var import_obsidian2 = require("obsidian");

// utils/markdownUtils.ts
function extractListItem(editor, startLine) {
  const content = editor.getValue();
  const lines = content.split("\n");
  if (startLine >= lines.length) {
    return { listItem: "", startLine: 0, endLine: 0 };
  }
  const currentLine = lines[startLine];
  const currentIndent = currentLine.match(/^\s*/)[0].length;
  let endLine = startLine;
  for (let i = startLine + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "" || line.match(/^\s*/)[0].length <= currentIndent && /^\s*[-*]\s|^\s*\d+\.\s/.test(line)) {
      break;
    }
    endLine = i;
  }
  const listItem = lines.slice(startLine, endLine + 1).join("\n");
  return { listItem, startLine, endLine };
}
function removeListItemAtPosition(editor, startLine, endLine) {
  const content = editor.getValue();
  const lines = content.split("\n");
  const newContent = [
    ...lines.slice(0, startLine),
    ...lines.slice(endLine + 1)
  ].join("\n");
  editor.setValue(newContent);
}
function getHeadingsFromContent(content) {
  const headings = [];
  const lines = content.split("\n");
  let position = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(#{1,6})\s+(.*?)(?:\s+#+)?$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      headings.push({ text, level, position });
    }
    position += line.length + 1;
  }
  return headings;
}

// utils/fileUtils.ts
var import_obsidian = require("obsidian");
async function getAllMarkdownFiles(app) {
  const markdownFiles = [];
  function traverseFolder(folder) {
    for (const child of folder.children) {
      if (child instanceof import_obsidian.TFile && child.extension === "md") {
        markdownFiles.push(child);
      } else if (child instanceof import_obsidian.TFolder) {
        traverseFolder(child);
      }
    }
  }
  traverseFolder(app.vault.getRoot());
  return markdownFiles;
}

// moveListItemModal.ts
var MoveListItemModal = class extends import_obsidian2.Modal {
  constructor(app, sourceFile, listItem, onSubmit) {
    super(app);
    this.selectedHeading = null;
    this.createNewHeading = false;
    this.newHeadingName = "";
    this.destinationFile = sourceFile;
    this.listItem = listItem;
    this.onSubmit = onSubmit;
  }
  async onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Move List Item" });
    const markdownFiles = await getAllMarkdownFiles(this.app);
    let headings = [];
    new import_obsidian2.Setting(contentEl).setName("Destination file").setDesc("Select the file to move the list item to").addDropdown(async (dropdown) => {
      markdownFiles.forEach((file) => {
        dropdown.addOption(file.path, file.basename);
      });
      dropdown.setValue(this.destinationFile.path);
      dropdown.onChange(async (value) => {
        const file = markdownFiles.find((f) => f.path === value);
        if (file) {
          this.destinationFile = file;
          const content2 = await this.app.vault.read(file);
          headings = getHeadingsFromContent(content2);
          const headingDropdown = contentEl.querySelector(".heading-dropdown");
          if (headingDropdown) {
            const currentSelection = headingDropdown.value;
            while (headingDropdown.firstChild) {
              headingDropdown.removeChild(headingDropdown.firstChild);
            }
            const noHeadingOption = document.createElement("option");
            noHeadingOption.value = "";
            noHeadingOption.textContent = "No heading (file root)";
            headingDropdown.appendChild(noHeadingOption);
            headings.forEach((heading) => {
              const option = document.createElement("option");
              option.value = heading.text;
              const indent = "  ".repeat(heading.level - 1);
              option.textContent = `${indent}${heading.text}`;
              headingDropdown.appendChild(option);
            });
            if (currentSelection && headings.some((h) => h.text === currentSelection)) {
              headingDropdown.value = currentSelection;
            } else {
              headingDropdown.value = "";
              this.selectedHeading = null;
            }
          }
        }
      });
      const content = await this.app.vault.read(this.destinationFile);
      headings = getHeadingsFromContent(content);
    });
    const headingSetting = new import_obsidian2.Setting(contentEl).setName("Destination heading").setDesc("Select the heading to place the list item under").addDropdown(async (dropdown) => {
      dropdown.selectEl.classList.add("heading-dropdown");
      dropdown.addOption("", "No heading (file root)");
      const content = await this.app.vault.read(this.destinationFile);
      headings = getHeadingsFromContent(content);
      headings.forEach((heading) => {
        const indent = "  ".repeat(heading.level - 1);
        dropdown.addOption(heading.text, `${indent}${heading.text}`);
      });
      dropdown.onChange((value) => {
        this.selectedHeading = value || null;
        if (value === "new") {
          newHeadingField.settingEl.style.display = "flex";
        } else {
          newHeadingField.settingEl.style.display = "none";
        }
      });
    });
    new import_obsidian2.Setting(contentEl).setName("Create new heading").setDesc("Create a new heading to place the list item under").addToggle((toggle) => {
      toggle.setValue(this.createNewHeading);
      toggle.onChange((value) => {
        this.createNewHeading = value;
        if (value) {
          newHeadingField.settingEl.style.display = "flex";
        } else {
          newHeadingField.settingEl.style.display = "none";
        }
      });
    });
    const newHeadingField = new import_obsidian2.Setting(contentEl).setName("New heading name").setDesc("Enter the name for the new heading").addText((text) => {
      text.setValue(this.newHeadingName);
      text.onChange((value) => {
        this.newHeadingName = value;
      });
    });
    newHeadingField.settingEl.style.display = "none";
    contentEl.createEl("h3", { text: "List item preview" });
    const previewEl = contentEl.createDiv();
    previewEl.addClass("list-item-preview");
    previewEl.createEl("pre", { text: this.listItem });
    previewEl.style.maxHeight = "150px";
    previewEl.style.overflow = "auto";
    previewEl.style.border = "1px solid var(--background-modifier-border)";
    previewEl.style.borderRadius = "4px";
    previewEl.style.padding = "8px";
    previewEl.style.backgroundColor = "var(--background-secondary)";
    const buttonDiv = contentEl.createDiv();
    buttonDiv.addClass("list-item-mover-buttons");
    buttonDiv.style.display = "flex";
    buttonDiv.style.justifyContent = "flex-end";
    buttonDiv.style.marginTop = "1rem";
    const cancelButton = buttonDiv.createEl("button", { text: "Cancel" });
    cancelButton.addEventListener("click", () => {
      this.close();
    });
    const moveButton = buttonDiv.createEl("button", { text: "Move Item" });
    moveButton.addClass("mod-cta");
    moveButton.style.marginLeft = "0.5rem";
    moveButton.addEventListener("click", () => {
      let headingToUse = this.selectedHeading;
      if (this.createNewHeading && this.newHeadingName) {
        headingToUse = this.newHeadingName;
      }
      this.onSubmit(this.destinationFile, headingToUse, this.createNewHeading);
      this.close();
    });
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
};

// main.ts
var ListItemMoverPlugin = class extends import_obsidian3.Plugin {
  async onload() {
    console.log("Loading List Item Mover plugin");
    this.registerEvent(
      // @ts-ignore - The 'editor-menu' event exists in Obsidian but the type isn't properly defined
      this.app.workspace.on("editor-menu", (menu, editor, view) => {
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);
        if (/^\s*[-*]\s|^\s*\d+\.\s/.test(line)) {
          menu.addItem((item) => {
            item.setTitle("Move list item").setIcon("arrow-right-circle").onClick(async () => {
              const file = view.file;
              if (!file) return;
              const { listItem, startLine, endLine } = extractListItem(editor, cursor.line);
              if (!listItem) {
                return;
              }
              const modal = new MoveListItemModal(
                this.app,
                file,
                listItem,
                async (destinationFile, heading, createNewHeading) => {
                  await this.moveListItem(
                    file,
                    destinationFile,
                    listItem,
                    heading,
                    createNewHeading,
                    startLine,
                    endLine,
                    editor
                  );
                }
              );
              modal.open();
            });
          });
        }
      })
    );
  }
  async moveListItem(sourceFile, destinationFile, listItem, heading, createNewHeading, startLine, endLine, editor) {
    let destinationContent = await this.app.vault.read(destinationFile);
    if (createNewHeading && heading) {
      destinationContent += `

## ${heading}

${listItem}`;
    } else if (heading) {
      const headings = getHeadingsFromContent(destinationContent);
      const headingIndex = headings.findIndex((h) => h.text === heading);
      if (headingIndex !== -1) {
        let insertPosition;
        if (headingIndex < headings.length - 1) {
          insertPosition = headings[headingIndex + 1].position;
        } else {
          insertPosition = destinationContent.length;
        }
        const beforeInsert = destinationContent.substring(0, insertPosition);
        const afterInsert = destinationContent.substring(insertPosition);
        const needsNewline = !beforeInsert.endsWith("\n\n");
        destinationContent = beforeInsert + (needsNewline ? "\n\n" : "") + listItem + (afterInsert.startsWith("\n") ? "" : "\n") + afterInsert;
      } else {
        destinationContent += `

## ${heading}

${listItem}`;
      }
    } else {
      destinationContent += `

${listItem}`;
    }
    await this.app.vault.modify(destinationFile, destinationContent);
    if (sourceFile !== destinationFile) {
      removeListItemAtPosition(editor, startLine, endLine);
    } else {
      const activeLeaf = this.app.workspace.getActiveViewOfType(import_obsidian3.MarkdownView);
      const activeWorkspaceLeaf = this.app.workspace.activeLeaf;
      if (activeLeaf && activeWorkspaceLeaf) {
        await activeWorkspaceLeaf.setViewState({
          type: "markdown",
          state: activeLeaf.getState()
        });
      }
    }
    const sourceName = sourceFile.basename;
    const destinationName = destinationFile.basename;
    new import_obsidian3.Notice(
      `List item moved ${sourceFile !== destinationFile ? `from "${sourceName}" to "${destinationName}"` : "successfully"}`
    );
  }
  onunload() {
    console.log("Unloading List Item Mover plugin");
  }
};

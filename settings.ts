import {App, PluginSettingTab, Setting} from "obsidian";
import ListItemMoverPlugin from "./main";

export interface ListItemMoverSettings {
    fileRegexPattern: string;
}

export const DEFAULT_SETTINGS: ListItemMoverSettings = {
    fileRegexPattern: ''
};

export class ListItemMoverSettingTab extends PluginSettingTab {
    plugin: ListItemMoverPlugin;

    constructor(app: App, plugin: ListItemMoverPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();

        containerEl.createEl('h2', {text: 'List Dolly Settings'});

        new Setting(containerEl)
            .setName('File filter regex pattern')
            .setDesc('Regular expression to filter files in the destination selector. Leave empty to show all files. Example: "folder1|folder2" to only show files in folder1 or folder2.')
            .addText(text => text
                .setPlaceholder('.*')
                .setValue(this.plugin.settings.fileRegexPattern)
                .onChange(async (value) => {
                    this.plugin.settings.fileRegexPattern = value;
                    await this.plugin.saveSettings();
                }));

        containerEl.createEl('div', {
            text: 'Note: You can override this setting in any file by adding this to its frontmatter:',
            cls: 'setting-item-description'
        });

        const codeEl = containerEl.createEl('pre');
        codeEl.createEl('code', {
            text: '---\nlist-dolly-file-regex: your-regex-here\n---'
        });
    }
}

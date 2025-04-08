import {
    Plugin,
    MarkdownView,
    Menu,
    TFile,
    Editor,
    MenuItem,
    Notice,
    MarkdownFileInfo, EditorPosition, Loc, Pos, HeadingCache, ListItemCache,
} from 'obsidian';
import {MoveListItemModal} from './moveListItemModal';
import {
    getSubstringFromPos, insertItemIntoString, removeItemFromString
} from './utils/markdownUtils';
import {DEFAULT_SETTINGS, ListItemMoverSettings, ListItemMoverSettingTab} from "./settings";

const NOTICE_DURATION = 3000; // Duration for notices in milliseconds
const REGEX_FRONTMATTER_KEY = 'list-dolly-file-regex';

export default class ListItemMoverPlugin extends Plugin {
    settings: ListItemMoverSettings;

    async onload() {
        console.log('Loading List Dolly plugin');

        // Load settings
        await this.loadSettings();

        // Add settings tab
        this.addSettingTab(new ListItemMoverSettingTab(this.app, this));

        // Register context menu event
        this.registerEvent(
            this.app.workspace.on('editor-menu', this.onEditorMenu.bind(this)),
        );
    }

    private onEditorMenu(menu: Menu, editor: Editor, view: MarkdownView | MarkdownFileInfo) {
        // Check if we're in a list item by getting the current line
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);
        const file = view.file;

        // Simple check if the line is a list item (starts with -, *, or number.)
        if (file && /^\s*[-*]\s|^\s*\d+\.\s/.test(line)) {
            console.debug(`${line} at ${file.path}:${cursor.line}:${cursor.ch} is a list item, adding context menu item`);
            menu.addItem((item: MenuItem) => {
                item.setTitle('Move list item')
                    .setIcon('list-video')
                    .onClick(this.moveListItemCallback(file, cursor));
            });
        }
    }

    private moveListItemCallback(file: TFile, cursor: EditorPosition) {
        console.debug(`Creating callback to move the list item at ${file.path}:${cursor.line}:${cursor.ch}`, cursor, file);
        return async (_evt: MouseEvent | KeyboardEvent) => {
            console.debug(`Handling click event to move the list item at ${file.path}:${cursor.line}:${cursor.ch}`, _evt, cursor, file);
            // Get this file's metadata
            const metadata = this.app.metadataCache.getFileCache(file);
            if (!metadata) {
                const message = `Couldn't find cached metadata for ${file.path}`;
                new Notice(message, NOTICE_DURATION);
                throw new Error(message);
            }

            // Get the list items from the metadata
            const listItems = metadata?.listItems;
            if (!listItems) {
                const message = `No list items found in ${file.path}`;
                new Notice(message, NOTICE_DURATION);
                throw new Error(message);
            }

            // Get the list item at the current cursor position
            const listItem = listItems.find(item =>
                item.position.start.line <= cursor.line && cursor.line <= item.position.end.line
            );
            if (!listItem) {
                // If there is no list item here...
                const message = `No list item found at line ${cursor.line}`;
                new Notice(message, NOTICE_DURATION);
                throw new Error(message);
            }

            // TODO: Get child list items so we can move those, too

            const regex = this.getEffectiveRegex(file);

            // Open modal for destination selection
            const modal = new MoveListItemModal(
                this.app,
                regex,
                async (destinationFile, heading) => {
                    await this.moveListItem(
                        file,
                        destinationFile,
                        listItem,
                        heading
                    );
                }
            );
            modal.open();
        };
    }

    private getEffectiveRegex(file: TFile): RegExp | null {
        // Check if there's a frontmatter override in the active file

        const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
        if (frontmatter && frontmatter[REGEX_FRONTMATTER_KEY]) {
            try {
                return new RegExp(frontmatter[REGEX_FRONTMATTER_KEY]);
            } catch (e) {
                if (e instanceof SyntaxError) {
                    new Notice(`Regex in frontmatter property "${REGEX_FRONTMATTER_KEY}" is invalid: ${frontmatter[REGEX_FRONTMATTER_KEY]}, falling back to global settings instead.`, NOTICE_DURATION);
                }
            }
        }

        try {
            // Return the global setting regex if no override found, or if it's not valid
            return new RegExp(this.settings.fileRegexPattern);
        } catch (e) {
            if (e instanceof SyntaxError) {
                new Notice(`Global regex setting is invalid: ${this.settings.fileRegexPattern}. Please fix it in the settings.`, NOTICE_DURATION);
                return null; // Return null if the regex is invalid
            } else {
                throw e; // rethrow if it's not a SyntaxError
            }
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async moveListItem(
        sourceFile: TFile,
        targetFile: TFile,
        listItem: ListItemCache,
        targetHeading: HeadingCache | null
    ) {
        // Get the content of the destination file
        const targetMetadata = this.app.metadataCache.getFileCache(targetFile);
        if (!targetMetadata) {
            const message = `Couldn't find cached metadata for ${targetFile.path}`;
            new Notice(message, NOTICE_DURATION);
            throw new Error(message);
        }

        if (targetHeading) {
            // If there's a specific heading
            const sourceFileContents = await this.app.vault.read(sourceFile);
            const item = getSubstringFromPos(sourceFileContents, listItem.position);

            // Index of the section object that represents the chosen heading
            const targetSectionIndex = targetMetadata.sections?.findIndex(s => targetHeading.position.start.offset === s.position.start.offset);
            // TODO: Handle case where targetSectionIndex is -1 or undefined

            // array.at() returns undefined for out-of-bounds indexes
            const targetPos = targetMetadata.sections?.at(targetSectionIndex! + 1)?.position?.end ?? targetHeading.position.end;

            // TODO: Handle the case where targetFile == sourceFile
            await this.insertItemIntoFile(targetFile, item, targetPos);
            await this.removeItemFromFile(sourceFile, listItem.position);
        }

        const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
        const activeWorkspaceLeaf = this.app.workspace.activeLeaf;
        if (activeLeaf && activeWorkspaceLeaf) {
            await activeWorkspaceLeaf.setViewState({
                type: 'markdown',
                state: activeLeaf.getState()
            });
        }

        // Notify the user
        const sourceName = sourceFile.basename;
        const destinationName = targetFile.basename;

        // Show notification
        new Notice(
            `List item moved ${sourceFile !== targetFile ? `from "${sourceName}" to "${destinationName}"` : 'successfully'}`,
            NOTICE_DURATION
        );
    }

    private async insertItemIntoFile(file: TFile, item: string, loc: Loc) {
        return await this.app.vault.process(file, data => {
            return insertItemIntoString(data, item, loc);
        });
    }

    private async removeItemFromFile(file: TFile, itemPos: Pos) {
        return await this.app.vault.process(file, data => {
            return removeItemFromString(data, itemPos);
        });
    }

    onunload() {
        console.log('Unloading List Dolly');
    }
}



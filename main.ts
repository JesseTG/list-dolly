import {
    Plugin,
    MarkdownView,
    Menu,
    TFile,
    Editor,
    MenuItem,
    Notice,
    MarkdownFileInfo, EditorPosition,
} from 'obsidian';
import {MoveListItemModal} from './moveListItemModal';
import {
    extractListItem,
    getHeadingsFromContent,
    removeListItemAtPosition
} from './utils/markdownUtils';
import {DEFAULT_SETTINGS, ListItemMoverSettings, ListItemMoverSettingTab} from "./settings";

const NOTICE_DURATION = 3000; // Duration for notices in milliseconds
const REGEX_FRONTMATTER_KEY = 'list-dolly-file-regex';

export default class ListItemMoverPlugin extends Plugin {
    settings: ListItemMoverSettings;

    async onload() {
        console.log('Loading List Item Mover plugin');

        // Load settings
        await this.loadSettings();

        // Add settings tab
        this.addSettingTab(new ListItemMoverSettingTab(this.app, this));

        // Register context menu event
        this.registerEvent(
            this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor, view: MarkdownView | MarkdownFileInfo) => {
                // Check if we're in a list item by getting the current line
                const cursor = editor.getCursor();
                const line = editor.getLine(cursor.line);
                const file = view.file;

                // Simple check if the line is a list item (starts with -, *, or number.)
                if (file && /^\s*[-*]\s|^\s*\d+\.\s/.test(line)) {
                    menu.addItem((item: MenuItem) => {
                        item.setTitle('Move list item')
                            .setIcon('list-video')
                            .onClick(this.moveListItemCallback(editor, cursor, file));
                    });
                }
            })
        );
    }

    private moveListItemCallback(editor: Editor, cursor: EditorPosition, file: TFile) {
        return async (_evt: MouseEvent | KeyboardEvent) => {
            // Extract the list item and its subitems
            const {listItem, startLine, endLine} = extractListItem(editor, cursor.line);

            if (!listItem) {
                throw new Error(`No list item found at ${cursor.line}`);
            }

            let regex = this.getEffectiveRegex(file);

            // Open modal for destination selection
            const modal = new MoveListItemModal(
                this.app,
                regex,
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
        };
    }

    private getEffectiveRegex(file: TFile) : RegExp | null {
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
        }
        catch (e) {
            if (e instanceof SyntaxError) {
                new Notice(`Global regex setting is invalid: ${this.settings.fileRegexPattern}. Please fix it in the settings.`, NOTICE_DURATION);
                return null; // Return null if the regex is invalid
            }
            else {
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
        destinationFile: TFile,
        listItem: string,
        heading: string | null,
        createNewHeading: boolean,
        startLine: number,
        endLine: number,
        editor: Editor
    ) {
        // Get the content of the destination file
        let destinationContent = await this.app.vault.read(destinationFile);

        // If we need to create a new heading
        if (createNewHeading && heading) {
            // Add the new heading at the end of the file with list item
            destinationContent += `\n\n## ${heading}\n\n${listItem}`;
        } else if (heading) {
            // Find the heading in the destination file
            const headings = getHeadingsFromContent(destinationContent);
            const headingIndex = headings.findIndex(h => h.text === heading);

            if (headingIndex !== -1) {
                // Find where to insert the list item (at the end of the section)
                let insertPosition: number;

                if (headingIndex < headings.length - 1) {
                    // Insert before the next heading
                    insertPosition = headings[headingIndex + 1].position;
                } else {
                    // Insert at the end of the file
                    insertPosition = destinationContent.length;
                }

                // Insert the list item
                const beforeInsert = destinationContent.substring(0, insertPosition);
                const afterInsert = destinationContent.substring(insertPosition);

                // Check if we need to add a newline before inserting
                const needsNewline = !beforeInsert.endsWith('\n\n');
                destinationContent = beforeInsert + (needsNewline ? '\n\n' : '') + listItem + (afterInsert.startsWith('\n') ? '' : '\n') + afterInsert;
            } else {
                // Heading not found, add it at the end
                destinationContent += `\n\n## ${heading}\n\n${listItem}`;
            }
        } else {
            // No heading specified, add to the end of the file
            destinationContent += `\n\n${listItem}`;
        }

        // Update the destination file
        await this.app.vault.modify(destinationFile, destinationContent);

        // Remove the list item from the source file if it's not the same as destination
        if (sourceFile !== destinationFile) {
            // Remove from source
            removeListItemAtPosition(editor, startLine, endLine);
        } else {
            // If same file, reload the editor to reflect changes
            const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
            const activeWorkspaceLeaf = this.app.workspace.activeLeaf;
            if (activeLeaf && activeWorkspaceLeaf) {
                await activeWorkspaceLeaf.setViewState({
                    type: 'markdown',
                    state: activeLeaf.getState()
                });
            }
        }

        // Notify the user
        const sourceName = sourceFile.basename;
        const destinationName = destinationFile.basename;

        // Show notification
        new Notice(
            `List item moved ${sourceFile !== destinationFile ? `from "${sourceName}" to "${destinationName}"` : 'successfully'}`
        );
    }

    onunload() {
        console.log('Unloading List Item Mover plugin');
    }
}



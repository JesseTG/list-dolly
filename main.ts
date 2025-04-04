import { 
    Plugin, 
    MarkdownView, 
    Menu, 
    TFile, 
    Editor, 
    MenuItem, 
    WorkspaceLeaf
} from 'obsidian';
import { MoveListItemModal } from './moveListItemModal';
import { 
    extractListItem, 
    getHeadingsFromContent, 
    getListsUnderHeading,
    removeListItemAtPosition
} from './utils/markdownUtils';
import { getAllMarkdownFiles } from './utils/fileUtils';

export default class ListItemMoverPlugin extends Plugin {
    async onload() {
        console.log('Loading List Item Mover plugin');

        // Register context menu event
        this.registerEvent(
            this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor, view: MarkdownView) => {
                // Check if we're in a list item by getting the current line
                const cursor = editor.getCursor();
                const line = editor.getLine(cursor.line);
                
                // Simple check if the line is a list item (starts with -, *, or number.)
                if (/^\s*[-*]\s|^\s*\d+\.\s/.test(line)) {
                    menu.addItem((item: MenuItem) => {
                        item.setTitle('Move list item')
                        .setIcon('arrow-right-circle')
                        .onClick(async () => {
                            // Get the current file
                            const file = view.file;
                            if (!file) return;

                            // Extract the list item and its subitems
                            const { listItem, startLine, endLine } = extractListItem(editor, cursor.line);
                            
                            if (!listItem) {
                                return;
                            }

                            // Open modal for destination selection
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
            if (activeLeaf) {
                await this.app.workspace.activeLeaf.setViewState({
                    type: 'markdown',
                    state: activeLeaf.getState(),
                    popstate: true
                });
            }
        }
        
        // Notify the user
        const sourceName = sourceFile.basename;
        const destinationName = destinationFile.basename;
        
        this.app.notices.show(
            `List item moved ${sourceFile !== destinationFile ? `from "${sourceName}" to "${destinationName}"` : 'successfully'}`
        );
    }

    onunload() {
        console.log('Unloading List Item Mover plugin');
    }
}

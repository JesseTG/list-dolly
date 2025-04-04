import { App, TFile, TFolder } from 'obsidian';

/**
 * Gets all markdown files in the vault
 */
export async function getAllMarkdownFiles(app: App): Promise<TFile[]> {
    const markdownFiles: TFile[] = [];
    
    // Recursively traverse the vault
    function traverseFolder(folder: TFolder) {
        for (const child of folder.children) {
            if (child instanceof TFile && child.extension === 'md') {
                markdownFiles.push(child);
            } else if (child instanceof TFolder) {
                traverseFolder(child);
            }
        }
    }
    
    traverseFolder(app.vault.getRoot());
    return markdownFiles;
}

/**
 * Formats a path for display in UI, focusing on readability
 */
export function formatPathForDisplay(path: string, maxLength: number = 40): string {
    if (path.length <= maxLength) {
        return path;
    }
    
    // Split the path and get the filename
    const parts = path.split('/');
    const fileName = parts.pop() || '';
    
    // Start with the filename
    let displayPath = fileName;
    
    // Add folders from the end until we reach maxLength
    for (let i = parts.length - 1; i >= 0; i--) {
        const withFolder = `${parts[i]}/${displayPath}`;
        
        if (withFolder.length > maxLength - 3) { // -3 for the "..."
            return `.../${displayPath}`;
        }
        
        displayPath = withFolder;
    }
    
    return displayPath;
}

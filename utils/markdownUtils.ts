import { Editor } from 'obsidian';

/**
 * Extracts a list item and its subitems starting from the given line
 */
export function extractListItem(editor: Editor, startLine: number): { listItem: string, startLine: number, endLine: number } {
    const content = editor.getValue();
    const lines = content.split('\n');
    
    if (startLine >= lines.length) {
        return { listItem: '', startLine: 0, endLine: 0 };
    }
    
    // Get the indentation level of the current line
    const currentLine = lines[startLine];
    const currentIndent = currentLine.match(/^\s*/)[0].length;
    
    // Find the end of the list item (including subitems)
    let endLine = startLine;
    for (let i = startLine + 1; i < lines.length; i++) {
        const line = lines[i];
        
        // If line is empty or has less indentation, we've reached the end
        if (line.trim() === '' || line.match(/^\s*/)[0].length <= currentIndent && /^\s*[-*]\s|^\s*\d+\.\s/.test(line)) {
            break;
        }
        
        endLine = i;
    }
    
    // Extract the list item and its subitems
    const listItem = lines.slice(startLine, endLine + 1).join('\n');
    
    return { listItem, startLine, endLine };
}

/**
 * Removes a list item and its subitems from the editor
 */
export function removeListItemAtPosition(editor: Editor, startLine: number, endLine: number): void {
    const content = editor.getValue();
    const lines = content.split('\n');
    
    // Remove the lines
    const newContent = [
        ...lines.slice(0, startLine),
        ...lines.slice(endLine + 1)
    ].join('\n');
    
    // Update the editor
    editor.setValue(newContent);
}

/**
 * Extracts all headings from the content with their levels and positions
 */
export function getHeadingsFromContent(content: string): { text: string, level: number, position: number }[] {
    const headings: { text: string, level: number, position: number }[] = [];
    const lines = content.split('\n');
    let position = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Match ATX headings (e.g. ## Heading)
        const match = line.match(/^(#{1,6})\s+(.*?)(?:\s+#+)?$/);
        
        if (match) {
            const level = match[1].length;
            const text = match[2].trim();
            headings.push({ text, level, position });
        }
        
        position += line.length + 1; // +1 for the newline
    }
    
    return headings;
}

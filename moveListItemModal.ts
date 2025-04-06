import {
    App,
    Modal,
    Setting,
    TFile,
    DropdownComponent,
    TextComponent,
    ToggleComponent
} from 'obsidian';
import {getHeadingsFromContent} from './utils/markdownUtils';

export class MoveListItemModal extends Modal {
    private destinationFile: TFile;
    private selectedHeading: string | null = null;
    private createNewHeading: boolean = false;
    private newHeadingName: string = '';
    private listItem: string;
    private fileRegexPattern: string;
    private onSubmit: (destinationFile: TFile, heading: string | null, createNewHeading: boolean) => void;

    constructor(
        app: App,
        sourceFile: TFile,
        listItem: string,
        fileRegexPattern: string,
        onSubmit: (destinationFile: TFile, heading: string | null, createNewHeading: boolean) => void
    ) {
        super(app);
        this.destinationFile = sourceFile;
        this.listItem = listItem;
        this.fileRegexPattern = fileRegexPattern;
        this.onSubmit = onSubmit;
    }

    async onOpen() {
        const {contentEl} = this;

        contentEl.createEl('h2', {text: 'Move List Item'});

        // Get files and apply regex filter if needed
        let markdownFiles = this.app.vault.getMarkdownFiles();

        if (this.fileRegexPattern) {
            try {
                const regex = new RegExp(this.fileRegexPattern);
                markdownFiles = markdownFiles.filter(file => regex.test(file.path));

                // Add notice if filter is active
                const filterNotice = contentEl.createDiv({cls: 'filter-notice'});
                filterNotice.createSpan({text: 'File filter active: ', cls: 'filter-label'});
                filterNotice.createSpan({text: this.fileRegexPattern, cls: 'filter-pattern'});

                // Style the filter notice
                filterNotice.style.backgroundColor = 'var(--background-secondary)';
                filterNotice.style.padding = '8px';
                filterNotice.style.borderRadius = '4px';
                filterNotice.style.marginBottom = '8px';
                filterNotice.style.fontSize = '0.8em';
            } catch (error) {
                // Invalid regex - show error message and fall back to showing all files
                console.error("Invalid regex pattern:", error);
                const errorNotice = contentEl.createDiv({cls: 'error-notice'});
                errorNotice.createSpan({text: 'Invalid regex pattern: ' + this.fileRegexPattern});
                errorNotice.style.color = 'var(--text-error)';
                errorNotice.style.marginBottom = '8px';
            }
        }

        // Sort files alphabetically
        markdownFiles = markdownFiles.toSorted((a, b) => a.name.localeCompare(b.name));
        let headings: { text: string, level: number }[] = [];

        // File selector
        new Setting(contentEl)
            .setName('Destination file')
            .setDesc('Select the file to move the list item to')
            .addDropdown(async (dropdown: DropdownComponent) => {
                // Add all markdown files to dropdown
                markdownFiles.forEach(file => {
                    dropdown.addOption(file.path, file.basename);
                });

                // Set current file as default if it's in the filtered list, otherwise set first file
                if (markdownFiles.some(f => f.path === this.destinationFile.path)) {
                    dropdown.setValue(this.destinationFile.path);
                } else if (markdownFiles.length > 0) {
                    this.destinationFile = markdownFiles[0];
                    dropdown.setValue(this.destinationFile.path);
                }

                // Update headings when file changes
                dropdown.onChange(async (value) => {
                    const file = markdownFiles.find(f => f.path === value);
                    if (file) {
                        this.destinationFile = file;

                        // Update headings dropdown
                        const content = await this.app.vault.read(file);
                        headings = getHeadingsFromContent(content);

                        // Clear and rebuild headings dropdown
                        const headingDropdown = contentEl.querySelector('.heading-dropdown') as HTMLSelectElement;
                        if (headingDropdown) {
                            // Save current selection if possible
                            const currentSelection = headingDropdown.value;

                            // Clear dropdown
                            while (headingDropdown.firstChild) {
                                headingDropdown.removeChild(headingDropdown.firstChild);
                            }

                            // Add "No heading" option
                            const noHeadingOption = document.createElement('option');
                            noHeadingOption.value = '';
                            noHeadingOption.textContent = 'No heading (file root)';
                            headingDropdown.appendChild(noHeadingOption);

                            // Add headings
                            headings.forEach(heading => {
                                const option = document.createElement('option');
                                option.value = heading.text;
                                // Add indentation based on heading level
                                const indent = '  '.repeat(heading.level - 1);
                                option.textContent = `${indent}${heading.text}`;
                                headingDropdown.appendChild(option);
                            });

                            // Try to restore selection if heading exists in new file
                            if (currentSelection && headings.some(h => h.text === currentSelection)) {
                                headingDropdown.value = currentSelection;
                            } else {
                                headingDropdown.value = '';
                                this.selectedHeading = null;
                            }
                        }
                    }
                });

                // Initialize headings for the current file
                const content = await this.app.vault.read(this.destinationFile);
                headings = getHeadingsFromContent(content);
            });

        // Heading selector
        const headingSetting = new Setting(contentEl)
            .setName('Destination heading')
            .setDesc('Select the heading to place the list item under')
            .addDropdown(async (dropdown: DropdownComponent) => {
                // Add class for easy reference
                dropdown.selectEl.classList.add('heading-dropdown');

                // Add "No heading" option
                dropdown.addOption('', 'No heading (file root)');

                // Add headings from the initial file
                const content = await this.app.vault.read(this.destinationFile);
                headings = getHeadingsFromContent(content);
                headings.forEach(heading => {
                    const indent = '  '.repeat(heading.level - 1);
                    dropdown.addOption(heading.text, `${indent}${heading.text}`);
                });

                dropdown.onChange(value => {
                    this.selectedHeading = value || null;

                    // Hide/show new heading field based on selection
                    if (value === 'new') {
                        newHeadingField.settingEl.style.display = 'flex';
                    } else {
                        newHeadingField.settingEl.style.display = 'none';
                    }
                });
            });

        // Create new heading toggle
        new Setting(contentEl)
            .setName('Create new heading')
            .setDesc('Create a new heading to place the list item under')
            .addToggle((toggle: ToggleComponent) => {
                toggle.setValue(this.createNewHeading);
                toggle.onChange(value => {
                    this.createNewHeading = value;
                    if (value) {
                        newHeadingField.settingEl.style.display = 'flex';
                    } else {
                        newHeadingField.settingEl.style.display = 'none';
                    }
                });
            });

        // New heading name field
        const newHeadingField = new Setting(contentEl)
            .setName('New heading name')
            .setDesc('Enter the name for the new heading')
            .addText((text: TextComponent) => {
                text.setValue(this.newHeadingName);
                text.onChange(value => {
                    this.newHeadingName = value;
                });
            });

        // Hide by default
        newHeadingField.settingEl.style.display = 'none';

        // Preview section
        contentEl.createEl('h3', {text: 'List item preview'});
        const previewEl = contentEl.createDiv();
        previewEl.addClass('list-item-preview');
        previewEl.createEl('pre', {text: this.listItem});

        // Add some styling to the preview
        previewEl.style.maxHeight = '150px';
        previewEl.style.overflow = 'auto';
        previewEl.style.border = '1px solid var(--background-modifier-border)';
        previewEl.style.borderRadius = '4px';
        previewEl.style.padding = '8px';
        previewEl.style.backgroundColor = 'var(--background-secondary)';

        // Buttons
        const buttonDiv = contentEl.createDiv();
        buttonDiv.addClass('list-item-mover-buttons');
        buttonDiv.style.display = 'flex';
        buttonDiv.style.justifyContent = 'flex-end';
        buttonDiv.style.marginTop = '1rem';

        // Cancel button
        const cancelButton = buttonDiv.createEl('button', {text: 'Cancel'});
        cancelButton.addEventListener('click', () => {
            this.close();
        });

        // Move button
        const moveButton = buttonDiv.createEl('button', {text: 'Move Item'});
        moveButton.addClass('mod-cta');
        moveButton.style.marginLeft = '0.5rem';
        moveButton.addEventListener('click', () => {
            let headingToUse = this.selectedHeading;

            if (this.createNewHeading && this.newHeadingName) {
                headingToUse = this.newHeadingName;
            }

            this.onSubmit(this.destinationFile, headingToUse, this.createNewHeading);
            this.close();
        });
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}


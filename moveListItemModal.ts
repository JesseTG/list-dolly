import {
    App,
    TFile,
    HeadingCache, FuzzySuggestModal
} from 'obsidian';

type MoveTarget = {
    file: TFile;
    heading: HeadingCache | null;
};

type OnSubmitCallback = (destinationFile: TFile, heading: string | null, createNewHeading: boolean) => void;

export class MoveListItemModal extends FuzzySuggestModal<MoveTarget> {
    private createNewHeading: boolean = false;
    private newHeadingName: string = '';
    private readonly fileRegex: RegExp | null;
    private readonly onSubmit: OnSubmitCallback;

    constructor(
        app: App,
        fileRegexPattern: RegExp | null,
        onSubmit: OnSubmitCallback
    ) {
        super(app);
        this.fileRegex = fileRegexPattern;
        this.onSubmit = onSubmit;
        this.setPlaceholder("Choose destination file and heading");
        this.setInstructions([
            {command: "↑↓", purpose: "to navigate"},
            {command: "↵", purpose: "to select destination"},
            {command: "esc", purpose: "to cancel"}
        ]);
        this.limit = 50;
    }

    getItems(): MoveTarget[] {
        // Get files and apply regex filter if needed
        let markdownFiles = this.app.vault.getMarkdownFiles();

        if (this.fileRegex) {
            markdownFiles = markdownFiles.filter(file => this.fileRegex!.test(file.path));
        }

        // Sort files alphabetically
        markdownFiles = markdownFiles.toSorted((a, b) => a.path.localeCompare(b.path));

        let moveTargets: MoveTarget[] = [];

        for (const file of markdownFiles) {
            let metadata = this.app.metadataCache.getFileCache(file);
            if (!metadata || !metadata.headings) {
                continue;
            }

            // Add root of file as a target
            moveTargets.push({
                file: file,
                heading: null
            });

            // Add each heading as a target
            for (const heading of metadata.headings) {
                moveTargets.push({
                    file: file,
                    heading: heading,
                });
            }
        }

        return moveTargets;
    }

    getItemText(item: MoveTarget): string {
        if (!item.heading) {
            return `${item.file.path} (root)`;
        }

        const indent = "  ".repeat(item.heading.level - 1);
        return `${item.file.path} > ${indent}${item.heading.heading}`;
    }

    onChooseItem(item: MoveTarget, _evt: MouseEvent | KeyboardEvent): void {
        const destinationFile = item.file;
        let selectedHeading = item.heading?.heading ?? null;

        if (this.createNewHeading && this.newHeadingName) {
            selectedHeading = this.newHeadingName;
        }

        this.onSubmit(destinationFile, selectedHeading, this.createNewHeading);
    }
}

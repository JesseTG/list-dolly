import {
    AbstractInputSuggest,
    App,
    FuzzyMatch,
    prepareFuzzySearch,
    renderResults,
    sortSearchResults,
    TFile
} from "obsidian";

type FuzzyInputSuggestOptions = {
    blurOnSelect: boolean;
    closeOnSelect: boolean;
}

const DEFAULT_FUZZY_INPUT_SUGGEST_OPTIONS: FuzzyInputSuggestOptions = {
    blurOnSelect: true,
    closeOnSelect: true,
};

export abstract class FuzzyInputSuggest<T> extends AbstractInputSuggest<FuzzyMatch<T>> {
    inputEl: HTMLInputElement;
    options: FuzzyInputSuggestOptions;

    constructor(app: App, inputEl: HTMLInputElement, options?: Partial<FuzzyInputSuggestOptions>) {
        super(app, inputEl);
        this.inputEl = inputEl;
        this.options = Object.assign(DEFAULT_FUZZY_INPUT_SUGGEST_OPTIONS, options);
    }

    abstract getItems(): T[];
    abstract getItemText(item: T): string;

    getSuggestions(query: string) {
        const search = prepareFuzzySearch(query.trim());
        const items = this.getItems();

        const results: FuzzyMatch<T>[] = [];

        for (const item of items) {
            const match = search(this.getItemText(item));
            if (match) results.push({ match, item });
        }

        sortSearchResults(results);

        return results;
    }

    renderSuggestion(result: FuzzyMatch<T>, el: HTMLElement) {
        renderResults(el, this.getItemText(result.item), result.match);
    }

    selectSuggestion(result: FuzzyMatch<T>, evt: MouseEvent | KeyboardEvent) {
        // @ts-ignore
        super.selectSuggestion(result, evt); // this ts-ignore is needed due to a bug in Obsidian's type definition
        this.inputEl.value = this.getItemText(result.item);
        if (this.options.blurOnSelect) this.inputEl.blur();
        if (this.options.closeOnSelect) this.close();
    }
}

export class FileListFuzzyInputSuggest extends FuzzyInputSuggest<TFile> {
    private readonly files: TFile[];

    constructor(app: App, inputEl: HTMLInputElement, files: TFile[], options?: Partial<FuzzyInputSuggestOptions>) {
        super(app, inputEl, options);
        this.files = files;
    }

    getItems() {
        return this.files;
    }

    getItemText(file: TFile) {
        return file.path;
    }
}

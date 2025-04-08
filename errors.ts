import {TFile} from "obsidian";

export class NoCachedMetadataError extends Error {
    readonly file: TFile;

    constructor(file: TFile) {
        super(`No cached metadata found for ${file.path}`);
        this.file = file;
    }
}

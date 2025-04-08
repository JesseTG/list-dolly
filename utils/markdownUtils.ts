import {Loc, Pos} from 'obsidian';

export function insertItemIntoString(source: string, item: string, loc: Loc) {
    return source.slice(0, loc.offset) + '\n' + item.trim() + source.slice(loc.offset);
}

export function getSubstringFromPos(str: string, pos: Pos) {
    return str.substring(pos.start.offset, pos.end.offset);
}

export function removeItemFromString(source: string, itemPos: Pos) {
    return source.slice(0, itemPos.start.offset) + source.slice(itemPos.end.offset).trimStart();
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.placePosToCell = placePosToCell;
exports.placePosFromCell = placePosFromCell;
const core_1 = require("@ton/core");
function placePosToCell(data) {
    if (!data) {
        return null;
    }
    return (0, core_1.beginCell)()
        .storeAddress(data.parent)
        .storeUint(data.pos, 32)
        .endCell();
}
function placePosFromCell(cell) {
    if (!cell) {
        return null;
    }
    const s = cell.beginParse();
    return {
        parent: s.loadAddress(),
        pos: s.loadUint(32)
    };
}

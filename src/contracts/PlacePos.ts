import { Address, beginCell, Cell } from "@ton/core";

/* _#_ parent:MsgAddress pos:uint32 = PlacePos; */
export type PlacePos = {
    parent: Address,
    pos: number,
}

export function placePosToCell(data: PlacePos | null) {
    if (!data) {
        return null;
    }

    return beginCell()
        .storeAddress(data.parent)
        .storeUint(data.pos, 32)
        .endCell();
}

export function placePosFromCell(cell: Cell | null) {
    if (!cell) {
        return null;
    }

    const s = cell.beginParse();

    return {
        parent: s.loadAddress(),
        pos: s.loadUint(32)
    }
}
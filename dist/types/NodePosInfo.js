"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeInfo = void 0;
class TreeInfo {
    constructor(root, nextPos, locks) {
        this.root = root;
        this.nextPos = nextPos;
        this.locks = locks;
    }
    getNodePosInfo(parentRow, mp) {
        const lockMps = this.locks.map((lock) => lock.mp);
        const isRoot = mp === this.root.mp;
        const isNextPos = mp === `${this.nextPos.mp}${this.nextPos.filling}`;
        const pos = Number(mp[mp.length - 1]);
        const siblingMp = pos == 0 ?
            mp.substring(0, mp.length - 1) + "1" :
            mp.substring(0, mp.length - 1) + "0";
        const canBuy = mp.startsWith(this.root.mp);
        const isLock = lockMps.some((lockMp) => mp === lockMp);
        const isLocked = lockMps.some((lockMp) => mp.startsWith(lockMp));
        let canLock = !isLocked;
        if (canLock && lockMps.some((lockMp) => siblingMp === lockMp))
            canLock = false;
        if (canLock && isRoot)
            canLock = false;
        if (canLock && !mp.startsWith(this.root.mp))
            canLock = false;
        if (canLock && !parentRow)
            canLock = false; // if no parent above
        if (canLock && parentRow && parentRow.filling == 0)
            canLock = false; // cannot lock any pos of an empty parent 
        return {
            pos: pos,
            isRoot: isRoot,
            isLock: isLock,
            isLocked: isLocked,
            canLock: canLock,
            isNextPos: isNextPos,
            canBuy: canBuy
        };
    }
}
exports.TreeInfo = TreeInfo;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChunkDictValueSerializer = void 0;
exports.flattenSnakeCell = flattenSnakeCell;
exports.makeSnakeCell = makeSnakeCell;
exports.encodeOffChainContent = encodeOffChainContent;
exports.ParseChunkDict = ParseChunkDict;
const core_1 = require("@ton/core");
const OFF_CHAIN_CONTENT_PREFIX = 0x01;
function flattenSnakeCell(cell) {
    let c = cell;
    const buffers = [];
    while (c) {
        const slice = c.beginParse();
        // Read current chunk of data
        const bits = slice.remainingBits;
        if (bits > 0) {
            const bytesToRead = Math.floor(bits / 8);
            if (bytesToRead > 0) {
                const chunk = slice.loadBuffer(bytesToRead);
                buffers.push(chunk);
            }
        }
        // Move to next referenced cell, if any
        if (slice.remainingRefs > 0) {
            c = slice.loadRef();
        }
        else {
            c = null;
        }
    }
    return Buffer.concat(buffers);
}
function bufferToChunks(buff, chunkSize) {
    const chunks = [];
    while (buff.byteLength > 0) {
        chunks.push(buff.slice(0, chunkSize));
        // eslint-disable-next-line no-param-reassign
        buff = buff.slice(chunkSize);
    }
    return chunks;
}
function makeSnakeCell(data) {
    const chunks = bufferToChunks(data, 127);
    if (chunks.length === 0) {
        return (0, core_1.beginCell)().endCell();
    }
    if (chunks.length === 1) {
        return (0, core_1.beginCell)().storeBuffer(chunks[0]).endCell();
    }
    let curCell = (0, core_1.beginCell)();
    for (let i = chunks.length - 1; i >= 0; i--) {
        const chunk = chunks[i];
        curCell.storeBuffer(chunk);
        if (i - 1 >= 0) {
            const nextCell = (0, core_1.beginCell)();
            nextCell.storeRef(curCell);
            curCell = nextCell;
        }
    }
    return curCell.endCell();
}
function encodeOffChainContent(content) {
    let data = Buffer.from(content);
    const offChainPrefix = Buffer.from([OFF_CHAIN_CONTENT_PREFIX]);
    data = Buffer.concat([offChainPrefix, data]);
    return makeSnakeCell(data);
}
exports.ChunkDictValueSerializer = {
    serialize(src, builder) {
    },
    parse(src) {
        const snake = flattenSnakeCell(src.loadRef());
        return { content: snake };
    },
};
function ParseChunkDict(cell) {
    const dict = cell.loadDict(core_1.Dictionary.Keys.Uint(32), exports.ChunkDictValueSerializer);
    let buf = Buffer.alloc(0);
    for (const [_, v] of dict) {
        buf = Buffer.concat([buf, v.content]);
    }
    return buf;
}

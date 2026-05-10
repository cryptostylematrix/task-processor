"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NFTDictValueSerializer = exports.ChunkDictValueSerializer = void 0;
const nftContent_1 = require("./nftContent");
exports.ChunkDictValueSerializer = {
    serialize(src, builder) {
    },
    parse(src) {
        const snake = (0, nftContent_1.flattenSnakeCell)(src.loadRef());
        return { content: snake };
    },
};
exports.NFTDictValueSerializer = {
    serialize(src, builder) {
    },
    parse(src) {
        const ref = src.loadRef().asSlice();
        const start = ref.loadUint(8);
        if (start === 0) {
            const snake = (0, nftContent_1.flattenSnakeCell)(ref.asCell());
            return { content: snake };
        }
        if (start === 1) {
            return { content: (0, nftContent_1.ParseChunkDict)(ref) };
        }
        return { content: Buffer.from([]) };
    },
};

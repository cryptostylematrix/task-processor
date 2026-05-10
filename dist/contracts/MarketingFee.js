"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.feeConfigFromCell = exports.feeConfigToCell = void 0;
const core_1 = require("@ton/core");
const FeeCodec = {
    serialize(src, builder) {
        builder.storeCoins(src);
    },
    parse(src) {
        const fee = src.loadCoins();
        return fee;
    },
};
const feeConfigToCell = (feeConfig) => {
    const dict = core_1.Dictionary.empty(core_1.Dictionary.Keys.Uint(8), FeeCodec);
    feeConfig.forEach((val, key) => {
        dict.set(key, val);
    });
    return dict;
};
exports.feeConfigToCell = feeConfigToCell;
const feeConfigFromCell = (cell) => {
    const feeConfig = new Map();
    if (!cell) {
        return feeConfig;
    }
    const dict = core_1.Dictionary.loadDirect(core_1.Dictionary.Keys.Uint(8), FeeCodec, cell);
    const keys = dict.keys();
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const val = dict.get(key);
        if (val !== undefined) {
            feeConfig.set(key, val);
        }
    }
    return feeConfig;
};
exports.feeConfigFromCell = feeConfigFromCell;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matrixConfigFromCell = exports.matrixConfigToCell = void 0;
const core_1 = require("@ton/core");
const MarketingReward_1 = require("./MarketingReward");
/*
    _#_ price: Coins
        owner_address: MsgAddress
        royalty_numerator: uint16
        royalty_denominator: uint16
        width: uint8,
        height: uint8,
        code: ^Cell,
        rewards (HashmapE 8 RewardConfig)
        name: Cell = MatrixConfig;
*/
const MatrixConfigCodec = {
    serialize(src, builder) {
        builder.storeCoins(src.price);
        builder.storeAddress(src.ownerAddress);
        builder.storeUint(src.royaltyNumerator, 16);
        builder.storeUint(src.royaltyDenominator, 16);
        builder.storeUint(src.width, 8);
        builder.storeUint(src.height, 8);
        builder.storeRef(src.code);
        builder.storeDict((0, MarketingReward_1.rewardConfigToCell)(src.rewards));
        builder.storeStringTail(src.name);
    },
    parse(src) {
        const price = src.loadCoins();
        const ownerAddress = src.loadAddress();
        const royaltyNumerator = src.loadUint(16);
        const royaltyDenominator = src.loadUint(16);
        const width = src.loadUint(8);
        const height = src.loadUint(8);
        const code = src.loadRef();
        const rewardsCell = src.loadMaybeRef();
        const rewards = (0, MarketingReward_1.rewardConfigFromCell)(rewardsCell);
        const name = src.loadStringTail();
        return { price, ownerAddress, royaltyNumerator, royaltyDenominator, width, height, code, name, rewards };
    },
};
const matrixConfigToCell = (matrixConfig) => {
    const dict = core_1.Dictionary.empty(core_1.Dictionary.Keys.Uint(8), MatrixConfigCodec);
    matrixConfig.forEach((val, key) => {
        dict.set(key, val);
    });
    return dict;
};
exports.matrixConfigToCell = matrixConfigToCell;
const matrixConfigFromCell = (cell) => {
    const matrixConfig = new Map();
    if (!cell) {
        return matrixConfig;
    }
    const dict = core_1.Dictionary.loadDirect(core_1.Dictionary.Keys.Uint(8), MatrixConfigCodec, cell);
    const keys = dict.keys();
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const val = dict.get(key);
        if (val !== undefined) {
            matrixConfig.set(key, val);
        }
    }
    return matrixConfig;
};
exports.matrixConfigFromCell = matrixConfigFromCell;

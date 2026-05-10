"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewardConfigFromCell = exports.rewardConfigToCell = void 0;
const core_1 = require("@ton/core");
const serializeReward = (reward) => {
    const b = (0, core_1.beginCell)();
    // clone#1  m:uint8  count:uint8 = Reward;
    if (reward.tag == "1__clone") {
        b.storeUint(1, 4);
        b.storeUint(reward.m, 8);
        b.storeUint(reward.count, 8);
    }
    // reinvest#2 = Reward;
    else if (reward.tag == "2__reinvest") {
        b.storeUint(2, 4);
    }
    // struct_bonus#3 amount:Coins = Reward;
    else if (reward.tag == "3__struct_bonus") {
        b.storeUint(3, 4);
        b.storeCoins(reward.amount);
    }
    // ref_bonus#4  amount:Coins  = Reward;
    else if (reward.tag == "4__ref_bonus") {
        b.storeUint(4, 4);
        b.storeCoins(reward.amount);
    }
    // dev_bonus#5  amount:Coins = Reward;
    else if (reward.tag == "5__dev_bonus") {
        b.storeUint(5, 4);
        b.storeCoins(reward.amount);
    }
    // move_or_bonus#7  amount:Coins  = Reward;
    else if (reward.tag == "6__move__or__bonus") {
        b.storeUint(6, 4);
        b.storeCoins(reward.amount);
    }
    return b;
};
const deserializeReward = (s) => {
    const tag = s.loadUint(4);
    if (tag == 1) {
        return {
            tag: "1__clone",
            m: s.loadUint(8),
            count: s.loadUint(8)
        };
    }
    if (tag == 2) {
        return {
            tag: "2__reinvest"
        };
    }
    if (tag == 3) {
        return {
            tag: "3__struct_bonus",
            amount: s.loadCoins()
        };
    }
    if (tag == 4) {
        return {
            tag: "4__ref_bonus",
            amount: s.loadCoins()
        };
    }
    if (tag == 5) {
        return {
            tag: "5__dev_bonus",
            amount: s.loadCoins()
        };
    }
    if (tag == 6) {
        return {
            tag: "6__move__or__bonus",
            amount: s.loadCoins()
        };
    }
    throw "Unknow tag";
};
/*
Stores all rewards in one cell.
The longest one has 136 bits which means there's enough place to store at least 7 longest rewards.
*/
const RewardsCodec = {
    serialize(src, builder) {
        src.map((v, i, arr) => builder.storeBuilder(serializeReward(v)));
    },
    parse(src) {
        const rewards = [];
        while (src.remainingBits > 0) {
            rewards.push(deserializeReward(src));
        }
        return rewards;
    }
};
const rewardConfigToCell = (rewardConfig) => {
    const dict = core_1.Dictionary.empty(core_1.Dictionary.Keys.Uint(8), RewardsCodec);
    rewardConfig.forEach((val, key) => {
        dict.set(key, val);
    });
    return dict;
};
exports.rewardConfigToCell = rewardConfigToCell;
const rewardConfigFromCell = (cell) => {
    const rewardConfig = new Map();
    if (!cell) {
        return rewardConfig;
    }
    const dict = core_1.Dictionary.loadDirect(core_1.Dictionary.Keys.Uint(8), RewardsCodec, cell);
    const keys = dict.keys();
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const val = dict.get(key);
        if (val !== undefined) {
            rewardConfig.set(key, val);
        }
    }
    return rewardConfig;
};
exports.rewardConfigFromCell = rewardConfigFromCell;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueFromCell = exports.queueToCell = exports.taskFromCell = exports.taskToCell = void 0;
const core_1 = require("@ton/core");
const PlacePos_1 = require("./PlacePos");
const serializeTaskPayload = (p, builder) => {
    builder.storeUint(p.tag, 4); // tag fits in 4 bits, safe
    switch (p.tag) {
        // buy_place#1  source: MsgAddress  amount: Coins  first:Bool  pos: (Maybe ^PlacePos) = MarketingTaskPayload;
        case 1: { // buy_place
            builder.storeAddress(p.source);
            builder.storeCoins(p.amount);
            builder.storeBit(p.first);
            const posCell = (0, PlacePos_1.placePosToCell)(p.pos);
            builder.storeMaybeRef(posCell);
            break;
        }
        // create_clone#2 = MarketingTaskPayload;
        case 2: { // create_clone
            // no fields
            break;
        }
        // lock_pos#3  source:MsgAddress  pos:^PlacePos = MarketingTaskPayload;
        case 3: { // lock_pos
            builder.storeAddress(p.source);
            builder.storeRef((0, PlacePos_1.placePosToCell)(p.pos));
            break;
        }
        // unlock_pos#4  source:MsgAddress  pos:^PlacePos = MarketingTaskPayload;
        case 4: { // unlock_pos
            builder.storeAddress(p.source);
            builder.storeRef((0, PlacePos_1.placePosToCell)(p.pos));
            break;
        }
        // jetton_bonus#5  amount:Coins  place_number:#  title:Any = MarketingTaskPayload;
        case 5: { // jetton_bonus
            builder.storeCoins(p.amount);
            builder.storeUint(p.placeNumber, 32);
            builder.storeStringTail(p.title);
            break;
        }
        // reinvest#6 = MarketingTaskPayload;
        case 6: { // reinvest
            // no fields
            break;
        }
        // move_or_bonus#7  amount:Coins  place_number:#  title:Any = MarketingTaskPayload;
        case 7: { // move_or_bonus
            builder.storeCoins(p.amount);
            builder.storeUint(p.placeNumber, 32);
            builder.storeStringTail(p.title);
            break;
        }
    }
};
const deserializeTaskPayload = (s) => {
    const tag = s.loadUint(4);
    switch (tag) {
        // buy_place#1  source: MsgAddress  amount: Coins  first:Bool  pos: (Maybe ^PlacePos) = MarketingTaskPayload;
        case 1: {
            const source = s.loadAddress();
            const amount = s.loadCoins();
            const first = s.loadBoolean();
            const posCell = s.loadMaybeRef();
            const pos = (0, PlacePos_1.placePosFromCell)(posCell);
            return { tag: 1, source, amount, first, pos };
        }
        // create_clone#2 = MarketingTaskPayload;
        case 2: {
            return { tag: 2 };
        }
        // lock_pos#3  source:MsgAddress  pos:^PlacePos = MarketingTaskPayload;
        case 3: {
            const source = s.loadAddress();
            const posCell = s.loadRef();
            const pos = (0, PlacePos_1.placePosFromCell)(posCell);
            return { tag: 3, source, pos };
        }
        // unlock_pos#4  source:MsgAddress  pos:^PlacePos = MarketingTaskPayload;
        case 4: {
            const source = s.loadAddress();
            const posCell = s.loadRef();
            const pos = (0, PlacePos_1.placePosFromCell)(posCell);
            return { tag: 4, source, pos };
        }
        // jetton_bonus#5  amount:Coins  place_number:#  title:Any = MarketingTaskPayload;
        case 5: {
            const amount = s.loadCoins();
            const placeNumber = s.loadUint(32);
            const title = s.loadStringTail();
            return { tag: 5, amount, placeNumber, title };
        }
        // reinvest#6 = MarketingTaskPayload;
        case 6: {
            return { tag: 6 };
        }
        // move_or_bonus#7  amount:Coins  place_number:#  title:Any = MarketingTaskPayload;
        case 7: {
            const amount = s.loadCoins();
            const placeNumber = s.loadUint(32);
            const title = s.loadStringTail();
            return { tag: 7, amount, placeNumber, title };
        }
        default:
            throw new Error(`Unknown MultiTask payload tag: ${tag}`);
    }
};
//  _#_ query_id:uint64  m:Matrix  profile:MsgAddress  payload:MultiTaskPayload = MarketingTask;
const serializeTask = (src, builder) => {
    builder.storeUint(src.queryId, 64);
    builder.storeUint(src.m, 8);
    builder.storeAddress(src.profile);
    serializeTaskPayload(src.payload, builder);
};
//  _#_ query_id:uint64  m:Matrix  profile:MsgAddress  payload:MultiTaskPayload = MarketingTask;
const deserializeTask = (s) => {
    const queryId = s.loadUintBig(64);
    const m = s.loadUint(8);
    const profile = s.loadAddress();
    const payload = deserializeTaskPayload(s);
    return { queryId, m, profile, payload };
};
const taskToCell = (src) => {
    const builder = (0, core_1.beginCell)();
    serializeTask(src, builder);
    return builder.endCell();
};
exports.taskToCell = taskToCell;
const taskFromCell = (cell) => {
    if (!cell)
        return null;
    return deserializeTask(cell.beginParse());
};
exports.taskFromCell = taskFromCell;
const MarketingTaskCodec = {
    serialize(src, builder) {
        serializeTask(src, builder);
    },
    parse(s) {
        return deserializeTask(s);
    },
};
const queueToCell = (matrixConfig) => {
    const dict = core_1.Dictionary.empty(core_1.Dictionary.Keys.Uint(32), MarketingTaskCodec);
    matrixConfig.forEach((val, key) => {
        dict.set(key, val);
    });
    return dict;
};
exports.queueToCell = queueToCell;
const queueFromCell = (cell) => {
    const queue = new Map();
    if (!cell) {
        return queue;
    }
    const dict = core_1.Dictionary.loadDirect(core_1.Dictionary.Keys.Uint(32), MarketingTaskCodec, cell);
    const keys = dict.keys();
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const val = dict.get(key);
        if (val !== undefined) {
            queue.set(key, val);
        }
    }
    return queue;
};
exports.queueFromCell = queueFromCell;

import { Address, beginCell, Builder, Cell, Dictionary, Slice } from "@ton/core";
import { PlacePos, placePosFromCell, placePosToCell } from "./PlacePos";

// buy_place#1  source: MsgAddress  amount: Coins  first:Bool  pos: (Maybe ^PlacePos) = MarketingTaskPayload;
export type BuyPlaceMarketingTaskPayload = {
    tag: 1;
    source: Address;
    amount: bigint;
    first: boolean;
    pos: PlacePos | null;
};

// create_clone#2 = MarketingTaskPayload;
export type CreateCloneMarketingTaskPayload = {
    tag: 2;
};

// lock_pos#3  source:MsgAddress  pos:^PlacePos = MarketingTaskPayload;
export type LockPosMarketingTaskPayload = {
    tag: 3;
    source: Address;
    pos: PlacePos;
};

// unlock_pos#4  source:MsgAddress  pos:^PlacePos = MarketingTaskPayload;
export type UnlockPosMarketingTaskPayload = {
    tag: 4;
    source: Address;
    pos: PlacePos;
};

// jetton_bonus#5  amount:Coins  place_number:#  title:Any = MarketingTaskPayload;
export type JettonBonusTaskPayload = {
    tag: 5;
    amount: bigint;
    placeNumber: number,
    title: string;
};

// reinvest#6 = MarketingTaskPayload;
export type ReinvestTaskPayload = {
    tag: 6;
};

// move_or_bonus#7  amount:Coins  place_number:#  title:Any = MarketingTaskPayload;
export type MoveOrBonusTaskPayload = {
    tag: 7;
    amount: bigint;
    placeNumber: number,
    title: string;
};

export type MarketingTaskPayload =
    | BuyPlaceMarketingTaskPayload
    | CreateCloneMarketingTaskPayload
    | LockPosMarketingTaskPayload
    | UnlockPosMarketingTaskPayload
    | JettonBonusTaskPayload
    | ReinvestTaskPayload
    | MoveOrBonusTaskPayload;


const serializeTaskPayload = (p: MarketingTaskPayload, builder: Builder) => {
    builder.storeUint(p.tag, 4);   // tag fits in 4 bits, safe

    switch (p.tag) {
        // buy_place#1  source: MsgAddress  amount: Coins  first:Bool  pos: (Maybe ^PlacePos) = MarketingTaskPayload;
        case 1: { // buy_place
            builder.storeAddress(p.source);
            builder.storeCoins(p.amount);
            builder.storeBit(p.first);
            const posCell = placePosToCell(p.pos);
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
            builder.storeRef(placePosToCell(p.pos)!);
            break;
        }

        // unlock_pos#4  source:MsgAddress  pos:^PlacePos = MarketingTaskPayload;
        case 4: { // unlock_pos
            builder.storeAddress(p.source);
            builder.storeRef(placePosToCell(p.pos)!);
            break;
        }

         // jetton_bonus#5  amount:Coins  place_number:#  title:Any = MarketingTaskPayload;
        case 5: { // jetton_bonus
            builder.storeCoins(p.amount);
            builder.storeUint(p.placeNumber, 32)
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
            builder.storeUint(p.placeNumber, 32)
            builder.storeStringTail(p.title);
            break;
        }
    }
};

const deserializeTaskPayload = (s: Slice): MarketingTaskPayload => {
    const tag = s.loadUint(4);

    switch (tag) {
        // buy_place#1  source: MsgAddress  amount: Coins  first:Bool  pos: (Maybe ^PlacePos) = MarketingTaskPayload;
        case 1: {
            const source = s.loadAddress();
            const amount = s.loadCoins();
            const first = s.loadBoolean();
            const posCell = s.loadMaybeRef();
            const pos = placePosFromCell(posCell);
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
            const pos = placePosFromCell(posCell)!;
            return { tag: 3, source, pos };
        }

        // unlock_pos#4  source:MsgAddress  pos:^PlacePos = MarketingTaskPayload;
        case 4: {
            const source = s.loadAddress();
            const posCell = s.loadRef();
            const pos = placePosFromCell(posCell)!;
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

export type MarketingTask = {
    queryId: number | bigint;
    m: number;
    profile: Address;
    payload: MarketingTaskPayload;
}    

//  _#_ query_id:uint64  m:Matrix  profile:MsgAddress  payload:MultiTaskPayload = MarketingTask;
const serializeTask = (src: MarketingTask, builder: Builder) => {
    builder.storeUint(src.queryId, 64);
    builder.storeUint(src.m, 8);
    builder.storeAddress(src.profile);

    serializeTaskPayload(src.payload, builder);
};

//  _#_ query_id:uint64  m:Matrix  profile:MsgAddress  payload:MultiTaskPayload = MarketingTask;
const deserializeTask = (s: Slice): MarketingTask => {

    const queryId = s.loadUintBig(64);
    const m = s.loadUint(8);
    const profile = s.loadAddress();
    const payload = deserializeTaskPayload(s);

    return { queryId, m, profile, payload };
};


export const taskToCell = (src: MarketingTask) : Cell => {
    const builder = beginCell();
    serializeTask(src, builder);
    return builder.endCell();
}

export const taskFromCell = (cell: Cell | null): MarketingTask | null => {
    if (!cell) return null;
    return deserializeTask(cell.beginParse());
};


export type QueueItem = {
    key: number | null,
    val: MarketingTask | null,
    flag: number
}

const MarketingTaskCodec = {
    serialize(src: MarketingTask, builder: Builder) {
       serializeTask(src, builder)
    },

    parse(s: Slice): MarketingTask {
        return deserializeTask(s);
    },
};


export const queueToCell = (matrixConfig: Map<number, MarketingTask>) => {
    const dict = Dictionary.empty(Dictionary.Keys.Uint(32), MarketingTaskCodec);
    matrixConfig.forEach((val, key) => {
        dict.set(key, val);
    });
    return dict;
}

export const queueFromCell = (cell: Cell | null) : Map<number, MarketingTask> => {
    const queue = new Map<number, MarketingTask>();
    if (!cell)
    {
        return queue;
    }

    const dict = Dictionary.loadDirect(Dictionary.Keys.Uint(32), MarketingTaskCodec, cell);
    const keys = dict.keys();
    for (let i = 0; i < keys.length; i++) 
    {
        const key = keys[i];
        const val = dict.get(key);

        if (val !== undefined) {
            queue.set(key, val);
        }
    }

    return queue;
}
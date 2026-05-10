import { Builder, Cell, Dictionary, Slice } from "@ton/core";

const FeeCodec = {
    serialize(src: bigint, builder: Builder) {
        builder.storeCoins(src);
    },
    parse(src: Slice): bigint {
        const fee = src.loadCoins();
        return fee;
    },
}

export const feeConfigToCell = (feeConfig: Map<number, bigint>) => {
    const dict = Dictionary.empty(Dictionary.Keys.Uint(8), FeeCodec);
    feeConfig.forEach((val, key) => {
        dict.set(key, val);
    });
    return dict;
}

export const feeConfigFromCell = (cell: Cell | null) : Map<number, bigint> => {
    const feeConfig = new Map<number, bigint>();
    if (!cell)
    {
        return feeConfig;
    }

    const dict = Dictionary.loadDirect(Dictionary.Keys.Uint(8), FeeCodec, cell);
    const keys = dict.keys();
    for (let i = 0; i < keys.length; i++) 
    {
        const key = keys[i];
        const val = dict.get(key);

        if (val !== undefined) {
            feeConfig.set(key, val);
        }
    }

    return feeConfig;
}
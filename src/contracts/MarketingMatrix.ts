import { Address, Builder, Cell, Dictionary, Slice } from "@ton/core";
import { Reward, rewardConfigFromCell, rewardConfigToCell } from "./MarketingReward";



export type MatrixConfig = {
    price: bigint,
    ownerAddress: Address,
    royaltyNumerator: number,
    royaltyDenominator: number,
    width: number,
    height: number,
    code: Cell,
    rewards: Map<number, Reward[]>,
    name: string, // 20 symbols max
}

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
  serialize(src: MatrixConfig, builder: Builder) {
    builder.storeCoins(src.price);
    builder.storeAddress(src.ownerAddress);
    builder.storeUint(src.royaltyNumerator, 16);
    builder.storeUint(src.royaltyDenominator, 16);
    builder.storeUint(src.width, 8);
    builder.storeUint(src.height, 8);
    builder.storeRef(src.code);
    builder.storeDict(rewardConfigToCell(src.rewards));
    builder.storeStringTail(src.name);
  },
  parse(src: Slice): MatrixConfig {
    const price = src.loadCoins();
    const ownerAddress = src.loadAddress();
    const royaltyNumerator = src.loadUint(16);
    const royaltyDenominator = src.loadUint(16);
    const width = src.loadUint(8);
    const height = src.loadUint(8);
    const code = src.loadRef();
    const rewardsCell = src.loadMaybeRef();
    const rewards = rewardConfigFromCell(rewardsCell);
    const name = src.loadStringTail();
    return { price, ownerAddress, royaltyNumerator, royaltyDenominator, width, height, code, name, rewards };
  },
};

export const matrixConfigToCell = (matrixConfig: Map<number, MatrixConfig>) => {
    const dict = Dictionary.empty(Dictionary.Keys.Uint(8), MatrixConfigCodec);
    matrixConfig.forEach((val, key) => {
        dict.set(key, val);
    });
    return dict;
}

export const matrixConfigFromCell = (cell: Cell | null) : Map<number, MatrixConfig> => {
    const matrixConfig = new Map<number, MatrixConfig>();
    if (!cell)
    {
        return matrixConfig;
    }

    const dict = Dictionary.loadDirect(Dictionary.Keys.Uint(8), MatrixConfigCodec, cell);
    const keys = dict.keys();
    for (let i = 0; i < keys.length; i++) 
    {
        const key = keys[i];
        const val = dict.get(key);

        if (val !== undefined) {
            matrixConfig.set(key, val);
        }
    }

    return matrixConfig;
}
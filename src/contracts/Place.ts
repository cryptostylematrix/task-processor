import {
    Address,
    beginCell,
    Builder,
    Cell,
    Contract,
    ContractABI,
    contractAddress,
    ContractProvider,
    Dictionary,
    ExternalAddress,
    Sender,
    SendMode,
    Slice,
    toNano
} from '@ton/core';
import { Op } from './MatrixConstants';

export type PlaceConfig = {
    marketingAddress: Address,
    m: number,
    parentAddress: Address | null,
    pos: number
};
      
/*
    initial#_
        marketing_address: MsgAddress
        m: uint8
        parent_address: MsgAddress
        pos: # = PlaceStorage; 
*/

export function placeConfigToCell(config: PlaceConfig): Cell {
    return beginCell()
        .storeAddress(config.marketingAddress)
        .storeUint(config.m, 8)
        .storeAddress(config.parentAddress)
        .storeUint(config.pos, 32)
        .endCell();
}


// _#_ kind:(## 4)  profile_address:MsgAddress  place_number:#  inviter_profile_address:MsgAddress = PlaceInfo;
export type PlaceInfo = {
    kind: number,
    profileAddress: Address,
    placeNumber: number,
    inviterProfileAddress: Address | null | ExternalAddress
}

export function placeInfoToCell(info: PlaceInfo | null | undefined): Cell {
    if (!info)
        return beginCell().endCell();

    return beginCell()
        .storeUint(info.kind, 4)
        .storeAddress(info.profileAddress)
        .storeUint(info.placeNumber, 32)
        .storeAddress(info.inviterProfileAddress)
        .endCell();
}

export function placeInfoFromCell(cell: Cell | null | undefined): PlaceInfo | null {
    if (!cell)
        return null;

    const slice = cell.beginParse();

    return {
        kind: slice.loadUint(4),
        profileAddress: slice.loadAddress(),
        placeNumber: slice.loadUint(32),
        inviterProfileAddress: slice.loadAddressAny()
    };
}



export type PlaceDescendants = {

}

export function placeDescendantsToCell(descendants: PlaceDescendants | null): Cell | null {
    if (!descendants)
        return null;
    return beginCell()
        .endCell();
}

export function placeDescendantsFromCell(cell: Cell | null | undefined): PlaceDescendants | null {
    if (!cell)
        return null;

    const slice = cell.beginParse();

    return {
      
    };
}


/*  default#_
        marketing_address: MsgAddress
        m: uint8
        parent_address: MsgAddress
        pos: #

        seq_no: #
        width: uint8  
        height: uint8
        admin_address: MsgAddress
        info: ^PlaceInfo
        descendants (Maybe ^Cell) = PlaceStorage;   */

export type PlaceData = {
    init: boolean,
    marketingAddress: Address,
    m: number,
    parentAddress: Address | null,
    pos: number,

    seqNo: number,
    width: number,
    height: number,
    adminAddress: Address | null,
    info: PlaceInfo | null,
    descendants: PlaceDescendants | null
};

export function placeDataToCell(data: PlaceData): Cell {
    return beginCell()
        .storeAddress(data.marketingAddress)
        .storeUint(data.m, 8)
        .storeAddress(data.parentAddress)
        .storeUint(data.pos, 32)

        .storeUint(data.seqNo, 32)
        .storeUint(data.width, 8)
        .storeUint(data.height, 8)
        .storeAddress(data.adminAddress)
        .storeRef(placeInfoToCell(data.info))
        .storeMaybeRef(placeDescendantsToCell(data.descendants))
        .endCell();
}


export class Place implements Contract {
    abi: ContractABI = { name: 'Place' }

    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Place(address);
    }

    static createFromConfig(config: PlaceConfig, code: Cell, workchain = 0) {
        const data = placeConfigToCell(config);
        const init = { code, data };
        return new Place(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }


    async sendEmptyMsg(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    // init_place#_ width: uint8  height: uint8  admin_address: MsgAddress. info: ^PlaceInfo = MarketingInternalMsg;
    static initMessage(width: number, height: number, adminAddress: Address, info: Cell | PlaceInfo)
    {
        const b = beginCell()
            .storeUint(width, 8)
            .storeUint(height, 8)
            .storeAddress(adminAddress);

        if (info instanceof Cell)
            b.storeRef(info);
        else
            b.storeRef(placeInfoToCell(info));
        
        return b.endCell();
}

    async sendInit(provider: ContractProvider, via: Sender, width: number, height: number, adminAddress: Address, info: Cell | PlaceInfo, value: bigint = toNano('0.05')) {
        await provider.internal(via, {
            value,
            body: Place.initMessage(width, height, adminAddress, info),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
        });
    }

    // add_child#b62c4644 query_id:uint64  info:^PlaceInfo = MarketingInternalMsg;
    static addChildMessage(info: Cell, queryId: bigint | number = 0) {
        return beginCell()
            .storeUint(Op.add_child, 32)
            .storeUint(queryId, 64)
            .storeRef(info)
            .endCell();
    }
 
    async sendAddChild(provider: ContractProvider, via: Sender, info: Cell, value: bigint = toNano('0.01'), queryId: bigint | number = 0) {
        await provider.internal(via, {
            value,
            body: Place.addChildMessage(info, queryId),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            bounce: true
        });
    }


    // proxy#a11cdbe3  query_id:uint64  mode:uint8  msg:^Cell = MarketingInternalMsg;
    static proxyMessage(mode: number, msg: Cell, queryId: bigint | number = 0)
    {
        return beginCell()
            .storeUint(Op.proxy, 32)
            .storeUint(queryId, 64)
            .storeUint(mode, 8)
            .storeRef(msg)
            .endCell();
    }

    async sendProxy(provider: ContractProvider, via: Sender, mode: number, msg: Cell, value: bigint = toNano('0.01'), queryId: bigint | number = 0) {
        await provider.internal(via, {
            value,
            body: Place.proxyMessage(mode, msg, queryId),
            sendMode: SendMode.PAY_GAS_SEPARATELY
        });
    }

    // upgrade#53c57870  query_id:uint64  code:^Cell  data:^Cell = MarketingInternalMsg;
    static upgradeMessage(code: Cell, data: Cell, queryId: bigint | number = 0)
    {
        return beginCell()
            .storeUint(Op.upgrade, 32)
            .storeUint(queryId, 64)
            .storeRef(code)
            .storeRef(data)
            .endCell();
    }

    async sendUpgrade(provider: ContractProvider, via: Sender, code: Cell, data: Cell, value: bigint = toNano('0.05'), queryId: bigint | number = 0) {
        await provider.internal(via, {
            value,
            body: Place.upgradeMessage(code, data),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
        });
    }

    // update_admin#812e7b6a query_id:uint64  new_admin:MsgAddress = MarketingInternalMsg;
    static updateAdminMessage(admin: Address, queryId: bigint | number = 0)
    {
        return beginCell()
            .storeUint(Op.update_admin, 32)
            .storeUint(queryId, 64)
            .storeAddress(admin)
            .endCell();
    }

    async sendUpdateAdmin(provider: ContractProvider, via: Sender, admin: Address, value: bigint = toNano('0.05'), queryId: bigint | number = 0) {
        await provider.internal(via, {
            value,
            body: Place.updateAdminMessage(admin, queryId),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
        });
    }

    async sendCustomMsg(provider: ContractProvider, via: Sender, body: Cell, value: bigint = toNano('0.01')) {
         await provider.internal(via, {
            value,
            body: body,
            sendMode: SendMode.PAY_GAS_SEPARATELY
        });
    }
    

    async getPlaceData(provider: ContractProvider) : Promise<PlaceData> {
        const { stack } = await provider.get('get_place_data', []);

        return {
            init: stack.readNumber() != 0,
            marketingAddress: stack.readAddress(),
            m: stack.readNumber(),
            parentAddress: stack.readAddressOpt(),
            pos: stack.readNumber(),

            seqNo: stack.readNumber(),
            width: stack.readNumber(),
            height: stack.readNumber(),
            adminAddress: stack.readAddressOpt(),
            info: placeInfoFromCell(stack.readCellOpt()),
            descendants: placeDescendantsFromCell(stack.readCellOpt())
        };
    }

    // for upgrade tests
    async getValue(provider: ContractProvider): Promise<{ value: number }> {
        const { stack } = await provider.get('get_value', []);

        return {
            value: stack.readNumber(),
        };
    }
}
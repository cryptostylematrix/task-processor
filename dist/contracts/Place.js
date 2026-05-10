"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Place = void 0;
exports.placeConfigToCell = placeConfigToCell;
exports.placeInfoToCell = placeInfoToCell;
exports.placeInfoFromCell = placeInfoFromCell;
exports.placeDescendantsToCell = placeDescendantsToCell;
exports.placeDescendantsFromCell = placeDescendantsFromCell;
exports.placeDataToCell = placeDataToCell;
const core_1 = require("@ton/core");
const MatrixConstants_1 = require("./MatrixConstants");
/*
    initial#_
        marketing_address: MsgAddress
        m: uint8
        parent_address: MsgAddress
        pos: # = PlaceStorage;
*/
function placeConfigToCell(config) {
    return (0, core_1.beginCell)()
        .storeAddress(config.marketingAddress)
        .storeUint(config.m, 8)
        .storeAddress(config.parentAddress)
        .storeUint(config.pos, 32)
        .endCell();
}
function placeInfoToCell(info) {
    if (!info)
        return (0, core_1.beginCell)().endCell();
    return (0, core_1.beginCell)()
        .storeUint(info.kind, 4)
        .storeAddress(info.profileAddress)
        .storeUint(info.placeNumber, 32)
        .storeAddress(info.inviterProfileAddress)
        .endCell();
}
function placeInfoFromCell(cell) {
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
function placeDescendantsToCell(descendants) {
    if (!descendants)
        return null;
    return (0, core_1.beginCell)()
        .endCell();
}
function placeDescendantsFromCell(cell) {
    if (!cell)
        return null;
    const slice = cell.beginParse();
    return {};
}
function placeDataToCell(data) {
    return (0, core_1.beginCell)()
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
class Place {
    constructor(address, init) {
        this.address = address;
        this.init = init;
        this.abi = { name: 'Place' };
    }
    static createFromAddress(address) {
        return new Place(address);
    }
    static createFromConfig(config, code, workchain = 0) {
        const data = placeConfigToCell(config);
        const init = { code, data };
        return new Place((0, core_1.contractAddress)(workchain, init), init);
    }
    async sendDeploy(provider, via, value) {
        await provider.internal(via, {
            value,
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
            body: (0, core_1.beginCell)().endCell(),
        });
    }
    async sendEmptyMsg(provider, via, value) {
        await provider.internal(via, {
            value,
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
            body: (0, core_1.beginCell)().endCell(),
        });
    }
    // init_place#_ width: uint8  height: uint8  admin_address: MsgAddress. info: ^PlaceInfo = MarketingInternalMsg;
    static initMessage(width, height, adminAddress, info) {
        const b = (0, core_1.beginCell)()
            .storeUint(width, 8)
            .storeUint(height, 8)
            .storeAddress(adminAddress);
        if (info instanceof core_1.Cell)
            b.storeRef(info);
        else
            b.storeRef(placeInfoToCell(info));
        return b.endCell();
    }
    async sendInit(provider, via, width, height, adminAddress, info, value = (0, core_1.toNano)('0.05')) {
        await provider.internal(via, {
            value,
            body: Place.initMessage(width, height, adminAddress, info),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
        });
    }
    // add_child#b62c4644 query_id:uint64  info:^PlaceInfo = MarketingInternalMsg;
    static addChildMessage(info, queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(MatrixConstants_1.Op.add_child, 32)
            .storeUint(queryId, 64)
            .storeRef(info)
            .endCell();
    }
    async sendAddChild(provider, via, info, value = (0, core_1.toNano)('0.01'), queryId = 0) {
        await provider.internal(via, {
            value,
            body: Place.addChildMessage(info, queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
            bounce: true
        });
    }
    // proxy#a11cdbe3  query_id:uint64  mode:uint8  msg:^Cell = MarketingInternalMsg;
    static proxyMessage(mode, msg, queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(MatrixConstants_1.Op.proxy, 32)
            .storeUint(queryId, 64)
            .storeUint(mode, 8)
            .storeRef(msg)
            .endCell();
    }
    async sendProxy(provider, via, mode, msg, value = (0, core_1.toNano)('0.01'), queryId = 0) {
        await provider.internal(via, {
            value,
            body: Place.proxyMessage(mode, msg, queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY
        });
    }
    // upgrade#53c57870  query_id:uint64  code:^Cell  data:^Cell = MarketingInternalMsg;
    static upgradeMessage(code, data, queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(MatrixConstants_1.Op.upgrade, 32)
            .storeUint(queryId, 64)
            .storeRef(code)
            .storeRef(data)
            .endCell();
    }
    async sendUpgrade(provider, via, code, data, value = (0, core_1.toNano)('0.05'), queryId = 0) {
        await provider.internal(via, {
            value,
            body: Place.upgradeMessage(code, data),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
        });
    }
    // update_admin#812e7b6a query_id:uint64  new_admin:MsgAddress = MarketingInternalMsg;
    static updateAdminMessage(admin, queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(MatrixConstants_1.Op.update_admin, 32)
            .storeUint(queryId, 64)
            .storeAddress(admin)
            .endCell();
    }
    async sendUpdateAdmin(provider, via, admin, value = (0, core_1.toNano)('0.05'), queryId = 0) {
        await provider.internal(via, {
            value,
            body: Place.updateAdminMessage(admin, queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
        });
    }
    async sendCustomMsg(provider, via, body, value = (0, core_1.toNano)('0.01')) {
        await provider.internal(via, {
            value,
            body: body,
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY
        });
    }
    async getPlaceData(provider) {
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
    async getValue(provider) {
        const { stack } = await provider.get('get_value', []);
        return {
            value: stack.readNumber(),
        };
    }
}
exports.Place = Place;

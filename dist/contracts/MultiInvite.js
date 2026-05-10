"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiInvite = exports.MultiInviteOwner = void 0;
const core_1 = require("@ton/core");
const MultiConstants_1 = require("./MultiConstants");
const multiInviteOwnerFromCell = (cell) => {
    if (!cell) {
        return null;
    }
    const slice = cell.beginParse();
    return {
        owner: slice.loadAddress(),
        set_at: slice.loadUint(64)
    };
};
const multiInviteOwnerToCell = (data) => {
    if (!data) {
        return null;
    }
    return (0, core_1.beginCell)()
        .storeAddress(data.owner)
        .storeUint(data.set_at, 64)
        .endCell();
};
exports.MultiInviteOwner = {
    fromCell: multiInviteOwnerFromCell,
    toCell: multiInviteOwnerToCell,
};
class MultiInvite {
    constructor(address, init) {
        this.address = address;
        this.init = init;
    }
    static createFromAddress(address) {
        return new MultiInvite(address);
    }
    // add_referal#7a3eae1c = query_id:uint64 program:# seq_no:# invite:MsgAddress = InviteInternalMsg;
    static addReferalMessage(program, seqNo, invite, queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(MultiConstants_1.Op.add_referal, 32)
            .storeUint(queryId, 64)
            .storeUint(program, 32)
            .storeUint(seqNo, 32)
            .storeAddress(invite)
            .endCell();
    }
    async sendAddReferal(provider, via, program, seqNo, invite, value = (0, core_1.toNano)('0.05'), queryId = 0) {
        await provider.internal(via, {
            value,
            body: MultiInvite.addReferalMessage(program, seqNo, invite, queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY
        });
    }
    // set_owner#a31c7c0 query_id:uint64 owner:MsgAddress = InviteInternalMsg;
    static setOwnerMessage(owner, queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(MultiConstants_1.Op.set_owner, 32)
            .storeUint(queryId, 64)
            .storeAddress(owner)
            .endCell();
    }
    async sendSetOwner(provider, via, owner, value = (0, core_1.toNano)('0.05'), queryId = 0) {
        await provider.internal(via, {
            value,
            body: MultiInvite.setOwnerMessage(owner, queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY
        });
    }
    // proxy#536b3490 query_id:uint64  msg:^Cell = InviteInternalMsg;
    static proxyMessage(mode, msg, queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(MultiConstants_1.Op.proxy, 32)
            .storeUint(queryId, 64)
            .storeUint(mode, 8)
            .storeRef(msg)
            .endCell();
    }
    async sendProxy(provider, via, mode, msg, value = (0, core_1.toNano)('0.01'), queryId = 0) {
        await provider.internal(via, {
            value,
            body: MultiInvite.proxyMessage(mode, msg, queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY
        });
    }
    // update_admin#08a3447f9 query_id:uint64  new_admin:MsgAddress = InviteInternalMsg;
    static updateAdminMessage(admin, queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(MultiConstants_1.Op.update_admin, 32)
            .storeUint(queryId, 64)
            .storeAddress(admin)
            .endCell();
    }
    async sendUpdateAdmin(provider, via, admin, value = (0, core_1.toNano)('0.05'), queryId = 0) {
        await provider.internal(via, {
            value,
            body: MultiInvite.updateAdminMessage(admin, queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
        });
    }
    // upgrade#dbfaf817 query_id:uint64  code:^Cell  data:^Cell = InviteInternalMsg;
    static upgradeMessage(code, data, queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(MultiConstants_1.Op.upgrade, 32)
            .storeUint(queryId, 64)
            .storeRef(code)
            .storeRef(data)
            .endCell();
    }
    async sendUpgrade(provider, via, code, data, value = (0, core_1.toNano)('0.05')) {
        await provider.internal(via, {
            value,
            body: MultiInvite.upgradeMessage(code, data),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
        });
    }
    /*
    _#_ owner: MsgAddress  set_at:uint64 = InviteOwner;

    _#_ admin: MsgAddress
        program: # {program > 0}
        next_ref_no: # {next_ref_no > 0}
        number: # {number > 0}
        parent: MsgAddress
        owner: (Naybe ^InviteOwner) = InviteStorage;
    */
    async getInviteData(provider) {
        const { stack } = await provider.get('get_invite_data', []);
        return {
            admin: stack.readAddress(),
            program: stack.readNumber(),
            next_ref_no: stack.readNumber(),
            number: stack.readNumber(),
            parent: stack.readAddressOpt(),
            owner: exports.MultiInviteOwner.fromCell(stack.readCellOpt())
        };
    }
    async getInviteAddressBySeqNo(provider, seqNo) {
        const { stack } = await provider.get('get_invite_address_by_seq_no', [{ type: 'int', value: BigInt(seqNo) }]);
        return stack.readAddress();
    }
}
exports.MultiInvite = MultiInvite;

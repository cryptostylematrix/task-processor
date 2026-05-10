"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileItemV1 = exports.ProgramDataCodec = void 0;
exports.profileItemV1ConfigToCell = profileItemV1ConfigToCell;
const core_1 = require("@ton/core");
const ProfileConstantsV1_1 = require("./ProfileConstantsV1");
const ProfileContent_1 = require("./ProfileContent");
function profileItemV1ConfigToCell(config) {
    let b = (0, core_1.beginCell)()
        .storeUint(config.index, 256)
        .storeAddress(config.collectionAddress);
    if (config.ownerAddress)
        b = b.storeAddress(config.ownerAddress);
    if (config.content)
        b = b.storeRef(config.content instanceof core_1.Cell ? config.content : (0, ProfileContent_1.nftContentToCell)(config.content));
    if (config.login)
        b = b.storeRef(config.login);
    if (config.programs)
        b = b.storeDict(config.programs);
    return b.endCell();
}
exports.ProgramDataCodec = {
    serialize(src, builder) {
        builder.storeAddress(src.inviter);
        builder.storeUint(src.seqNo, 32);
        builder.storeAddress(src.invite);
        builder.storeBit(src.confirmed);
    },
    parse(src) {
        const inviter = src.loadAddress();
        const seqNo = src.loadUint(32);
        const invite = src.loadAddress();
        const confirmed = src.loadBoolean();
        return { inviter, seqNo, invite, confirmed };
    },
};
class ProfileItemV1 {
    constructor(address, init) {
        this.address = address;
        this.init = init;
    }
    static createFromConfig(config, code, workchain = 0) {
        const data = profileItemV1ConfigToCell(config);
        const init = { code, data };
        return new ProfileItemV1((0, core_1.contractAddress)(workchain, init), init);
    }
    static createFromAddress(address) {
        return new ProfileItemV1(address);
    }
    static transferMessage(to, response, forwardAmount = 1n, forwardPayload, queryId = 0) {
        const byRef = forwardPayload instanceof core_1.Cell;
        const body = (0, core_1.beginCell)()
            .storeUint(ProfileConstantsV1_1.ItemOp.transfer, 32)
            .storeUint(queryId, 64)
            .storeAddress(to)
            .storeAddress(response)
            .storeBit(false) // No custom payload
            .storeCoins(forwardAmount)
            .storeBit(byRef);
        if (byRef) {
            body.storeRef(forwardPayload);
        }
        else if (forwardPayload) {
            body.storeSlice(forwardPayload);
        }
        return body.endCell();
    }
    async sendTransfer(provider, via, to, response, forwardAmount = 1n, forwardPayload, value = (0, core_1.toNano)('0.05'), queryId = 0) {
        if (value <= forwardAmount) {
            throw Error("Value has to exceed forwardAmount");
        }
        await provider.internal(via, {
            value,
            body: ProfileItemV1.transferMessage(to, response, forwardAmount, forwardPayload, queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY
        });
    }
    static editContentMessage(newContent, queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(ProfileConstantsV1_1.ItemOp.edit_content, 32)
            .storeUint(queryId, 64)
            .storeRef(newContent instanceof core_1.Cell ?
            newContent :
            (0, ProfileContent_1.nftContentToCell)(newContent))
            .endCell();
    }
    async sendEditContent(provider, via, content, value = (0, core_1.toNano)('0.05'), queryId = 0) {
        await provider.internal(via, {
            value,
            body: ProfileItemV1.editContentMessage(content, queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
        });
    }
    static bonusMessage(comment, queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(ProfileConstantsV1_1.ItemOp.bonus, 32)
            .storeUint(queryId, 64)
            .storeRef(comment)
            .endCell();
    }
    async sendBonus(provider, via, comment, value = (0, core_1.toNano)('0.05'), queryId = 0) {
        await provider.internal(via, {
            value,
            body: ProfileItemV1.bonusMessage(comment, queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
        });
    }
    static withdrawMessage(amount, queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(ProfileConstantsV1_1.ItemOp.withdraw, 32)
            .storeUint(queryId, 64)
            .storeCoins(amount)
            .endCell();
    }
    async sendWithdraw(provider, via, amount, value = (0, core_1.toNano)('0.05'), queryId = 0) {
        await provider.internal(via, {
            value,
            body: ProfileItemV1.withdrawMessage(amount, queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
        });
    }
    static reportOfInviteMessage(program, valid, queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(ProfileConstantsV1_1.ItemOp.report_of_invite, 32)
            .storeUint(queryId, 64)
            .storeUint(program, 32)
            .storeUint(valid ? 1 : 0, 1)
            .endCell();
    }
    async sendReportOfInvite(provider, via, program, valid, value = (0, core_1.toNano)('0.05'), queryId = 0) {
        await provider.internal(via, {
            value,
            body: ProfileItemV1.reportOfInviteMessage(program, valid, queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
        });
    }
    static staticDataMessage(queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(ProfileConstantsV1_1.ItemOp.get_static_data, 32)
            .storeUint(queryId, 64)
            .endCell();
    }
    async sendGetStaticData(provider, via, value = (0, core_1.toNano)('0.05'), queryId = 0) {
        await provider.internal(via, {
            value,
            body: ProfileItemV1.staticDataMessage(queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
        });
    }
    static chooseInviterMessage(program, inviter, seqNo, invite, queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(ProfileConstantsV1_1.ItemOp.choose_inviter, 32)
            .storeUint(queryId, 64)
            .storeUint(program, 32)
            .storeAddress(inviter)
            .storeUint(seqNo, 32)
            .storeAddress(invite)
            .endCell();
    }
    async sendChooseInviter(provider, via, program, inviter, seqNo, invite, value = (0, core_1.toNano)('0.05'), queryId = 0) {
        await provider.internal(via, {
            value,
            body: ProfileItemV1.chooseInviterMessage(program, inviter, seqNo, invite, queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY
        });
    }
    async getNftData(provider) {
        const { stack } = await provider.get('get_nft_data', []);
        return {
            isInit: stack.readBoolean(),
            index: stack.readBigNumber(),
            collection: stack.readAddress(),
            owner: stack.readAddressOpt(),
            content: stack.readCellOpt()
        };
    }
    async getPrograms(provider) {
        const { stack } = await provider.get('get_programs', []);
        return {
            programs: stack.readCellOpt()
        };
    }
    async getVersion(provider) {
        const { stack } = await provider.get('get_version', []);
        return {
            version: stack.readNumber(),
            revision: stack.readNumber(),
        };
    }
    async getDuePayment(provider) {
        const { stack } = await provider.get('get_due_payment', []);
        return {
            amount: stack.readBigNumber()
        };
    }
}
exports.ProfileItemV1 = ProfileItemV1;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileCollectionV1 = void 0;
exports.collectionConfigToCell = collectionConfigToCell;
const core_1 = require("@ton/core");
const ProfileConstantsV1_1 = require("./ProfileConstantsV1");
const ProfileContent_1 = require("./ProfileContent");
function collectionConfigToCell(config) {
    return (0, core_1.beginCell)()
        .storeAddress(config.admin)
        .storeRef((0, core_1.beginCell)()
        .storeRef(config.content instanceof core_1.Cell ? config.content : (0, ProfileContent_1.nftContentToCell)(config.content))
        .storeRef((0, core_1.beginCell)().storeStringTail(config.common_content).endCell())
        .endCell())
        .storeRef(config.item_code)
        .endCell();
}
class ProfileCollectionV1 {
    constructor(address, init) {
        this.address = address;
        this.init = init;
    }
    static createFromAddress(address) {
        return new ProfileCollectionV1(address);
    }
    static createFromConfig(config, code, workchain = 0) {
        const data = collectionConfigToCell(config);
        const init = { code, data };
        return new ProfileCollectionV1((0, core_1.contractAddress)(workchain, init), init);
    }
    static newItemMessage(content, login, queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(ProfileConstantsV1_1.CollectionOp.deploy_item, 32)
            .storeUint(queryId, 64)
            .storeStringTail(login)
            .storeRef(content instanceof core_1.Cell ?
            content :
            (0, ProfileContent_1.nftContentToCell)(content))
            .endCell();
    }
    async sendDeployItem(provider, via, content, login, value = (0, core_1.toNano)('0.07'), queryId = 0) {
        await provider.internal(via, {
            value,
            body: ProfileCollectionV1.newItemMessage(content, login, queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY
        });
    }
    static changeOwnerMessage(newOwner, queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(ProfileConstantsV1_1.CollectionOp.change_owner, 32)
            .storeUint(queryId, 64)
            .storeAddress(newOwner)
            .endCell();
    }
    async sendChangeOwner(provider, via, newOwner, value = (0, core_1.toNano)('0.05'), queryId = 0) {
        await provider.internal(via, {
            value,
            body: ProfileCollectionV1.changeOwnerMessage(newOwner, queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY
        });
    }
    static changeContentMessage(newContent, queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(ProfileConstantsV1_1.CollectionOp.change_content, 32)
            .storeUint(queryId, 64)
            .storeRef(newContent instanceof core_1.Cell ?
            newContent :
            (0, ProfileContent_1.nftContentToCell)(newContent))
            .endCell();
    }
    async sendChangeContent(provider, via, newContent, value = (0, core_1.toNano)('0.07'), queryId = 0) {
        await provider.internal(via, {
            value,
            body: ProfileCollectionV1.changeContentMessage(newContent, queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY
        });
    }
    static withdrawMessage(amount, queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(ProfileConstantsV1_1.CollectionOp.withdraw, 32)
            .storeUint(queryId, 64)
            .storeCoins(amount)
            .endCell();
    }
    async sendWithdraw(provider, via, amount, value = (0, core_1.toNano)('0.05'), queryId = 0) {
        await provider.internal(via, {
            value,
            body: ProfileCollectionV1.withdrawMessage(amount, queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
        });
    }
    async getNftAddressByIndex(provider, idx) {
        const { stack } = await provider.get('get_nft_address_by_index', [{ type: 'int', value: BigInt(idx) }]);
        return stack.readAddress();
    }
    async getCollectionData(provider) {
        const { stack } = await provider.get('get_collection_data', []);
        return {
            nextItemIndex: stack.readNumber(),
            collectionContent: stack.readCell(),
            owner: stack.readAddress()
        };
    }
    async getNftContent(provider, index, content) {
        const { stack } = await provider.get('get_nft_content', [{
                type: 'int',
                value: BigInt(index)
            },
            {
                type: 'cell',
                cell: content
            }]);
        return stack.readCell();
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
exports.ProfileCollectionV1 = ProfileCollectionV1;

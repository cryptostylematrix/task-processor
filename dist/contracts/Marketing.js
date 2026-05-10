"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Marketing = void 0;
exports.marketingBasicConfigToCell = marketingBasicConfigToCell;
exports.marketingDefaultConfigToCell = marketingDefaultConfigToCell;
exports.marketingDataToCell = marketingDataToCell;
const core_1 = require("@ton/core");
const MatrixConstants_1 = require("./MatrixConstants");
const MarketingTask_1 = require("./MarketingTask");
const PlacePos_1 = require("./PlacePos");
const MarketingMatrix_1 = require("./MarketingMatrix");
const MarketingFee_1 = require("./MarketingFee");
function marketingBasicConfigToCell(config) {
    return (0, core_1.beginCell)()
        .storeAddress(config.adminAddress)
        .storeUint(config.index, 32)
        .endCell();
}
/*
    default#_
        admin_address: MsgAddress
        index: uint32
        
        max_tasks: uint16
        queue_size: uint16
        seq_no: uint32
        processor_address: MsgAddress
        jetton_wallet: MsgAddress
        initial_fee: Coins

        queue: (HashmapE 32 MultiTask)
        matrixes: (HashmapE 8 MatrixConfig)
        fees: (HashmapE 8 Grams)
        params: ^MarketingParams = MarketingStorage;
*/
function marketingDefaultConfigToCell(config) {
    return (0, core_1.beginCell)()
        .storeAddress(config.adminAddress)
        .storeUint(config.index, 32)
        .storeUint(config.maxTasks, 16)
        .storeUint(0, 16) // queue_size
        .storeUint(0, 32) // seq_no
        .storeAddress(config.processorAddress)
        .storeAddress(config.jettonWallet)
        .storeCoins(config.initialFee)
        .storeDict(null) // queue
        .storeDict((0, MarketingMatrix_1.matrixConfigToCell)(config.matrixes))
        .storeDict((0, MarketingFee_1.feeConfigToCell)(config.fees))
        .storeRef(config.params)
        .endCell();
}
function marketingDataToCell(data) {
    return (0, core_1.beginCell)()
        .storeAddress(data.adminAddress)
        .storeUint(data.index, 32)
        .storeUint(data.maxTasks, 16)
        .storeUint(data.queueSize, 16) // queue_size
        .storeUint(data.seqNo, 32) // seq_no
        .storeAddress(data.processorAddress)
        .storeAddress(data.jettonWallet)
        .storeCoins(data.initialFee)
        .storeDict((0, MarketingTask_1.queueToCell)(data.queue))
        .storeDict((0, MarketingMatrix_1.matrixConfigToCell)(data.matrixes))
        .storeDict((0, MarketingFee_1.feeConfigToCell)(data.fees))
        .storeRef(data.params)
        .endCell();
}
class Marketing {
    constructor(address, init) {
        this.address = address;
        this.init = init;
        this.abi = { name: 'Marketing' };
    }
    static createFromAddress(address) {
        return new Marketing(address);
    }
    static createFromConfig(config, code, workchain = 0) {
        const data = marketingBasicConfigToCell(config);
        const init = { code, data };
        return new Marketing((0, core_1.contractAddress)(workchain, init), init);
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
    // init_marketing#_  code:^Cell  data:^Cell = MarketingInternalMsg;
    static initMessage(code, data) {
        return (0, core_1.beginCell)()
            .storeRef(code)
            .storeRef(data)
            .endCell();
    }
    async sendInit(provider, via, code, data, value = (0, core_1.toNano)('0.05')) {
        await provider.internal(via, {
            value,
            body: Marketing.initMessage(code, data),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
        });
    }
    // buy_place#be490d70  query_id:uint64  m:uint8  profile:Address  first:Bool  pos:(Maybe ^PlacePos) = MarketingInternalMsg;
    static buyPlaceMessage(m, profile, first, pos, queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(MatrixConstants_1.Op.buy_place, 32)
            .storeUint(queryId, 64)
            .storeUint(m, 8)
            .storeAddress(profile)
            .storeBit(first)
            .storeMaybeRef((0, PlacePos_1.placePosToCell)(pos))
            .endCell();
    }
    async sendBuyPlace(provider, via, m, profile, first, pos = null, value = (0, core_1.toNano)('0.01'), queryId = 0, bounce = true) {
        await provider.internal(via, {
            value,
            body: Marketing.buyPlaceMessage(m, profile, first, pos, queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
            bounce: bounce
        });
    }
    // update_maxtasks#6d0d19c0  query_id:uint64  max_tasks:uint16 = MarketingInternalMsg;
    static updateMaxTasksMessage(maxTasks, queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(MatrixConstants_1.Op.update_maxtasks, 32)
            .storeUint(queryId, 64)
            .storeUint(maxTasks, 16)
            .endCell();
    }
    async sendUpdateMaxTasks(provider, via, maxTasks, value = (0, core_1.toNano)('0.05'), queryId = 0) {
        await provider.internal(via, {
            value,
            body: Marketing.updateMaxTasksMessage(maxTasks, queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
        });
    }
    // place_added#9B745DE6   query_id:uint64   m: uint8   parent_address: MsgAddress   pos: #   fill_count: #   info: ^PlaceInfo = MarketingInternalMsg;
    static placeAddedMessage(m, parentAddress, pos, fillCount, placeInfo, queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(MatrixConstants_1.Op.place_added, 32)
            .storeUint(queryId, 64)
            .storeUint(m, 8)
            .storeAddress(parentAddress)
            .storeUint(pos, 32)
            .storeUint(fillCount, 32)
            .storeRef(placeInfo)
            .endCell();
    }
    async sendPlaceAdded(provider, via, m, parentAddress, pos, fillCount, placeInfo, value = (0, core_1.toNano)('0.05'), queryId = 0) {
        await provider.internal(via, {
            value,
            body: Marketing.placeAddedMessage(m, parentAddress, pos, fillCount, placeInfo, queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
        });
    }
    // deploy_place#ce2879c7  query_id:uint64  key:uint32  parent:MsgAddress  info:^PlaceInfo = MarketingInternalMsg;
    static deployPlaceMessage(key, parentAddress, info, queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(MatrixConstants_1.Op.deploy_place, 32)
            .storeUint(queryId, 64)
            .storeUint(key, 32)
            .storeAddress(parentAddress)
            .storeRef(info)
            .endCell();
    }
    async sendDeployPlace(provider, via, key, parentAddress, info, value = (0, core_1.toNano)('0.05'), queryId = 0) {
        await provider.internal(via, {
            value,
            body: Marketing.deployPlaceMessage(key, parentAddress, info, queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
        });
    }
    // pay_bonus#7db363d2  query_id:uint64  key:uint32  wallet: MsgAddress = MarketingInternalMsg;
    static payBonusMessage(key, walletAddress, queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(MatrixConstants_1.Op.pay_bonus, 32)
            .storeUint(queryId, 64)
            .storeUint(key, 32)
            .storeAddress(walletAddress)
            .endCell();
    }
    async sendPayBonus(provider, via, key, walletAddress, value = (0, core_1.toNano)('0.05'), queryId = 0) {
        await provider.internal(via, {
            value,
            body: Marketing.payBonusMessage(key, walletAddress, queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
        });
    }
    // cancel_task#02b82976  query_id:uint64  key:uint32 comment:Any= MarketingInternalMsg;
    static cancelTaskMsg(key, comment, queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(MatrixConstants_1.Op.cancel_task, 32)
            .storeUint(queryId, 64)
            .storeUint(key, 32)
            .storeStringTail(comment)
            .endCell();
    }
    async sendCancelTask(provider, via, key, comment, value = (0, core_1.toNano)('0.01'), queryId = 0) {
        await provider.internal(via, {
            value,
            body: Marketing.cancelTaskMsg(key, comment, queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY
        });
    }
    // lock_pos#936ecf92  query_id:uint64  m:uint8  profile:Address  pos:^PlacePos = MarketingInternalMsg;
    static lockPosMessage(m, profile, pos, queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(MatrixConstants_1.Op.lock_pos, 32)
            .storeUint(queryId, 64)
            .storeUint(m, 8)
            .storeAddress(profile)
            .storeRef((0, PlacePos_1.placePosToCell)(pos))
            .endCell();
    }
    async sendLockPos(provider, via, m, profile, pos, value = (0, core_1.toNano)('0.01'), queryId = 0) {
        await provider.internal(via, {
            value,
            body: Marketing.lockPosMessage(m, profile, pos, queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY
        });
    }
    // unlock_pos#ce87058b  query_id:uint64  m:uint8  profile:Address  pos:^PlacePos = MarketingInternalMsg;
    static unlockPosMessage(m, profile, pos, queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(MatrixConstants_1.Op.unlock_pos, 32)
            .storeUint(queryId, 64)
            .storeUint(m, 8)
            .storeAddress(profile)
            .storeRef((0, PlacePos_1.placePosToCell)(pos))
            .endCell();
    }
    async sendUnlockPos(provider, via, m, profile, pos, value = (0, core_1.toNano)('0.01'), queryId = 0) {
        await provider.internal(via, {
            value,
            body: Marketing.unlockPosMessage(m, profile, pos, queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY
        });
    }
    // update_fees#0334f47d query_id:uint64 fees:(HashmapE 8 Grams) = MarketingInternalMsg;
    static updateFeesMessage(fees, queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(MatrixConstants_1.Op.update_fees, 32)
            .storeUint(queryId, 64)
            .storeDict((0, MarketingFee_1.feeConfigToCell)(fees))
            .endCell();
    }
    async sendUpdateFees(provider, via, fees, value = (0, core_1.toNano)('0.05'), queryId = 0) {
        await provider.internal(via, {
            value,
            body: Marketing.updateFeesMessage(fees, queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
        });
    }
    // update_processor#80c163d5  query_id:uint64  processor:MsgAddress = MarketingInternalMsg;
    static updateProcessorMessage(processor, queryId = 0) {
        return (0, core_1.beginCell)()
            .storeUint(MatrixConstants_1.Op.update_processor, 32)
            .storeUint(queryId, 64)
            .storeAddress(processor)
            .endCell();
    }
    async sendUpdateProcessor(provider, via, processor, value = (0, core_1.toNano)('0.05'), queryId = 0) {
        await provider.internal(via, {
            value,
            body: Marketing.updateProcessorMessage(processor, queryId),
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
            body: Marketing.updateAdminMessage(admin, queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
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
            body: Marketing.upgradeMessage(code, data),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
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
            body: Marketing.proxyMessage(mode, msg, queryId),
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY
        });
    }
    async sendCustomMsg(provider, via, body, value = (0, core_1.toNano)('0.01')) {
        await provider.internal(via, {
            value,
            body: body,
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY
        });
    }
    async getBasicData(provider) {
        const { stack } = await provider.get('get_basic_data', []);
        return {
            init: stack.readNumber(),
            adminAddress: stack.readAddress(),
            index: stack.readNumber()
        };
    }
    async getMarketingData(provider) {
        const { stack } = await provider.get('get_marketing_data', []);
        return {
            adminAddress: stack.readAddress(),
            index: stack.readNumber(),
            maxTasks: stack.readNumber(),
            queueSize: stack.readNumber(),
            seqNo: stack.readNumber(),
            processorAddress: stack.readAddress(),
            jettonWallet: stack.readAddressOpt(),
            initialFee: stack.readBigNumber(),
            queue: (0, MarketingTask_1.queueFromCell)(stack.readCellOpt()),
            matrixes: (0, MarketingMatrix_1.matrixConfigFromCell)(stack.readCellOpt()),
            fees: (0, MarketingFee_1.feeConfigFromCell)(stack.readCellOpt()),
            params: stack.readCell()
        };
    }
    async getFirstTask(provider) {
        const { stack } = await provider.get('get_first_task', []);
        return {
            key: stack.readNumberOpt(),
            val: (0, MarketingTask_1.taskFromCell)(stack.readCellOpt()),
            flag: stack.readNumber()
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
exports.Marketing = Marketing;

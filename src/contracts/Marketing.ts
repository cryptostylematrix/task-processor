import { Address, beginCell, Cell, Contract, ContractABI, contractAddress, ContractProvider, Sender, SendMode, toNano } from '@ton/core';
import { Op } from './MatrixConstants';
import { MarketingTask, queueFromCell, QueueItem, queueToCell, taskFromCell  } from './MarketingTask';
import { PlacePos, placePosToCell } from './PlacePos';
import { MatrixConfig, matrixConfigFromCell, matrixConfigToCell } from './MarketingMatrix';
import { feeConfigFromCell, feeConfigToCell } from './MarketingFee';


export type MarketingBaseConfig = {
    adminAddress: Address,
    index: number | bigint
};

export type MarketingDefaultConfig = {
    adminAddress: Address,
    index: number | bigint,

    maxTasks: number,
    processorAddress: Address,
    jettonWallet: Address | null
    initialFee: number | bigint,
    
    /* everything related to the configuration of matrices that should not change - type, price, rewards, etc */
    matrixes: Map<number, MatrixConfig>,
    fees: Map<number, bigint>,

    /* parameters that are not used by a specific smart contract, but are used by external code */
    params: Cell /* MarketingParams  */
};
      
       
// export type MarketingParams = {
//     program: MatrixProgramParams,
//     matrix: MatrixFeature[],
// }

// export type MatrixProgramParams = {
//     metadataUri: string,
// };

// export type MatrixFeature = {
    // Additional features - could be changed 
    //  - Matrix control - blocking | no | reservation
    //  - immediate purchase (yes | no)
    //  - skirt trimming (each N-th clone)
    //  - reinvest (my struct | ref struct)
    //  - commission
//} 



export type MarketingData = {
    adminAddress: Address,
    index: number | bigint,

    maxTasks: number,
    queueSize: number,
    seqNo: number,
    processorAddress: Address,
    jettonWallet: Address | null,
    initialFee: bigint,
    
    queue: Map<number, MarketingTask>
    matrixes: Map<number, MatrixConfig>,
    fees: Map<number, bigint>,
    params: Cell
}


export function marketingBasicConfigToCell(config: MarketingBaseConfig): Cell {
    return beginCell()
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
export function marketingDefaultConfigToCell(config: MarketingDefaultConfig): Cell {
    return beginCell()
        .storeAddress(config.adminAddress)
        .storeUint(config.index, 32)
        
        .storeUint(config.maxTasks, 16)
        .storeUint(0, 16)   // queue_size
        .storeUint(0, 32)   // seq_no
        .storeAddress(config.processorAddress)
        .storeAddress(config.jettonWallet)
        .storeCoins(config.initialFee)

        .storeDict(null)    // queue
        .storeDict(matrixConfigToCell(config.matrixes))
        .storeDict(feeConfigToCell(config.fees))
        .storeRef(config.params)
        .endCell();
}


export function marketingDataToCell(data: MarketingData): Cell {

    return beginCell()
        .storeAddress(data.adminAddress)
        .storeUint(data.index, 32)
        
        .storeUint(data.maxTasks, 16)
        .storeUint(data.queueSize, 16)   // queue_size
        .storeUint(data.seqNo, 32)   // seq_no
        .storeAddress(data.processorAddress)
        .storeAddress(data.jettonWallet)
        .storeCoins(data.initialFee)

        .storeDict(queueToCell(data.queue))    
        .storeDict(matrixConfigToCell(data.matrixes))
        .storeDict(feeConfigToCell(data.fees))
        .storeRef(data.params)
        .endCell();
}

export class Marketing implements Contract {
    abi: ContractABI = { name: 'Marketing' }

    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Marketing(address);
    }

    static createFromConfig(config: MarketingBaseConfig, code: Cell, workchain = 0) {
        const data = marketingBasicConfigToCell(config);
        const init = { code, data };
        return new Marketing(contractAddress(workchain, init), init);
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

    // init_marketing#_  code:^Cell  data:^Cell = MarketingInternalMsg;
    static initMessage(code: Cell, data: Cell)
    {
        return beginCell()
            .storeRef(code)
            .storeRef(data)
            .endCell();
    }

    async sendInit(provider: ContractProvider, via: Sender, code: Cell, data: Cell, value: bigint = toNano('0.05')) {
        await provider.internal(via, {
            value,
            body: Marketing.initMessage(code, data),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
        });
    }

    // buy_place#be490d70  query_id:uint64  m:uint8  profile:Address  first:Bool  pos:(Maybe ^PlacePos) = MarketingInternalMsg;
    static buyPlaceMessage(m: number, profile: Address, first:boolean, pos: PlacePos | null, queryId: bigint | number = 0) {
        return beginCell()
            .storeUint(Op.buy_place, 32)
            .storeUint(queryId, 64)
            .storeUint(m, 8)
            .storeAddress(profile)
            .storeBit(first)
            .storeMaybeRef(placePosToCell(pos))
            .endCell();
    }

    async sendBuyPlace(provider: ContractProvider, via: Sender, m: number, profile: Address, first: boolean, pos: PlacePos | null = null, value: bigint = toNano('0.01'), queryId: bigint | number = 0, bounce = true) {
        await provider.internal(via, {
            value,
            body: Marketing.buyPlaceMessage(m, profile, first, pos, queryId),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            bounce: bounce 
        });
    }


    // update_maxtasks#6d0d19c0  query_id:uint64  max_tasks:uint16 = MarketingInternalMsg;
    static updateMaxTasksMessage(maxTasks: number, queryId: bigint | number = 0)
    {
        return beginCell()
            .storeUint(Op.update_maxtasks, 32)
            .storeUint(queryId, 64)
            .storeUint(maxTasks, 16)
            .endCell();
    }
   
    async sendUpdateMaxTasks(provider: ContractProvider, via: Sender, maxTasks: number, value: bigint = toNano('0.05'), queryId: bigint | number = 0) {
        await provider.internal(via, {
            value,
            body: Marketing.updateMaxTasksMessage(maxTasks, queryId),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
        });
    }

    // place_added#9B745DE6   query_id:uint64   m: uint8   parent_address: MsgAddress   pos: #   fill_count: #   info: ^PlaceInfo = MarketingInternalMsg;
    static placeAddedMessage(m: number, parentAddress: Address | null, pos: number, 
        fillCount: number, placeInfo: Cell, queryId: bigint | number = 0)
    {
        return beginCell()
            .storeUint(Op.place_added, 32)
            .storeUint(queryId, 64)
            .storeUint(m, 8)
            .storeAddress(parentAddress)
            .storeUint(pos, 32)
            .storeUint(fillCount, 32)
            .storeRef(placeInfo)
            .endCell();
    }

    async sendPlaceAdded(provider: ContractProvider, via: Sender, m: number, parentAddress: Address | null, pos: number, 
        fillCount: number, placeInfo: Cell, value: bigint = toNano('0.05'), queryId: bigint | number = 0) {
        await provider.internal(via, {
            value,
            body: Marketing.placeAddedMessage(m, parentAddress, pos, fillCount, placeInfo, queryId),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
        });
    }

    // deploy_place#ce2879c7  query_id:uint64  key:uint32  parent:MsgAddress  info:^PlaceInfo = MarketingInternalMsg;
    static deployPlaceMessage(key: number | bigint, parentAddress: Address, info: Cell, queryId: bigint | number = 0)
    {
        return beginCell()
            .storeUint(Op.deploy_place, 32)
            .storeUint(queryId, 64)
            .storeUint(key, 32)
            .storeAddress(parentAddress)
            .storeRef(info)
            .endCell();
    }

     async sendDeployPlace(provider: ContractProvider, via: Sender, key: number | bigint, parentAddress: Address, info: Cell, 
        value: bigint = toNano('0.05'), queryId: bigint | number = 0) {
        await provider.internal(via, {
            value,
            body: Marketing.deployPlaceMessage(key, parentAddress, info, queryId),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
        });
    }

    // pay_bonus#7db363d2  query_id:uint64  key:uint32  wallet: MsgAddress = MarketingInternalMsg;
    static payBonusMessage(key: number | bigint, walletAddress: Address, queryId: bigint | number = 0)
    {
        return beginCell()
            .storeUint(Op.pay_bonus, 32)
            .storeUint(queryId, 64)
            .storeUint(key, 32)
            .storeAddress(walletAddress)
            .endCell();
    }

    async sendPayBonus(provider: ContractProvider, via: Sender, key: number | bigint, walletAddress: Address, 
        value: bigint = toNano('0.05'), queryId: bigint | number = 0) {
        await provider.internal(via, {
            value,
            body: Marketing.payBonusMessage(key, walletAddress, queryId),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
        });
    }

    // cancel_task#02b82976  query_id:uint64  key:uint32 comment:Any= MarketingInternalMsg;
    static cancelTaskMsg(key: number, comment: string, queryId: bigint | number = 0) {
        return beginCell()
            .storeUint(Op.cancel_task, 32)
            .storeUint(queryId, 64)
            .storeUint(key, 32)
            .storeStringTail(comment)
            .endCell();
    }
    
    async sendCancelTask(provider: ContractProvider, via: Sender, key: number, comment: string, value: bigint = toNano('0.01'), queryId: bigint | number = 0)
    {
         await provider.internal(via, {
            value,
            body: Marketing.cancelTaskMsg(key, comment, queryId),
            sendMode: SendMode.PAY_GAS_SEPARATELY
        });
    }

    // lock_pos#936ecf92  query_id:uint64  m:uint8  profile:Address  pos:^PlacePos = MarketingInternalMsg;
    static lockPosMessage(m: number, profile: Address, pos: PlacePos, queryId: bigint | number = 0) {
        return beginCell()
            .storeUint(Op.lock_pos, 32)
            .storeUint(queryId, 64)
            .storeUint(m, 8)
            .storeAddress(profile)
            .storeRef(placePosToCell(pos)!)
            .endCell();
    }

    async sendLockPos(provider: ContractProvider, via: Sender, m: number, profile: Address, pos: PlacePos, value: bigint = toNano('0.01'), queryId: bigint | number = 0) {
        await provider.internal(via, {
            value,
            body: Marketing.lockPosMessage(m, profile, pos, queryId),
            sendMode: SendMode.PAY_GAS_SEPARATELY
        });
    }


    // unlock_pos#ce87058b  query_id:uint64  m:uint8  profile:Address  pos:^PlacePos = MarketingInternalMsg;
    static unlockPosMessage(m: number, profile: Address, pos: PlacePos, queryId: bigint | number = 0) {
        return beginCell()
            .storeUint(Op.unlock_pos, 32)
            .storeUint(queryId, 64)
            .storeUint(m, 8)
            .storeAddress(profile)
            .storeRef(placePosToCell(pos)!)
            .endCell();
    }

    async sendUnlockPos(provider: ContractProvider, via: Sender, m: number, profile: Address, pos: PlacePos, value: bigint = toNano('0.01'), queryId: bigint | number = 0) {
        await provider.internal(via, {
            value,
            body: Marketing.unlockPosMessage(m, profile, pos, queryId),
            sendMode: SendMode.PAY_GAS_SEPARATELY
        });
    }

    // update_fees#0334f47d query_id:uint64 fees:(HashmapE 8 Grams) = MarketingInternalMsg;
    static updateFeesMessage(fees: Map<number, bigint>, queryId: bigint | number = 0)
    {
        return beginCell()
            .storeUint(Op.update_fees, 32)
            .storeUint(queryId, 64)
            .storeDict(feeConfigToCell(fees))
            .endCell();
    }

    async sendUpdateFees(provider: ContractProvider, via: Sender, fees: Map<number, bigint>, value: bigint = toNano('0.05'), queryId: bigint | number = 0) {
        await provider.internal(via, {
            value,
            body: Marketing.updateFeesMessage(fees, queryId),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
        });
    }

    // update_processor#80c163d5  query_id:uint64  processor:MsgAddress = MarketingInternalMsg;
    static updateProcessorMessage(processor: Address, queryId: bigint | number = 0)
    {
        return beginCell()
            .storeUint(Op.update_processor, 32)
            .storeUint(queryId, 64)
            .storeAddress(processor)
            .endCell();
    }

    async sendUpdateProcessor(provider: ContractProvider, via: Sender, processor: Address, value: bigint = toNano('0.05'), queryId: bigint | number = 0) {
        await provider.internal(via, {
            value,
            body: Marketing.updateProcessorMessage(processor, queryId),
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
            body: Marketing.updateAdminMessage(admin, queryId),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
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
            body: Marketing.upgradeMessage(code, data),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
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
            body: Marketing.proxyMessage(mode, msg, queryId),
            sendMode: SendMode.PAY_GAS_SEPARATELY
        });
    }

    async sendCustomMsg(provider: ContractProvider, via: Sender, body: Cell, value: bigint = toNano('0.01')) {
         await provider.internal(via, {
            value,
            body: body,
            sendMode: SendMode.PAY_GAS_SEPARATELY
        });
    }
    
    async getBasicData(provider: ContractProvider) : Promise<{ init: number, adminAddress: Address, index: number}> {
        const { stack } = await provider.get('get_basic_data', []);

        return {
            init: stack.readNumber(),
            adminAddress: stack.readAddress(),
            index: stack.readNumber()
        };
    }

    async getMarketingData(provider: ContractProvider) : Promise<MarketingData> {
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
            queue: queueFromCell(stack.readCellOpt()), 
            matrixes: matrixConfigFromCell(stack.readCellOpt()),
            fees: feeConfigFromCell(stack.readCellOpt()),
            params: stack.readCell()
        };
    }

    async getFirstTask(provider: ContractProvider): Promise<QueueItem> {

        const { stack } = await provider.get('get_first_task', []);
        return {
            key: stack.readNumberOpt(),
            val: taskFromCell(stack.readCellOpt()),
            flag: stack.readNumber()
        }
    }

    // for upgrade tests
    async getValue(provider: ContractProvider): Promise<{ value: number }> {
        const { stack } = await provider.get('get_value', []);

        return {
            value: stack.readNumber(),
        };
    }

     async getPlaceAddr(provider: ContractProvider, m: number, parentAddress: Address | null | undefined, pos: number): Promise<{ addr: Address}> {

        const { stack } = await provider.get('get_place_addr', [
            {  type: "int", value: BigInt(m) },
            {  type: "slice", cell: beginCell().storeAddress(parentAddress).endCell() },
            {  type: "int", value: BigInt(pos) },
        ]);
        
        return {
            addr: stack.readAddress()
        }
    }
}

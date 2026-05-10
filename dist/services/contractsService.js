"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForTaskCanceled = exports.sendPaymentToMarketing = exports.waitForSeqno = exports.waitForNewSeqno = exports.fetchProfileData = exports.fetchProfileContent = exports.fetchFirstTask = exports.fetchInviterProfileAddr = exports.fetchProgram = exports.fetchPlaceData = void 0;
const core_1 = require("@ton/core");
const Place_1 = require("../contracts/Place");
const ProfileItemV1_1 = require("../contracts/ProfileItemV1");
const MultiInvite_1 = require("../contracts/MultiInvite");
const tonClient_1 = require("./tonClient");
const crypto_1 = require("@ton/crypto");
const ton_1 = require("@ton/ton");
const config_1 = require("../config");
const retry_1 = require("../utils/retry");
const logger_1 = require("../logger");
const NftContentParser_1 = require("../contracts/NftContentParser");
const Marketing_1 = require("../contracts/Marketing");
const fetchPlaceData = async (placeAddr) => {
    const client = (0, tonClient_1.getTonClient)();
    const address = core_1.Address.parse(placeAddr);
    const contract = Place_1.Place.createFromAddress(address);
    const provider = client.provider(address);
    const placeData = await (0, retry_1.retryExp)(() => (0, tonClient_1.limited)(() => contract.getPlaceData(provider)));
    return placeData;
};
exports.fetchPlaceData = fetchPlaceData;
const fetchProgram = async (profileAddr, program) => {
    const client = (0, tonClient_1.getTonClient)();
    const profile = ProfileItemV1_1.ProfileItemV1.createFromAddress(profileAddr);
    const provider = client.provider(profileAddr);
    const profileData = await (0, retry_1.retryExp)(() => (0, tonClient_1.limited)(() => profile.getPrograms(provider)));
    if (!profileData.programs) {
        return null;
    }
    const programs = core_1.Dictionary.loadDirect(core_1.Dictionary.Keys.Uint(32), ProfileItemV1_1.ProgramDataCodec, profileData.programs);
    return programs.get(program) ?? null;
};
exports.fetchProgram = fetchProgram;
const fetchInviterProfileAddr = async (profileAddr, program) => {
    const programData = await (0, exports.fetchProgram)(profileAddr, program);
    if (!programData || !programData.confirmed) {
        return null;
    }
    const inviterContract = MultiInvite_1.MultiInvite.createFromAddress(programData.inviter);
    const provider = (0, tonClient_1.getTonClient)().provider(programData.inviter);
    const inviterData = await (0, retry_1.retryExp)(() => (0, tonClient_1.limited)(() => inviterContract.getInviteData(provider)));
    const inviterProfile = inviterData.owner?.owner;
    return inviterProfile ?? null;
};
exports.fetchInviterProfileAddr = fetchInviterProfileAddr;
const fetchFirstTask = async (rawMarketingAddress) => {
    const marketingAddress = core_1.Address.parse(rawMarketingAddress);
    const client = (0, tonClient_1.getTonClient)();
    const marketing = Marketing_1.Marketing.createFromAddress(marketingAddress);
    const provider = client.provider(marketingAddress);
    const firstTask = await (0, retry_1.retryExp)(() => (0, tonClient_1.limited)(() => marketing.getFirstTask(provider)));
    return firstTask;
};
exports.fetchFirstTask = fetchFirstTask;
const fetchProfileContent = async (profileAddr) => {
    const profileData = await (0, exports.fetchProfileData)(profileAddr);
    return (0, NftContentParser_1.parseProfileContent)(profileData?.content);
};
exports.fetchProfileContent = fetchProfileContent;
const fetchProfileData = async (profileAddr) => {
    const client = (0, tonClient_1.getTonClient)();
    const profile = ProfileItemV1_1.ProfileItemV1.createFromAddress(profileAddr);
    const provider = client.provider(profileAddr);
    const profileData = await (0, retry_1.retryExp)(() => (0, tonClient_1.limited)(() => profile.getNftData(provider)));
    return profileData;
};
exports.fetchProfileData = fetchProfileData;
const waitForNewSeqno = async (placeAddr, prevData, timeoutMs = 120000, intervalMs = 1000) => {
    const start = Date.now();
    const prevSeqno = prevData?.seqNo ?? 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const current = await (0, exports.fetchPlaceData)(placeAddr);
        if (current) {
            const currSeqno = current.seqNo ?? 0;
            if (currSeqno > prevSeqno) {
                return currSeqno;
            }
            return null;
        }
        if (Date.now() - start > timeoutMs) {
            throw new Error(`Timeout waiting for new child at ${placeAddr}`);
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
};
exports.waitForNewSeqno = waitForNewSeqno;
let lastPaidTaskKey = null;
let lastKnownSeqno = null;
const waitForSeqno = async (wallet, prevSeqno, timeoutMs = 30000, intervalMs = 1000) => {
    const start = Date.now();
    while (true) {
        const current = await (0, retry_1.retryExp)(() => (0, tonClient_1.limited)(() => wallet.getSeqno()));
        if (current > prevSeqno) {
            return current;
        }
        if (Date.now() - start > timeoutMs) {
            throw new Error("Timeout waiting for wallet seqno to increment");
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
};
exports.waitForSeqno = waitForSeqno;
const sendPaymentToMarketing = async (toAddress, taskKey, body, value) => {
    if (lastPaidTaskKey === taskKey)
        return;
    const client = (0, tonClient_1.getTonClient)();
    const keyPair = await (0, crypto_1.mnemonicToPrivateKey)(config_1.tonConfig.processorMnemonic.trim().split(/\s+/));
    const wallet = ton_1.WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
    const openedWallet = client.open(wallet);
    const seqno = lastKnownSeqno ?? await (0, retry_1.retryExp)(() => (0, tonClient_1.limited)(() => openedWallet.getSeqno()));
    const transfer = {
        seqno,
        secretKey: keyPair.secretKey,
        messages: [
            (0, core_1.internal)({
                to: toAddress,
                value,
                body,
                bounce: true,
            }),
        ],
    };
    await (0, retry_1.retryExp)(async () => {
        try {
            await logger_1.logger.info(`[TON] trying sendTransfer with seqno=${seqno}`);
            await (0, tonClient_1.limited)(() => openedWallet.sendTransfer(transfer));
        }
        catch (error) {
            const currentSeqno = await (0, retry_1.retryExp)(() => (0, tonClient_1.limited)(() => openedWallet.getSeqno()), 2, 300);
            await logger_1.logger.warn(`[TON] sendTransfer failed, seqno=${seqno}, currentSeqno=${currentSeqno}, retrying with the same seqno`);
            throw error;
        }
    });
    lastKnownSeqno = await (0, exports.waitForSeqno)(openedWallet, seqno);
    lastPaidTaskKey = taskKey;
};
exports.sendPaymentToMarketing = sendPaymentToMarketing;
const waitForTaskCanceled = async (rawMarketingAddress, prevKey, timeoutMs = 120000, intervalMs = 1000) => {
    const start = Date.now();
    // eslint-disable-next-line no-constant-condition
    let attempt = 0;
    while (true) {
        const current = await (0, exports.fetchFirstTask)(rawMarketingAddress);
        await logger_1.logger.info(`[MarketingTaskProcessor] waiting until task canceled prev = ${prevKey}  current= ${current?.key} (attepmt = ${++attempt}) ...`);
        if (current) {
            const currKey = current.key;
            if (currKey != prevKey) {
                return currKey;
            }
        }
        if (Date.now() - start > timeoutMs) {
            throw new Error(`Timeout waiting for new task`);
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
};
exports.waitForTaskCanceled = waitForTaskCanceled;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contractsApi = void 0;
exports.getInviteAddrBySeqNo = getInviteAddrBySeqNo;
exports.getInviteData = getInviteData;
exports.getMinQueueTask = getMinQueueTask;
exports.getMultiData = getMultiData;
exports.getPlaceData = getPlaceData;
exports.getNftAddrByLogin = getNftAddrByLogin;
exports.getProfileNftData = getProfileNftData;
exports.refreshProfileNftData = refreshProfileNftData;
exports.getProfilePrograms = getProfilePrograms;
exports.getContractBalance = getContractBalance;
exports.getCollectionData = getCollectionData;
exports.getWalletHistory = getWalletHistory;
exports.buildChooseInviterBody = buildChooseInviterBody;
exports.buildEditContentBody = buildEditContentBody;
exports.buildDeployItemBody = buildDeployItemBody;
exports.buildBuyPlaceBody = buildBuyPlaceBody;
exports.buildLockPosBody = buildLockPosBody;
exports.buildUnlockPosBody = buildUnlockPosBody;
exports.buildMarketingBuyPlaceByTonBody = buildMarketingBuyPlaceByTonBody;
exports.buildMarketingBuyPlaceByJettonBody = buildMarketingBuyPlaceByJettonBody;
exports.buildMarketingLockPosBody = buildMarketingLockPosBody;
exports.buildMarketingUnlockPosBody = buildMarketingUnlockPosBody;
exports.getMarketingFirstTask = getMarketingFirstTask;
exports.getMarketingData = getMarketingData;
exports.getMatrixPlaceData = getMatrixPlaceData;
exports.getJettonWalletAddress = getJettonWalletAddress;
exports.getJettonWalletData = getJettonWalletData;
const config_1 = require("../config");
const trimTrailingSlash = (value) => value.replace(/\/+$/, "");
const normalizedBase = (() => {
    const raw = config_1.apiConfig.contractsApi.host || "";
    if (!raw)
        return "";
    const withProtocol = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `http://${raw}`;
    return trimTrailingSlash(withProtocol);
})();
const defaultOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
const buildUrl = (path) => new URL(path, normalizedBase || defaultOrigin).toString();
const safeGet = async (url) => {
    try {
        const res = await fetch(url);
        if (res.status === 404)
            return null;
        if (!res.ok) {
            console.error(`Request failed with status ${res.status}`);
            return null;
        }
        return (await res.json());
    }
    catch (err) {
        console.error("contractsApi request error:", err);
        return null;
    }
};
const safeDelete = async (url) => {
    try {
        const res = await fetch(url, { method: "DELETE" });
        if (res.status === 404)
            return null;
        if (!res.ok) {
            console.error(`Request failed with status ${res.status}`);
            return null;
        }
        if (res.status === 204)
            return null;
        const text = await res.text();
        if (!text)
            return null;
        return JSON.parse(text);
    }
    catch (err) {
        console.error("contractsApi request error:", err);
        return null;
    }
};
async function getInviteAddrBySeqNo(addr, seqNo) {
    const normalizedAddr = addr?.trim();
    if (!normalizedAddr)
        return null;
    if (!Number.isFinite(seqNo))
        return null;
    const url = buildUrl(`/contracts/invite/${normalizedAddr}/invite-addr-by-seq-no/${seqNo}`);
    return safeGet(url);
}
async function getInviteData(addr) {
    const normalizedAddr = addr?.trim();
    if (!normalizedAddr)
        return null;
    const url = buildUrl(`/contracts/invite/${normalizedAddr}/data`);
    return safeGet(url);
}
async function getMinQueueTask() {
    const url = buildUrl("/contracts/multi/min-queue-task");
    return safeGet(url);
}
async function getMultiData() {
    const url = buildUrl("/contracts/multi/data");
    return safeGet(url);
}
async function getPlaceData(addr) {
    const normalizedAddr = addr?.trim();
    if (!normalizedAddr)
        return null;
    const url = buildUrl(`/contracts/place/${normalizedAddr}/data`);
    return safeGet(url);
}
async function getNftAddrByLogin(login) {
    const normalizedLogin = login?.trim();
    if (!normalizedLogin)
        return null;
    const url = buildUrl(`/contracts/profile-collection/nft-addr-by-login/${normalizedLogin}`);
    return safeGet(url);
}
async function getProfileNftData(addr) {
    const normalizedAddr = addr?.trim();
    if (!normalizedAddr)
        return null;
    const url = buildUrl(`/contracts/profile-item/${normalizedAddr}/nft-data`);
    return safeGet(url);
}
async function refreshProfileNftData(addr) {
    const normalizedAddr = addr?.trim();
    if (!normalizedAddr)
        return null;
    const url = buildUrl(`/contracts/profile-item/${normalizedAddr}/nft-data`);
    return safeDelete(url);
}
async function getProfilePrograms(addr) {
    const normalizedAddr = addr?.trim();
    if (!normalizedAddr)
        return null;
    const url = buildUrl(`/contracts/profile-item/${normalizedAddr}/programs`);
    return safeGet(url);
}
async function getContractBalance(addr) {
    const normalizedAddr = addr?.trim();
    if (!normalizedAddr)
        return null;
    const url = buildUrl(`/contracts/general/${normalizedAddr}/balance`);
    return safeGet(url);
}
async function getCollectionData() {
    const url = buildUrl("/contracts/profile-collection/data");
    return safeGet(url);
}
async function getWalletHistory(addr, request = {}) {
    const normalizedAddr = addr?.trim();
    if (!normalizedAddr)
        return null;
    const url = new URL(`/contracts/wallet/${normalizedAddr}/history`, normalizedBase || defaultOrigin);
    if (request.limit !== undefined)
        url.searchParams.set("limit", String(request.limit));
    if (request.lt !== undefined)
        url.searchParams.set("lt", String(request.lt));
    if (request.hash)
        url.searchParams.set("hash", request.hash);
    return safeGet(url.toString());
}
async function buildChooseInviterBody(request) {
    const inviterAddr = request.inviterAddr?.trim();
    const inviteAddr = request.inviteAddr?.trim();
    if (!inviterAddr || !inviteAddr)
        return null;
    if (!Number.isFinite(request.program))
        return null;
    if (!Number.isFinite(request.seqNo))
        return null;
    const url = new URL("/contracts/profile-item/body/choose-inviter", normalizedBase || defaultOrigin);
    url.searchParams.set("program", String(request.program));
    url.searchParams.set("inviterAddr", inviterAddr);
    url.searchParams.set("seqNo", String(request.seqNo));
    url.searchParams.set("inviteAddr", inviteAddr);
    return safeGet(url.toString());
}
async function buildEditContentBody(request) {
    const login = request.login?.trim();
    if (!login)
        return null;
    const url = new URL("/contracts/profile-item/body/edit-content", normalizedBase || defaultOrigin);
    url.searchParams.set("login", login);
    if (request.imageUrl)
        url.searchParams.set("imageUrl", request.imageUrl);
    if (request.firstName)
        url.searchParams.set("firstName", request.firstName);
    if (request.lastName)
        url.searchParams.set("lastName", request.lastName);
    if (request.tgUsername)
        url.searchParams.set("tgUsername", request.tgUsername);
    return safeGet(url.toString());
}
async function buildDeployItemBody(request) {
    const login = request.login?.trim();
    if (!login)
        return null;
    const url = new URL("/contracts/profile-collection/body/deploy-item-content", normalizedBase || defaultOrigin);
    url.searchParams.set("login", login);
    if (request.imageUrl)
        url.searchParams.set("imageUrl", request.imageUrl);
    if (request.firstName)
        url.searchParams.set("firstName", request.firstName);
    if (request.lastName)
        url.searchParams.set("lastName", request.lastName);
    if (request.tgUsername)
        url.searchParams.set("tgUsername", request.tgUsername);
    return safeGet(url.toString());
}
async function buildBuyPlaceBody(request) {
    if (!Number.isFinite(request.m))
        return null;
    const profileAddr = request.profileAddr?.trim();
    const parentAddr = request.parentAddr?.trim();
    const pos = request.pos ?? undefined;
    if (!profileAddr)
        return null;
    const url = new URL("/contracts/multi/body/buy-place", normalizedBase || defaultOrigin);
    url.searchParams.set("m", String(request.m));
    url.searchParams.set("profileAddr", profileAddr);
    if (parentAddr)
        url.searchParams.set("parentAddr", parentAddr);
    if (pos !== undefined && pos !== null)
        url.searchParams.set("pos", String(pos));
    return safeGet(url.toString());
}
async function buildLockPosBody(request) {
    if (!Number.isFinite(request.m))
        return null;
    const profileAddr = request.profileAddr?.trim();
    const parentAddr = request.parentAddr?.trim();
    const pos = request.pos;
    if (!profileAddr || !parentAddr || !Number.isFinite(pos))
        return null;
    const url = new URL("/contracts/multi/body/lock-pos", normalizedBase || defaultOrigin);
    url.searchParams.set("m", String(request.m));
    url.searchParams.set("profileAddr", profileAddr);
    url.searchParams.set("parentAddr", parentAddr);
    url.searchParams.set("pos", String(pos));
    return safeGet(url.toString());
}
async function buildUnlockPosBody(request) {
    if (!Number.isFinite(request.m))
        return null;
    const profileAddr = request.profileAddr?.trim();
    const parentAddr = request.parentAddr?.trim();
    const pos = request.pos;
    if (!profileAddr || !parentAddr || !Number.isFinite(pos))
        return null;
    const url = new URL("/contracts/multi/body/unlock-pos", normalizedBase || defaultOrigin);
    url.searchParams.set("m", String(request.m));
    url.searchParams.set("profileAddr", profileAddr);
    url.searchParams.set("parentAddr", parentAddr);
    url.searchParams.set("pos", String(pos));
    return safeGet(url.toString());
}
async function buildMarketingBuyPlaceByTonBody(request) {
    if (!Number.isFinite(request.m))
        return null;
    const profileAddr = request.profileAddr?.trim();
    const parentAddr = request.parentAddr?.trim();
    const pos = request.pos ?? undefined;
    if (!profileAddr)
        return null;
    const url = new URL("/contracts/marketing/body/buy-place-by-ton", normalizedBase || defaultOrigin);
    url.searchParams.set("m", String(request.m));
    url.searchParams.set("profileAddr", profileAddr);
    url.searchParams.set("first", String(request.first));
    if (parentAddr)
        url.searchParams.set("parentAddr", parentAddr);
    if (pos !== undefined && pos !== null)
        url.searchParams.set("pos", String(pos));
    return safeGet(url.toString());
}
async function buildMarketingBuyPlaceByJettonBody(request) {
    if (!Number.isFinite(request.m))
        return null;
    const marketingAddr = request.marketingAddr?.trim();
    const profileAddr = request.profileAddr?.trim();
    const parentAddr = request.parentAddr?.trim();
    const senderAddr = request.senderAddr?.trim();
    const pos = request.pos ?? undefined;
    if (!marketingAddr || !profileAddr || !senderAddr)
        return null;
    const url = new URL("/contracts/marketing/body/buy-place-by-jetton", normalizedBase || defaultOrigin);
    url.searchParams.set("marketingAddr", marketingAddr);
    url.searchParams.set("m", String(request.m));
    url.searchParams.set("profileAddr", profileAddr);
    url.searchParams.set("first", String(request.first));
    if (parentAddr)
        url.searchParams.set("parentAddr", parentAddr);
    if (pos !== undefined && pos !== null)
        url.searchParams.set("pos", String(pos));
    url.searchParams.set("amount", String(request.amount));
    url.searchParams.set("senderAddr", senderAddr);
    url.searchParams.set("fee", String(request.fee));
    return safeGet(url.toString());
}
async function buildMarketingLockPosBody(request) {
    if (!Number.isFinite(request.m))
        return null;
    const profileAddr = request.profileAddr?.trim();
    const parentAddr = request.parentAddr?.trim();
    const pos = request.pos;
    if (!profileAddr || !parentAddr || !Number.isFinite(pos))
        return null;
    const url = new URL("/contracts/marketing/body/lock-pos", normalizedBase || defaultOrigin);
    url.searchParams.set("m", String(request.m));
    url.searchParams.set("profileAddr", profileAddr);
    url.searchParams.set("parentAddr", parentAddr);
    url.searchParams.set("pos", String(pos));
    return safeGet(url.toString());
}
async function buildMarketingUnlockPosBody(request) {
    if (!Number.isFinite(request.m))
        return null;
    const profileAddr = request.profileAddr?.trim();
    const parentAddr = request.parentAddr?.trim();
    const pos = request.pos;
    if (!profileAddr || !parentAddr || !Number.isFinite(pos))
        return null;
    const url = new URL("/contracts/marketing/body/unlock-pos", normalizedBase || defaultOrigin);
    url.searchParams.set("m", String(request.m));
    url.searchParams.set("profileAddr", profileAddr);
    url.searchParams.set("parentAddr", parentAddr);
    url.searchParams.set("pos", String(pos));
    return safeGet(url.toString());
}
async function getMarketingFirstTask(addr) {
    const normalizedAddr = addr?.trim();
    if (!normalizedAddr)
        return null;
    const url = buildUrl(`/contracts/marketing/${normalizedAddr}/first-task`);
    return safeGet(url);
}
async function getMarketingData(addr) {
    const normalizedAddr = addr?.trim();
    if (!normalizedAddr)
        return null;
    const url = buildUrl(`/contracts/marketing/${normalizedAddr}/data`);
    return safeGet(url);
}
async function getMatrixPlaceData(addr) {
    const normalizedAddr = addr?.trim();
    if (!normalizedAddr)
        return null;
    const url = buildUrl(`/contracts/matrix-place/${normalizedAddr}/data`);
    return safeGet(url);
}
async function getJettonWalletAddress(addr, ownerAddr) {
    const normalizedAddr = addr?.trim();
    const normalizedOwnerAddr = ownerAddr?.trim();
    if (!normalizedAddr || !normalizedOwnerAddr)
        return null;
    const url = new URL(`/contracts/jetton-minter/${normalizedAddr}/wallet-addr`, normalizedBase || defaultOrigin);
    url.searchParams.set("ownerAddr", normalizedOwnerAddr);
    return safeGet(url.toString());
}
async function getJettonWalletData(addr) {
    const normalizedAddr = addr?.trim();
    if (!normalizedAddr)
        return null;
    const url = buildUrl(`/contracts/jetton-wallet/${normalizedAddr}/data`);
    return safeGet(url);
}
exports.contractsApi = {
    getInviteAddrBySeqNo,
    getInviteData,
    getMinQueueTask,
    getMultiData,
    getPlaceData,
    getNftAddrByLogin,
    getProfileNftData,
    refreshProfileNftData,
    getProfilePrograms,
    getContractBalance,
    getCollectionData,
    getWalletHistory,
    buildChooseInviterBody,
    buildEditContentBody,
    buildDeployItemBody,
    buildBuyPlaceBody,
    buildLockPosBody,
    buildUnlockPosBody,
    buildMarketingBuyPlaceByTonBody,
    buildMarketingBuyPlaceByJettonBody,
    buildMarketingLockPosBody,
    buildMarketingUnlockPosBody,
    getMarketingFirstTask,
    getMarketingData,
    getMatrixPlaceData,
    getJettonWalletAddress,
    getJettonWalletData,
};

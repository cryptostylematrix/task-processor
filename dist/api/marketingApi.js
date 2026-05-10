"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketingApi = void 0;
exports.getRootPlace = getRootPlace;
exports.getNextPos = getNextPos;
exports.getPath = getPath;
exports.fetchPlaces = fetchPlaces;
exports.getPlacesCount = getPlacesCount;
exports.getTotalPlaceCount = getTotalPlaceCount;
exports.fetchLocks = fetchLocks;
exports.searchPlaces = searchPlaces;
exports.getTree = getTree;
const config_1 = require("../config");
const trimTrailingSlash = (value) => value.replace(/\/+$/, "");
const normalizedBase = (() => {
    const raw = config_1.apiConfig.marketingApi.host || "";
    if (!raw)
        return "";
    const withProtocol = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `http://${raw}`;
    return trimTrailingSlash(withProtocol);
})();
const defaultOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
const buildUrl = (path, query) => {
    const url = new URL(path, normalizedBase || defaultOrigin);
    if (query) {
        Object.entries(query).forEach(([key, value]) => {
            if (value === undefined || value === null || value === "")
                return;
            url.searchParams.set(key, String(value));
        });
    }
    return url.toString();
};
const encodePathPart = (value) => encodeURIComponent(String(value));
const emptyPlacesPage = { items: [], page: 1, total_pages: 1 };
const emptyLocksPage = { items: [], page: 1, total_pages: 1 };
const safeGet = async (path, query) => {
    try {
        const res = await fetch(buildUrl(path, query));
        if (res.status === 404)
            return null;
        if (!res.ok)
            throw new Error(`Request failed with status ${res.status}`);
        return (await res.json());
    }
    catch (err) {
        console.error("marketingApi request error:", err);
        return null;
    }
};
async function getRootPlace(marketingAddr, m, profileAddr) {
    return safeGet(`/api/marketing/${encodePathPart(marketingAddr)}/root`, { m, profile_addr: profileAddr });
}
async function getNextPos(marketingAddr, m, profileAddr) {
    return safeGet(`/api/marketing/${encodePathPart(marketingAddr)}/next-pos`, { m, profile_addr: profileAddr });
}
async function getPath(marketingAddr, rootAddr, placeAddr) {
    return safeGet(`/api/marketing/${encodePathPart(marketingAddr)}/path`, {
        root_addr: rootAddr,
        place_addr: placeAddr,
    });
}
async function fetchPlaces(marketingAddr, m, profileAddr, page = 1, pageSize = 50) {
    const result = await safeGet(`/api/marketing/${encodePathPart(marketingAddr)}/places`, { m, profile_addr: profileAddr, page, page_size: pageSize });
    return result ?? emptyPlacesPage;
}
async function getPlacesCount(marketingAddr, m, profileAddr) {
    const result = await safeGet(`/api/marketing/${encodePathPart(marketingAddr)}/places/count`, { m, profile_addr: profileAddr });
    return result?.count ?? 0;
}
async function getTotalPlaceCount(marketingAddr, profileAddr) {
    const result = await safeGet(`/api/marketing/${encodePathPart(marketingAddr)}/places/total-count`, { profile_addr: profileAddr });
    return result?.total_count ?? 0;
}
async function fetchLocks(marketingAddr, m, profileAddr, page = 1, pageSize = 50) {
    const result = await safeGet(`/api/marketing/${encodePathPart(marketingAddr)}/locks`, { m, profile_addr: profileAddr, page, page_size: pageSize });
    return result ?? emptyLocksPage;
}
async function searchPlaces(marketingAddr, m, profileAddr, query, page = 1, pageSize = 50) {
    const result = await safeGet(`/api/marketing/${encodePathPart(marketingAddr)}/search`, { m, profile_addr: profileAddr, query, page, page_size: pageSize });
    return result ?? emptyPlacesPage;
}
async function getTree(marketingAddr, profileAddr, placeAddr, fromPos, toPos) {
    return safeGet(`/api/marketing/${encodePathPart(marketingAddr)}/tree`, { profile_addr: profileAddr, place_addr: placeAddr, from_pos: fromPos, to_pos: toPos });
}
exports.marketingApi = {
    getRootPlace,
    getNextPos,
    getPath,
    fetchPlaces,
    getPlacesCount,
    getTotalPlaceCount,
    fetchLocks,
    searchPlaces,
    getTree,
};

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findNextPos = void 0;
const placesRepository_1 = require("../repositories/placesRepository");
/**
 * Find the next available position for a profile within a matrix,
 * walking open places in batches until a non-locked candidate is found.
 */
const findNextPos = async (rootPlace, locks) => {
    const lockMps = locks.map((lock) => lock.mp);
    const isLockedMp = (mp) => lockMps.some((lockMp) => mp.startsWith(lockMp));
    let page = 1;
    const pageSize = 50;
    while (true) {
        const openPlaces = await placesRepository_1.placesRepository.getOpenPlacesByMpPrefix(rootPlace.m, rootPlace.mp, page, pageSize);
        // Ensure deterministic order: shortest mp first, then lexicographic.
        openPlaces.items.sort((a, b) => (a.mp.length - b.mp.length) || a.mp.localeCompare(b.mp));
        for (const place of openPlaces.items) {
            const childMp = `${place.mp}${place.filling}`;
            if (!isLockedMp(childMp)) {
                return place;
            }
        }
        if (openPlaces.items.length < pageSize) {
            return null; // No more places to check
        }
        page += 1;
    }
};
exports.findNextPos = findNextPos;

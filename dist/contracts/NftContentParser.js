"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseProfileContent = void 0;
const core_1 = require("@ton/core");
const crypto_1 = require("@ton/crypto");
const dict_1 = require("./dict");
const logger_1 = require("../logger");
const toLower = (value) => value && value.trim().length > 0 ? value.trim().toLowerCase() : undefined;
const sanitizeLogin = (value) => {
    if (!value) {
        return undefined;
    }
    // Drop non-printable characters and trim.
    const cleaned = value
        .split("")
        .filter((ch) => {
        const code = ch.charCodeAt(0);
        return code >= 32 && code <= 126;
    })
        .join("")
        .trim()
        .toLowerCase();
    return cleaned.length > 0 ? cleaned : undefined;
};
const capitalize = (value) => {
    if (!value || value.trim().length === 0) {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};
const extractAttributes = (raw) => {
    if (!raw) {
        return { firstName: undefined, lastName: undefined, tgUsername: undefined, login: undefined };
    }
    try {
        const attrs = JSON.parse(raw);
        if (!Array.isArray(attrs)) {
            return { firstName: undefined, lastName: undefined, tgUsername: undefined, login: undefined };
        }
        const getValue = (trait) => attrs.find((a) => a && a.trait_type === trait)?.value;
        return {
            firstName: getValue("firstName"),
            lastName: getValue("lastName"),
            tgUsername: getValue("tgUsername"),
            login: getValue("login"),
        };
    }
    catch {
        return { firstName: undefined, lastName: undefined, tgUsername: undefined, login: undefined };
    }
};
const parseProfileContent = (content) => {
    if (!content) {
        return null;
    }
    let dictResult = {};
    try {
        const slice = content.beginParse();
        const start = slice.loadUint(8);
        if (start !== 0) {
            throw new Error("Unknown on-chain content format");
        }
        const dict = slice.loadDict(core_1.Dictionary.Keys.Buffer(32), dict_1.NFTDictValueSerializer);
        const keys = ["image", "name", "description", "attributes"];
        for (const key of keys) {
            const dictKey = (0, crypto_1.sha256_sync)(key);
            const dictValue = dict.get(dictKey);
            if (dictValue) {
                dictResult[key] = dictValue.content.toString("utf-8");
            }
        }
    }
    catch (error) {
        logger_1.logger.error(`getProfile error: ${error}`);
        return null;
    }
    const fields = dictResult;
    const { firstName, lastName, tgUsername, login: attrLogin } = extractAttributes(fields.attributes);
    const normalizedImageUrl = toLower(fields.image) && toLower(fields.image) !== ""
        ? toLower(fields.image)
        : "https://cryptostylematrix.github.io/frontend/cs-big.png";
    const normalizedFirstName = capitalize(firstName);
    const normalizedLastName = capitalize(lastName);
    const normalizedTgUsername = toLower(tgUsername);
    const normalizedLogin = sanitizeLogin(attrLogin ?? fields.name) ?? "unknown";
    return {
        login: normalizedLogin,
        imageUrl: normalizedImageUrl,
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        tgUsername: normalizedTgUsername,
    };
};
exports.parseProfileContent = parseProfileContent;

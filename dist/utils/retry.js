"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retry = retry;
exports.retryExp = retryExp;
const logger_1 = require("../logger");
async function retry(fn, retries = 5, delay = 300) {
    try {
        return await fn();
    }
    catch (error) {
        if (retries <= 0)
            throw error;
        await logger_1.logger.warn(`[TON] retrying after error: ${error}`);
        await new Promise((res) => setTimeout(res, delay));
        return retry(fn, retries - 1, delay * 2);
    }
}
async function retryExp(fn, retries = 5, baseDelay = 300 // initial delay
) {
    let attempt = 0;
    while (attempt <= retries) {
        try {
            return await fn();
        }
        catch (error) {
            if (attempt === retries)
                throw error;
            const delay = baseDelay * Math.pow(2, attempt);
            await logger_1.logger.warn(`[TON] retry #${attempt + 1} in ${delay}ms (${error})`);
            await new Promise((res) => setTimeout(res, delay));
            attempt++;
        }
    }
    throw new Error("Unexpected exit from retry loop");
}

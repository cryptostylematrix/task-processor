"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTonClient = exports.limited = void 0;
const ton_1 = require("@ton/ton");
const config_1 = require("../config");
const bottleneck_1 = __importDefault(require("bottleneck"));
let tonClient = null;
// Create a limiter: 20 requests per second, sequential execution
const limiter = new bottleneck_1.default({
    reservoir: 20,
    reservoirRefreshAmount: 20,
    reservoirRefreshInterval: 1000,
    maxConcurrent: 1
});
// A helper that schedules TON calls through limiter
const limited = (fn) => {
    return limiter.schedule(fn);
};
exports.limited = limited;
const getTonClient = () => {
    if (tonClient)
        return tonClient;
    tonClient = new ton_1.TonClient({
        endpoint: config_1.tonConfig.tonCenterEndpoint,
        apiKey: config_1.tonConfig.tonCenterApiKey,
    });
    return tonClient;
};
exports.getTonClient = getTonClient;

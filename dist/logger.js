"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("./config");
// Logging function (fully typed)
async function sendToSeq(level, message, properties = {}) {
    try {
        await axios_1.default.post(`${config_1.seqConfig.url}/api/events/raw?apiKey=${config_1.seqConfig.apiKey}`, {
            Events: [
                {
                    Timestamp: new Date().toISOString(),
                    Level: level,
                    MessageTemplate: message,
                    Properties: properties,
                },
            ],
        });
    }
    catch (err) {
        console.error("Seq logging failed:", err);
    }
}
// Public logger API
exports.logger = {
    info(message, props) {
        return sendToSeq("Information", message, props);
    },
    warn(message, props) {
        return sendToSeq("Warning", message, props);
    },
    error(message, props) {
        return sendToSeq("Error", message, props);
    },
    debug(message, props) {
        return sendToSeq("Debug", message, props);
    },
    fatal(message, props) {
        return sendToSeq("Fatal", message, props);
    },
    verbose(message, props) {
        return sendToSeq("Verbose", message, props);
    },
};

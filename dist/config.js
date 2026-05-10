"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seqConfig = exports.tonConfig = exports.dbConfig = exports.apiConfig = exports.appConfig = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: process.env.NODE_ENV === "production" ? ".env" : ".env.development" });
// app settings
exports.appConfig = {
    port: Number(process.env.PORT || 3001),
};
const defaultMatrixApiHost = "https://cs.apihub160.cc";
//const defaultMatrixApiHost = "http://localhost:5004";
const defaultContractsApiHost = defaultMatrixApiHost;
const defaultMarketingApiHost = defaultMatrixApiHost;
const defaultNeoMarketingAddr = "EQAc4cKpE4yQpsadUsem6r30HHjjrmmtT13pPsRpvtLSEUHi";
exports.apiConfig = {
    matrixApi: {
        host: process.env.MATRIX_API_HOST ?? defaultMatrixApiHost,
        defaultApiHost: defaultMatrixApiHost,
    },
    contractsApi: {
        host: process.env.CONTRACTS_API_HOST ?? defaultContractsApiHost,
        defaultApiHost: defaultContractsApiHost,
    },
    marketingApi: {
        host: process.env.MARKETING_API_HOST ?? defaultMarketingApiHost,
        defaultApiHost: defaultMarketingApiHost,
    },
    neo: {
        marketingAddr: process.env.NEO_MARKETING_ADDR ?? defaultNeoMarketingAddr,
    },
};
// database settings 
exports.dbConfig = {
    host: process.env.PGHOST || "localhost",
    user: process.env.PGUSER || "cs_user",
    password: process.env.PGPASSWORD || "password",
    database: process.env.PGDATABASE || "cs",
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
};
// blockchain settings
exports.tonConfig = {
    marketingQueueAddress: process.env.MARKETING_QUEUE_ADDRESS ?? "",
    processorMnemonic: process.env.PROCESSOR_MNEMONIC ?? "",
    tonCenterEndpoint: process.env.TONCENTER_ENDPOINT ?? "https://toncenter.com/api/v2/jsonRPC",
    tonCenterApiKey: process.env.TONCENTER_API_KEY ?? "",
};
// seq logging settings
exports.seqConfig = {
    url: process.env.SEQ_URL || "http://localhost:5341",
    apiKey: process.env.SEQ_API_KEY || undefined,
};

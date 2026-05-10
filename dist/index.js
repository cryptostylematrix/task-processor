"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const locksRepository_1 = require("./repositories/locksRepository");
const placesRepository_1 = require("./repositories/placesRepository");
const taskProcessor_1 = require("./services/taskProcessor");
const config_1 = require("./config");
const logger_1 = require("./logger");
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Disable caching for all responses
app.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    next();
});
const allowedOrigins = [
    /^https?:\/\/localhost(:\d+)?$/i,
    /^https?:\/\/cryptostylematrix\.github\.io\/?$/i,
];
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.some((allowed) => allowed.test(origin))) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Vary", "Origin");
    }
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }
    next();
});
const placesRepo = placesRepository_1.placesRepository;
const locksRepo = locksRepository_1.locksRepository;
// type Place = {
//   id: number;
//   parent_id: number | null;
//   address: string;
//   parent_address: string | null;
//   place_number: number;
//   created_at: number;
//   fill_count: number;
//   clone: number;
//   pos: 0 | 1;
//   login: string;
//   index: string;
//   m: number;
//   mp: string;
//   profile_addr: string;
// };
const mapPlaceRow = (row) => ({
    // id: row.id,
    // parent_id: row.parent_id ?? null,
    addr: row.addr,
    parent_addr: row.parent_addr,
    place_number: row.place_number,
    created_at: row.craeted_at,
    fill_count: row.filling2,
    clone: row.clone,
    pos: row.pos ?? 0,
    login: row.profile_login,
    // index: row.index,
    m: row.m,
    // mp: row.mp,
    profile_addr: row.profile_addr,
});
const mapLockRow = (row) => ({
    m: row.m,
    profile_addr: row.profile_addr,
    place_addr: row.place_addr,
    locked_pos: row.locked_pos ?? 0,
    place_profile_login: row.place_profile_login,
    place_number: row.place_number,
    craeted_at: row.craeted_at
});
const buildPaginationPayload = (items, total, page = 1, pageSize = 10) => {
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10;
    const totalPages = Math.max(1, Math.ceil(total / safePageSize));
    return { items, page: safePage, totalPages };
};
app.get("/", (_req, res) => {
    res.send("API is well working!");
});
// Global error handler to surface uncaught route errors
app.use(async (err, _req, res, _next) => {
    await logger_1.logger.error(`Unhandled error: ${err}`);
    res.status(500).json({ error: "Internal server error" });
});
//if (process.env.NODE_ENV === "production") 
{
    const taskProcessor = new taskProcessor_1.TaskProcessor();
    void taskProcessor.run();
}
app.listen(config_1.appConfig.port, async () => {
    await logger_1.logger.info(`Server running at http://localhost:${config_1.appConfig.port}`);
});

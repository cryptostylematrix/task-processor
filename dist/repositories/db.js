"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const pg_1 = require("pg");
const config_1 = require("../config");
const logger_1 = require("../logger");
const createPool = () => {
    const pool = new pg_1.Pool({
        host: config_1.dbConfig.host,
        user: config_1.dbConfig.user,
        password: config_1.dbConfig.password,
        database: config_1.dbConfig.database,
        port: config_1.dbConfig.port,
        ssl: {
            rejectUnauthorized: false,
        },
    });
    pool
        .query("SELECT 1")
        .then(async () => {
        await logger_1.logger.info("PostgreSQL pool connected");
    })
        .catch(async (err) => {
        await logger_1.logger.error("PostgreSQL pool connection failed:", err);
    });
    pool.on("error", async (err) => {
        await logger_1.logger.error("Unexpected PostgreSQL pool error:", err);
    });
    return pool;
};
exports.pool = createPool();

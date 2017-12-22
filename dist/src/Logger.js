"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FluentLogger = require("fluent-logger");
const Microtime = require("microtime");
const Winston = require("winston");
const FluentTransport = FluentLogger.support.winstonTransport();
const createErrorMessage = (err) => {
    return err.stack ? err.stack.replace(/[\n\r]/g, "[next]") : err.toString() + " [no stack]";
};
class Logger extends Winston.Logger {
    constructor(logLevel, fluentConfig) {
        fluentConfig = fluentConfig || { enabled: false };
        const transports = [];
        // Add console logger
        transports.push(new Winston.transports.Console({
            timestamp: true,
            colorize: false,
            level: logLevel,
        }));
        // Add fluent logger
        if (fluentConfig.enabled) {
            transports.push(new FluentTransport(fluentConfig.tag, fluentConfig.config));
        }
        super({ transports });
    }
    loggingMiddlewarePre(req, res, next) {
        this.info("request", this.datingEvent({
            request_id: req.headers["x-request-id"],
            request_url: req.get("host") + req.originalUrl,
            method: req.method,
            client_ip: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
        }));
        // Need to override read and write methods to get chunk data from these "events"
        if (req.method === "GET") {
            const oldWrite = res.write;
            const oldEnd = res.end;
            res.chunks = [];
            res.write = (...args) => {
                const chunk = args[0];
                res.chunks.push(Buffer.from(chunk));
                return oldWrite.apply(res, args);
            };
            res.end = (...args) => {
                const chunk = args[0];
                if (chunk) {
                    res.chunks.push(Buffer.from(chunk));
                }
                const response = oldEnd.apply(res, args);
                res.sentBody = res.chunks.length > 0
                    ? Buffer.concat(res.chunks).toString("utf8")
                    : "";
                return response;
            };
        }
        next();
    }
    // Middleware for logging response status
    loggingMiddlewarePost(req, res, next) {
        const event = this.datingEvent({
            request_id: req.headers["x-request-id"],
            request_url: req.get("host") + req.originalUrl,
            status: res.statusCode,
            body: undefined,
        });
        let level;
        if (res.statusCode < 400) {
            if (req.method === "GET") {
                event.body = res.sentBody;
            }
            level = "info";
            /* tslint:disable-next-line:prefer-conditional-expression */
        }
        else if (res.statusCode >= 400 && res.statusCode < 500) {
            level = "warn";
        }
        else {
            level = "error";
        }
        this.log(level, "response", event);
        next();
    }
    logHttpResponseError(req, res, err) {
        this.error("error response", this.datingEvent({
            msg: createErrorMessage(err),
            method: req.method,
            request_url: req.get("host") + req.originalUrl,
            request_id: req.headers["x-request-id"],
            status: res.statusCode,
        }));
    }
    logHttpResponseWarn(req, res, msg) {
        this.warn("client error response", this.datingEvent({
            msg,
            method: req.method,
            request_url: req.get("host") + req.originalUrl,
            request_id: req.headers["x-request-id"],
            status: res.statusCode,
        }));
    }
    logApplicationConfigError(err) {
        const msg = err ? createErrorMessage(err) : "unknown error";
        this.error("configuration error, application stopped", this.datingEvent({
            msg,
        }));
    }
    logApplicationStart() {
        this.warn("application start", this.datingEvent());
    }
    logApplicationStop() {
        this.warn("application stop", this.datingEvent());
    }
    datingEvent(event) {
        const date = {
            ts: Date.now(),
            mts: Microtime.now(),
        };
        // We can safely override date object because every time new date object is created
        // so no need to preserve the original object reference
        return event ? Object.assign(date, event) : date;
    }
}
exports.Logger = Logger;
//# sourceMappingURL=Logger.js.map
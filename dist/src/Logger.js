"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var FluentLogger = require("fluent-logger");
var Microtime = require("microtime");
var Winston = require("winston");
var FluentTransport = FluentLogger.support.winstonTransport();
var Logger = (function (_super) {
    __extends(Logger, _super);
    function Logger(logLevel, fluentConfig) {
        var _this = this;
        fluentConfig = fluentConfig || { enabled: false };
        var transports = [];
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
        _this = _super.call(this, { transports: transports }) || this;
        return _this;
    }
    Logger.prototype.loggingMiddlewarePre = function (req, res, next) {
        this.info("request", this.datingEvent({
            request_id: req.headers["x-request-id"],
            request_url: req.url,
            method: req.method,
            client_ip: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
        }));
        // Need to override read and write methods to get chunk data from these "events"
        if (req.method === "GET") {
            var oldWrite_1 = res.write;
            var oldEnd_1 = res.end;
            res.chunks = [];
            res.write = function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                var chunk = args[0];
                res.chunks.push(Buffer.from(chunk));
                return oldWrite_1.apply(res, args);
            };
            res.end = function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                var chunk = args[0];
                if (chunk) {
                    res.chunks.push(Buffer.from(chunk));
                }
                var response = oldEnd_1.apply(res, args);
                res.sentBody = res.chunks.length > 0
                    ? Buffer.concat(res.chunks).toString("utf8")
                    : "";
                return response;
            };
        }
        next();
    };
    // Middleware for logging response status
    Logger.prototype.loggingMiddlewarePost = function (req, res, next) {
        var event = this.datingEvent({
            request_id: req.headers["x-request-id"],
            request_url: req.url,
            status: res.statusCode,
            body: undefined,
        });
        var level;
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
    };
    Logger.prototype.logHttpResponseError = function (req, res, err) {
        this.warn("error response", this.datingEvent({
            msg: err.message,
            method: req.method,
            request_url: req.url,
            request_id: req.headers["x-request-id"],
            status: res.statusCode,
        }));
    };
    Logger.prototype.logHttpResponseWarn = function (req, res, msg) {
        this.warn("client error response", this.datingEvent({
            msg: msg,
            method: req.method,
            request_url: req.url,
            request_id: req.headers["x-request-id"],
            status: res.statusCode,
        }));
    };
    Logger.prototype.logApplicationConfigError = function (err) {
        this.error("configuration error, application stopped", this.datingEvent({
            msg: err ? err.message : "unknown error",
        }));
    };
    Logger.prototype.logApplicationStart = function () {
        this.warn("application start", this.datingEvent());
    };
    Logger.prototype.logApplicationStop = function () {
        this.warn("application stop", this.datingEvent());
    };
    Logger.prototype.datingEvent = function (event) {
        var date = {
            ts: Date.now(),
            mts: Microtime.now(),
        };
        // We can safely override date object because every time new date object is created
        // so no need to preserve the original object reference
        return event ? Object.assign(date, event) : date;
    };
    return Logger;
}(Winston.Logger));
exports.Logger = Logger;
//# sourceMappingURL=Logger.js.map
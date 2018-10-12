import * as Express from "express";
import * as FluentLogger from "fluent-logger";
import * as Microtime from "microtime";
import * as Winston from "winston";
import * as Transport from "winston-transport";

export type LoggingResponse = Express.Response & { chunks?: Buffer[], sentBody?: string };

const FluentTransport = FluentLogger.support.winstonTransport();

const createErrorMessage = (err: any) => {
    return err.stack ? err.stack.replace(/[\n\r]/g, "[next]") : err.toString() + " [no stack]";
};

export interface FluentConfig {
    enabled: boolean;
    tag?: string;
    config?: FluentLogger.WinstonTransportOptions;
}

export interface ExpressLogger extends Winston.Logger {
    loggingMiddlewarePre(req: Express.Request, res: LoggingResponse, next: Express.NextFunction): void;
    loggingMiddlewarePost(req: Express.Request, res: LoggingResponse, next: Express.NextFunction): void;
    logHttpResponseError(req: Express.Request, res: Express.Response, err: any): void;
    logHttpResponseError(req: Express.Request, res: Express.Response, err: any): void;
    logHttpResponseWarn(req: Express.Request, res: Express.Response, msg: string): void;
    logApplicationConfigError(err: any): void;
    logApplicationStart(): void;
    logApplicationStop(): void;
}

export function createLogger (logLevel: string, fluentConfig?: FluentConfig): ExpressLogger {
    
    fluentConfig = fluentConfig || {enabled: false};

    const transports: Transport[] = [];

    // Add console logger
    transports.push(new Winston.transports.Console({
        format: Winston.format.combine(
            Winston.format.timestamp()
        ),
        level: logLevel,
    }));

    // Add fluent logger
    if (fluentConfig.enabled) {
        transports.push(new FluentTransport(fluentConfig.tag, fluentConfig.config));
    }

    const options: Winston.LoggerOptions = {
        transports
    }
    
    const expressLogger: ExpressLogger = Winston.createLogger(options) as ExpressLogger

    expressLogger.loggingMiddlewarePre = (function (req: Express.Request, res: LoggingResponse, next: Express.NextFunction): void {
        this.info("request", datingEvent({
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

            res.write = (...args: any[]) => {
                const chunk = args[0];

                res.chunks.push(Buffer.from(chunk));

                return oldWrite.apply(res, args);
            };

            res.end = (...args: any[]) => {
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
    }).bind(expressLogger)

    // Middleware for logging response status
    expressLogger.loggingMiddlewarePost = (function (req: Express.Request, res: LoggingResponse, next: Express.NextFunction): void {
        const event = datingEvent({
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
        } else if (res.statusCode >= 400 && res.statusCode < 500) {
            level = "warn";
        } else {
            level = "error";
        }

        this.log(level, "response", event);

        next();
    }).bind(expressLogger)

    expressLogger.logHttpResponseError = (function (req: Express.Request, res: Express.Response, err: any): void {
        this.error("error response", datingEvent({
            msg: createErrorMessage(err),
            method: req.method,
            request_url: req.get("host") + req.originalUrl,
            request_id: req.headers["x-request-id"],
            status: res.statusCode,
        }));
    }).bind(expressLogger)

    expressLogger.logHttpResponseWarn = (function (req: Express.Request, res: Express.Response, msg: string): void {
        this.warn("client error response", datingEvent({
            msg,
            method: req.method,
            request_url: req.get("host") + req.originalUrl,
            request_id: req.headers["x-request-id"],
            status: res.statusCode,
        }));
    }).bind(expressLogger)

    expressLogger.logApplicationConfigError = (function (err: any): void {
        const msg = err ? createErrorMessage(err) : "unknown error";
        this.error("configuration error, application stopped", datingEvent({
            msg,
        }));
    }).bind(expressLogger)

    expressLogger.logApplicationStart = (function (): void {
        this.warn("application start", datingEvent());
    }).bind(expressLogger)

    expressLogger.logApplicationStop = (function (): void {
        this.warn("application stop", datingEvent());
    }).bind(expressLogger)

    return expressLogger
}

function datingEvent<T>(event?: T): T & { ts: number, mts: number } {
    const date = {
        ts: Date.now(),
        mts: Microtime.now(),
    };

    // We can safely override date object because every time new date object is created
    // so no need to preserve the original object reference
    /* tslint:disable-next-line:prefer-object-spread */
    return event ? Object.assign(date, event) : date as T & { ts: number, mts: number };
}

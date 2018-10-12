/// <reference types="node" />
import * as Express from "express";
import * as FluentLogger from "fluent-logger";
import * as Winston from "winston";
export declare type LoggingResponse = Express.Response & {
    chunks?: Buffer[];
    sentBody?: string;
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
export declare function createLogger(logLevel: string, fluentConfig?: FluentConfig): ExpressLogger;

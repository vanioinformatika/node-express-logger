import {expect, use as chaiUse} from "chai";
import * as Express from "express";
import "mocha";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as Winston from "winston";
import { createLogger } from "./Logger";
import * as FluentLogger from "fluent-logger";

const FluentTransport = FluentLogger.support.winstonTransport();

chaiUse(sinonChai);

/* tslint:disable:no-unused-expression */

describe("logger", () => {
    describe("create new logger", () => {
        it("should contain a fluent transport if the fluentConfig's enabled parameter is true", () => {
            const logLevel = "info";
            const fluentConfig = {
                enabled: true,
                tag: "Something",
                config: {
                    host: "localhost",
                    port: 12345,
                },
            };
            const logger = createLogger(logLevel, fluentConfig);
            expect(logger.transports.some(t => t instanceof Winston.transports.Console)).to.equal(true);
            expect(logger.transports.some(t => t instanceof FluentTransport)).to.equal(true);
        });
        it("should not contain a fluent transport if the fluentConfig's enabled parameter is false", () => {
            const logger = createLogger("info", {enabled: false});
            expect(logger.transports.some(t => t instanceof Winston.transports.Console)).to.equal(true);
            expect(logger.transports.some(t => t instanceof FluentTransport)).to.equal(false);
            expect(logger.loggingMiddlewarePre).to.be.instanceof(Function);
            expect(logger.loggingMiddlewarePost).to.be.instanceof(Function);
            expect(logger.logHttpResponseError).to.be.instanceof(Function);
            expect(logger.logHttpResponseWarn).to.be.instanceof(Function);
        });

        describe("Middlewares", () => {
            const requestHost = "myhost:9000";
            const requestUrl = "/valami";
            const requestId = "abcd1234";
            const remoteAddress = "10.128.2.84";
            const fullRequestUrl = requestHost + requestUrl;
            const request: Express.Request = {
                headers: {
                    "x-request-id": requestId,
                    "host": requestHost,
                },
                url: requestUrl,
                originalUrl: requestUrl,
                connection: {
                    remoteAddress,
                },
                get(headerName: string) {
                    if (headerName === "host") {
                        return requestHost;
                    }
                    return null;
                },
            } as any;

            describe("loggingMiddlewarePre", () => {
                const logger = createLogger("info", {enabled: false});
                it("should log the HTTP request with GET method and overwrite res.write and res.end", () => {
                    const requestMethod = "GET";
                    const req = {...request, method: requestMethod};
                    const resWrite = sinon.spy();
                    const resEnd = sinon.spy();
                    const res: Express.Response = {
                        write: resWrite,
                        end: resEnd,
                    } as any;
                    const next = sinon.spy();

                    logger.info = <Winston.LeveledLogMethod> <any> sinon.spy((message: string, meta: any, callback: Winston.LogCallback): Winston.Logger => {
                        expect(message).to.equal("request");
                        expect(meta.client_ip).to.equal(remoteAddress);
                        expect(meta.method).to.equal(requestMethod);
                        expect(meta.request_id).to.equal(requestId);
                        expect(meta.request_url).to.equal(fullRequestUrl);
                        expect(meta.ts).to.exist;

                        return logger;
                    });
                    logger.loggingMiddlewarePre(req as any, res, next);
                    const content1 = "testcontent1";
                    const content2 = "testcontent2";
                    res.write(content1);
                    res.end(content2);
                    expect(logger.info).to.have.been.calledOnceWith( 'request', {
                        client_ip: remoteAddress,
                        method: requestMethod,
                        mts: sinon.match.number,
                        request_id: requestId,
                        request_url: fullRequestUrl,
                        ts: sinon.match.number
                    })
                    expect(next).to.have.been.called;
                    expect(resWrite).to.have.been.calledWith(content1);
                    expect(resEnd).to.have.been.calledWith(content2);
                    expect(res.write).to.be.instanceof(Function);
                    expect(res.end).to.be.instanceof(Function);
                    expect((res as any).sentBody).to.equal(content1 + content2);
                });
                it("should log the HTTP request with GET method and overwrite res.write and res.end", () => {
                    const requestMethod = "GET";
                    const req = {...request, method: requestMethod};
                    const resWrite = sinon.spy();
                    const resEnd = sinon.spy();
                    const res: Express.Response = {
                        write: resWrite,
                        end: resEnd,
                    } as any;
                    const next = sinon.spy();

                    logger.info = <Winston.LeveledLogMethod> <any> sinon.spy((message: string, meta: any, callback: Winston.LogCallback): Winston.Logger => {
                        expect(message).to.equal("request");
                        expect(meta.client_ip).to.equal(remoteAddress);
                        expect(meta.method).to.equal(requestMethod);
                        expect(meta.request_id).to.equal(requestId);
                        expect(meta.request_url).to.equal(fullRequestUrl);
                        expect(meta.ts).to.exist;

                        return logger;
                    });
                    logger.loggingMiddlewarePre(req as any, res, next);
                    res.end();

                    expect(logger.info).to.have.been.calledOnceWith( 'request', {
                        client_ip: remoteAddress,
                        method: requestMethod,
                        mts: sinon.match.number,
                        request_id: requestId,
                        request_url: fullRequestUrl,
                        ts: sinon.match.number
                    })
                    expect(next).to.have.been.called;
                    expect(resWrite).to.have.not.been.called;
                    expect(resEnd).to.have.been.called;
                    expect(res.write).to.be.instanceof(Function);
                    expect(res.end).to.be.instanceof(Function);
                    expect((res as any).sentBody).to.equal("");
                });

                /* tslint:disable-next-line:max-line-length */
                it("should log the HTTP request with POST method and should not overwrite res.write and res.end", () => {
                    const requestMethod = "POST";
                    const req = {...request, method: requestMethod};
                    const res: Express.Response = {} as any;
                    const next = sinon.spy();

                    logger.info = <Winston.LeveledLogMethod> <any> sinon.spy((message: string, meta: any, callback: Winston.LogCallback): Winston.Logger => {
                        expect(message).to.equal("request");
                        expect(meta.client_ip).to.equal(remoteAddress);
                        expect(meta.method).to.equal(requestMethod);
                        expect(meta.request_id).to.equal(requestId);
                        expect(meta.request_url).to.equal(fullRequestUrl);
                        expect(meta.ts).to.exist;

                        return logger;
                    });
                    logger.loggingMiddlewarePre(req as any, res, next);

                    expect(logger.info).to.have.been.calledOnceWith( 'request', {
                        client_ip: remoteAddress,
                        method: requestMethod,
                        mts: sinon.match.number,
                        request_id: requestId,
                        request_url: fullRequestUrl,
                        ts: sinon.match.number
                    })
                    expect(next).to.have.been.called;
                    expect((res as any).write).to.equal(undefined);
                    expect((res as any).end).to.equal(undefined);
                });
                it("should log the HTTP request with POST method and forwarded remote address", () => {
                    const requestMethod = "POST";
                    const forwardedRemoteAddress = "10.98.20.4";
                    const req = {
                        ...request,
                        method: requestMethod,
                        headers: {
                            ...request.headers,
                            "x-forwarded-for": forwardedRemoteAddress,
                        },
                    };
                    const res: Express.Response = {} as any;
                    const next = sinon.spy();

                    logger.info = <Winston.LeveledLogMethod> <any> sinon.spy((message: string, meta: any, callback: Winston.LogCallback): Winston.Logger => {
                        expect(message).to.equal("request");
                        expect(meta.client_ip).to.equal(forwardedRemoteAddress);
                        expect(meta.method).to.equal(requestMethod);
                        expect(meta.request_id).to.equal(requestId);
                        expect(meta.request_url).to.equal(fullRequestUrl);
                        expect(meta.ts).to.exist;

                        return logger;
                    });
                    logger.loggingMiddlewarePre(req as any, res, next);

                    expect(logger.info).to.have.been.calledOnceWith( 'request', {
                        client_ip: forwardedRemoteAddress,
                        method: requestMethod,
                        mts: sinon.match.number,
                        request_id: requestId,
                        request_url: fullRequestUrl,
                        ts: sinon.match.number
                    })
                    expect(next).to.have.been.called;
                    expect((res as any).write).to.equal(undefined);
                    expect((res as any).end).to.equal(undefined);
                });
           });

            describe("loggingMiddlewarePost", () => {
                const logger = createLogger("info", {enabled: false});
                it("should log the GET HTTP response with status code 200 as info along with response body", () => {
                    const requestMethod = "GET";
                    const req = {...request, method: requestMethod};
                    const res: Express.Response = {statusCode: 200, sentBody: "dummy"} as any;
                    const next = sinon.spy();

                    logger.log = <Winston.LeveledLogMethod> <any> sinon.spy((level: string, message: string, msg: any, callback: Winston.LogCallback): Winston.Logger => {
                        expect(level).to.equal("info");
                        expect(message).to.equal("response");
                        expect(msg.request_id).to.equal(requestId);
                        expect(msg.request_url).to.equal(fullRequestUrl);
                        expect(msg.status).to.equal(res.statusCode);
                        expect(msg.body).to.equal((res as any).sentBody);
                        expect(msg.ts).to.exist;

                        return logger;
                    });
                    logger.loggingMiddlewarePost(req as any, res, next);

                    expect(logger.log).to.have.been.calledOnceWith('info', 'response', {
                        body: (res as any).sentBody,
                        mts: sinon.match.number,
                        request_id: requestId,
                        request_url: fullRequestUrl,
                        status: res.statusCode,
                        ts: sinon.match.number
                    })
                    expect(next).to.have.been.called;
                });
                /* tslint:disable-next-line:max-line-length */
                it("should log the non-GET HTTP response with status code 200 as info without the response body", () => {
                    const requestMethod = "POST";
                    const req = {...request, method: requestMethod};
                    const res: Express.Response = {statusCode: 200, sentBody: "dummy"} as any;
                    const next = sinon.spy();

                    logger.log = <Winston.LeveledLogMethod> <any> sinon.spy((level: string, message: string, msg: any, callback: Winston.LogCallback): Winston.Logger => {
                        expect(level).to.equal("info");
                        expect(message).to.equal("response");
                        expect(msg.request_id).to.equal(requestId);
                        expect(msg.request_url).to.equal(fullRequestUrl);
                        expect(msg.status).to.equal(res.statusCode);
                        expect(msg.body).to.not.exist;
                        expect(msg.ts).to.exist;

                        return logger;
                    });
                    logger.loggingMiddlewarePost(req as any, res, next);

                    expect(logger.log).to.have.been.calledOnceWith('info', 'response', {
                        body: undefined,
                        mts: sinon.match.number,
                        request_id: requestId,
                        request_url: fullRequestUrl,
                        status: res.statusCode,
                        ts: sinon.match.number
                    })
                    expect(next).to.have.been.called;
                });
                it("should log the HTTP response with status code 403 as warn", () => {
                    const requestMethod = "GET";
                    const req = {...request, method: requestMethod};
                    const res: Express.Response = {statusCode: 403, sentBody: "dummy"} as any;
                    const next = sinon.spy();

                    logger.log = <Winston.LeveledLogMethod> <any> sinon.spy((level: string, message: string, msg: any, callback: Winston.LogCallback): Winston.Logger => {
                        expect(level).to.equal("warn");
                        expect(message).to.equal("response");
                        expect(msg.request_id).to.equal(requestId);
                        expect(msg.request_url).to.equal(fullRequestUrl);
                        expect(msg.status).to.equal(res.statusCode);
                        expect(msg.body).to.equal(undefined);
                        expect(msg.ts).to.exist;

                        return logger;
                    });
                    logger.loggingMiddlewarePost(req as any, res, next);

                    expect(logger.log).to.have.been.calledOnceWith('warn', 'response', {
                        body: undefined,
                        mts: sinon.match.number,
                        request_id: requestId,
                        request_url: fullRequestUrl,
                        status: res.statusCode,
                        ts: sinon.match.number
                    })
                    expect(next).to.have.been.called;
                });
                it("should log the HTTP response with status code 500 as error", () => {
                    const requestMethod = "GET";
                    const req = {...request, method: requestMethod};
                    const res: Express.Response = {statusCode: 500, sentBody: "dummy"} as any;
                    const next = sinon.spy();

                    logger.log = <Winston.LeveledLogMethod> <any> sinon.spy((level: string, message: string, meta: any, callback: Winston.LogCallback): Winston.Logger => {
                        expect(level).to.equal("error");
                        expect(message).to.equal("response");
                        expect(meta.request_id).to.equal(requestId);
                        expect(meta.request_url).to.equal(fullRequestUrl);
                        expect(meta.status).to.equal(res.statusCode);
                        expect(meta.body).to.equal(undefined);
                        expect(meta.ts).to.exist;

                        return logger;
                    });
                    logger.loggingMiddlewarePost(req as any, res, next);

                    expect(logger.log).to.have.been.calledOnceWith('error', 'response', {
                        body: undefined,
                        mts: sinon.match.number,
                        request_id: requestId,
                        request_url: fullRequestUrl,
                        status: res.statusCode,
                        ts: sinon.match.number
                    })
                    expect(next).to.have.been.called;
                });
            });

            describe("logHttpResponseError", () => {
                const logger = createLogger("info", {enabled: false});
                it("should log the HTTP response error", () => {
                    const err = new Error("valami");
                    const requestMethod = "GET";
                    const req = {...request, method: requestMethod};
                    const res: Express.Response = {statusCode: 500} as any;

                    logger.error = <Winston.LeveledLogMethod> <any> sinon.spy((message: string, meta: any, callback: Winston.LogCallback): Winston.Logger => {
                        expect(message).to.equal("error response");
                        expect(meta.msg).to.match(/^Error: valami.+/);
                        expect(meta.msg).to.match(/\[next\]/);
                        expect(meta.method).to.equal(requestMethod);
                        expect(meta.request_id).to.equal(requestId);
                        expect(meta.request_url).to.equal(fullRequestUrl);
                        expect(meta.status).to.equal(res.statusCode);
                        expect(meta.ts).to.exist;

                        return logger;
                    });
                    logger.logHttpResponseError(req as any, res, err);
                });
            });
            describe("logHttpResponseWarn", () => {
                const logger = createLogger("info", {enabled: false});
                it("should log the HTTP response warning", () => {
                    const requestMethod = "GET";
                    const req = {...request, method: requestMethod};
                    const res: Express.Response = {statusCode: 403} as any;

                    logger.warn = <Winston.LeveledLogMethod> <any> sinon.spy((message: string, meta: any, callback: Winston.LogCallback): Winston.Logger => {
                        expect(message).to.equal("client error response");
                        expect(meta.method).to.equal(requestMethod);
                        expect(meta.request_id).to.equal(requestId);
                        expect(meta.request_url).to.equal(fullRequestUrl);
                        expect(meta.status).to.equal(res.statusCode);
                        expect(meta.ts).to.exist;

                        return logger;
                    });
                    logger.logHttpResponseWarn(req as any, res, "");
                });
            });
        });
    });
});

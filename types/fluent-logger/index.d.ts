import * as Winston from "winston";
import * as Transport from "winston-transport";

declare namespace fluentLogger {
    interface WinstonTransportOptions {
    }

    class WinstonTransport extends Transport {
        constructor(tag: string, options: WinstonTransportOptions)
    }

    function configure(config: any): void;

    function createFluentSender(tag: any, options: any): any;

    const support: {
        log4jsAppender: (tag: any, options: any) => any
        winstonTransport: () => new(tag: string, options: WinstonTransportOptions) => WinstonTransport
    };

    const appender: any;

    const EventTime: any;
}

export = fluentLogger;

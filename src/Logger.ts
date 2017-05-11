import * as Express from "express"
import * as FluentLogger from "fluent-logger"
import * as Microtime from "microtime"
import * as Winston from "winston"

const FluentTransport = FluentLogger.support.winstonTransport()

export interface FluentConfig {
  enabled: boolean
  tag?: string
  config?: FluentLogger.WinstonTransportOptions
}

export class Logger extends Winston.Logger {
  public constructor (logLevel: string, fluentConfig?: FluentConfig) {
    fluentConfig = fluentConfig || {enabled: false}

    const transports: Winston.TransportInstance[] = []

    // Add console logger
    transports.push(new Winston.transports.Console({
      timestamp: true,
      colorize: false,
      level: logLevel
    }))

    // Add fluent logger
    if (fluentConfig.enabled) {
      transports.push(new FluentTransport(fluentConfig.tag, fluentConfig.config))
    }

    super({transports: transports})
  }

  public loggingMiddlewarePre (req: Express.Request, res: Express.Response & { chunks?: Buffer[], sentBody?: string }, next: Function): void {
    this.info('request', this.datingEvent({
      request_id: req.headers['x-request-id'],
      request_url: req.url,
      method: req.method,
      client_ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    }))

    // Need to override read and write methods to get chunk data from these "events"
    if (req.method === 'GET') {
      const oldWrite = res.write
      const oldEnd = res.end

      res.chunks = []

      res.write = (...args: any[]) => {
        const chunk = args[0]

        res.chunks.push(Buffer.from(chunk))

        return oldWrite.apply(res, args)
      }

      res.end = (...args: any[]) => {
        const chunk = args[0]

        if (chunk) {
          res.chunks.push(Buffer.from(chunk))
        }

        const response = oldEnd.apply(res, args)

        if (res.chunks.length > 0) {
          res.sentBody = Buffer.concat(res.chunks).toString('utf8')
        } else {
          res.sentBody = ''
        }

        return response
      }
    }

    next()
  }

  // Middleware for logging response status
  public loggingMiddlewarePost (req: Express.Request, res: Express.Response & { chunks?: Buffer[], sentBody?: string }, next: Function): void {
    const event = this.datingEvent({
      request_id: req.headers['x-request-id'],
      request_url: req.url,
      status: res.statusCode,
      body: undefined
    })

    let level
    if (res.statusCode < 400) {
      if (req.method === 'GET') {
        event.body = res.sentBody
      }
      level = 'info'
    } else if (res.statusCode >= 400 && res.statusCode < 500) {
      level = 'warn'
    } else {
      level = 'error'
    }

    this.log(level, 'response', event)

    next()
  }

  public logHttpResponseError (req: Express.Request, res: Express.Response, err: any): void {
    this.warn('error response', this.datingEvent({
      msg: err.message,
      method: req.method,
      request_url: req.url,
      request_id: req.headers['x-request-id'],
      status: res.statusCode
    }))
  }

  public logHttpResponseWarn (req: Express.Request, res: Express.Response, msg: string): void {
    this.warn('client error response', this.datingEvent({
      msg,
      method: req.method,
      request_url: req.url,
      request_id: req.headers['x-request-id'],
      status: res.statusCode
    }))
  }

  public logApplicationConfigError (err: any): void {
    this.error('configuration error, application stopped', this.datingEvent({
      msg: err ? err.message : 'unknown error'
    }))
  }

  public logApplicationStart (): void {
    this.warn('application start', this.datingEvent())
  }

  public logApplicationStop (): void {
    this.warn('application stop', this.datingEvent())
  }

  private datingEvent<T> (event?: T): T & { ts: number, mts: number } {
    const date = {
      ts: Date.now(),
      mts: Microtime.now()
    }

    // We can safely override date object because every time new date object is created
    // so no need to preserve the original object reference
    return event ? Object.assign(date, event) : date as T & { ts: number, mts: number }
  }
}

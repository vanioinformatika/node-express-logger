# Express console and fluentd logger

[![Build Status](https://travis-ci.org/vanioinformatika/node-express-logger.svg?branch=develop)](https://travis-ci.org/vanioinformatika/node-express-logger)

Logger is configured to log messages into console and [fluentd](http://www.fluentd.org/).

When constructing new logger instance need to pass **logLevel** and optional **fluentConfig**.

> The fluentd logging need to enabled via config.

## Examples

Initialize logger only with console logger:

```typescript
const logger = new Logger('info')
```

Initialize logger with console and fluent logger:

```typescript
const logger = new Logger('info', {
  enabled: true,
  tag: 'application-name',
  config: {
    host: 'localhost',
    port: 12345
  }
})
```
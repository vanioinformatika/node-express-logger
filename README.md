# Express console and fluentd logger

[![Build Status](https://travis-ci.org/vanioinformatika/node-express-logger.svg?branch=develop)](https://travis-ci.org/vanioinformatika/node-express-logger)

Logger is configured to log messages to the console and [fluentd](http://www.fluentd.org/).

When creating new logger instance need to pass **logLevel** and optional **fluentConfig**.

> Fluentd logging is enabled via config.

## Usage

```javascript
const createLogger = require('@vanioinformatika/express-logger').createLogger

const logLevel = 'info'
const fluentConfig = {
  enabled: true,
  tag: 'application tag',
  config: {
    host: 'localhost',
    port: 12345
  }
}

const logger = createLogger(logLevel, fluentConfig)

logger.info('Message')
```

## Examples

Initialize logger only with console logger:

```javascript
const logger = createLogger('info')
```

Initialize logger with console and fluent logger:

```javascript
const logger = createLogger('info', {
  enabled: true,
  tag: 'application-name',
  config: {
    host: 'localhost',
    port: 12345
  }
})
```
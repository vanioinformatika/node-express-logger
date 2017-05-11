# Express console and fluentd logger

[![Build Status](https://travis-ci.org/vanioinformatika/node-express-logger.svg?branch=develop)](https://travis-ci.org/vanioinformatika/node-express-logger)

Logger is configured to log messages into console and [fluentd](http://www.fluentd.org/).

When constructing new logger instance need to pass **logLevel** and optional **fluentConfig**.

> The fluentd logging need to enabled via config.

## Usage

```javascript
const Logger = require('@vanioinformatika/express-logger').Logger

const logLevel = 'info'
const fluentConfig = {
  enabled: true,
  tag: 'application tag',
  config: {
    host: 'localhost',
    port: 12345
  }
}

const logger = new Logger(logLevel, fluentConfig)

logger.info('Message')
```

## Examples

Initialize logger only with console logger:

```javascript
const logger = new Logger('info')
```

Initialize logger with console and fluent logger:

```javascript
const logger = new Logger('info', {
  enabled: true,
  tag: 'application-name',
  config: {
    host: 'localhost',
    port: 12345
  }
})
```
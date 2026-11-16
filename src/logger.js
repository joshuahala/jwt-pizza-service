const config = require('./config.js');

const SENSITIVE_KEYS = ['password', 'token', 'jwt', 'authorization', 'apikey', 'api_key', 'secret'];
const JWT_PATTERN = /eyJ[\w-]+\.[\w-]+\.[\w-]+/g;

class Logger {
  httpLogger = (req, res, next) => {
    const send = res.send;
    res.send = (resBody) => {
      res.send = send;
      this.log(this.statusToLogLevel(res.statusCode), 'http', {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        authorized: !!req.headers.authorization,
        user: this.userInfo(req.user),
        reqBody: req.body,
        resBody: this.parse(resBody),
      });
      return res.send(resBody);
    };
    next();
  };

  dbLogger(sql, params, user) {
    this.log('info', 'db', { sql, params, user: this.userInfo(user) });
  }

  factoryLogger(user, reqBody, resBody, ok = true) {
    this.log(ok ? 'info' : 'error', 'factory', { user: this.userInfo(user), reqBody, resBody });
  }

  unhandledErrorLogger(err, req) {
    this.log('error', 'unhandledError', {
      message: err?.message,
      status: err?.statusCode,
      stack: err?.stack,
      method: req?.method,
      path: req?.originalUrl,
      user: this.userInfo(req?.user),
    });
  }

  log(level, type, logData) {
    try {
      const labels = { component: config.logging.source, level, type };
      const values = [this.nowString(), JSON.stringify(this.sanitize(logData))];
      this.sendLogToGrafana({ streams: [{ stream: labels, values: [values] }] });
    } catch (err) {
      console.log('Failed to build log event:', err.message);
    }
  }

  statusToLogLevel(statusCode) {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'info';
  }

  nowString() {
    return (Date.now() * 1000000).toString();
  }

  userInfo(user) {
    return user ? { id: user.id, email: user.email, roles: user.roles } : undefined;
  }

  parse(body) {
    if (typeof body !== 'string') return body;
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }

  // Recursively redacts confidential keys and JWT-looking strings.
  sanitize(value) {
    if (typeof value === 'string') return value.replace(JWT_PATTERN, '*****');
    if (Array.isArray(value)) return value.map((v) => this.sanitize(v));
    if (value && typeof value === 'object') {
      const result = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = SENSITIVE_KEYS.includes(key.toLowerCase()) ? '*****' : this.sanitize(val);
      }
      return result;
    }
    return value;
  }

  sendLogToGrafana(event) {
    if (process.env.NODE_ENV === 'test') return;
    const { endpointUrl, accountId, apiKey } = config.logging;
    fetch(endpointUrl, {
      method: 'post',
      body: JSON.stringify(event),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accountId}:${apiKey}` },
    })
      .then((res) => {
        if (!res.ok) console.log('Failed to send log to Grafana');
      })
      .catch((err) => console.log('Error sending log to Grafana:', err.message));
  }
}

module.exports = new Logger();

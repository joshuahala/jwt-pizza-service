const os = require('os');
const config = require('./config.js');

const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

// Cumulative counters (reported as monotonic sums).
const requests = { GET: 0, PUT: 0, POST: 0, DELETE: 0 };
const auth = { success: 0, failure: 0 };
const pizzas = { sold: 0, failures: 0, revenue: 0 };

// Latency accumulators, reset after every report (reported as the interval average).
const serviceLatency = { sum: 0, count: 0 };
const pizzaLatency = { sum: 0, count: 0 };

// userId -> time of last authenticated request.
const activeUsers = new Map();

function requestTracker(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    if (req.method in requests) requests[req.method]++;
    serviceLatency.sum += Date.now() - start;
    serviceLatency.count++;

    if (req.user) activeUsers.set(req.user.id, Date.now());

    // PUT /api/auth is a login attempt.
    if (req.method === 'PUT' && req.originalUrl.split('?')[0] === '/api/auth') {
      if (res.statusCode < 400) auth.success++;
      else auth.failure++;
    }
  });
  next();
}

function pizzaPurchase(success, latencyMs, price, count) {
  pizzaLatency.sum += latencyMs;
  pizzaLatency.count++;
  if (success) {
    pizzas.sold += count;
    pizzas.revenue += price;
  } else {
    pizzas.failures += count;
  }
}

function cpuPercent() {
  return Math.round((os.loadavg()[0] / os.cpus().length) * 100);
}

function memoryPercent() {
  return Number((((os.totalmem() - os.freemem()) / os.totalmem()) * 100).toFixed(2));
}

function average({ sum, count }) {
  return count ? sum / count : 0;
}

function point(value, attributes) {
  return {
    asDouble: value,
    timeUnixNano: Date.now() * 1e6,
    attributes: Object.entries({ source: config.metrics.source, ...attributes }).map(([key, v]) => ({ key, value: { stringValue: v } })),
  };
}

function sum(name, dataPoints) {
  return { name, sum: { dataPoints, aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE', isMonotonic: true } };
}

function gauge(name, dataPoints) {
  return { name, gauge: { dataPoints } };
}

function collect() {
  const cutoff = Date.now() - ACTIVE_WINDOW_MS;
  for (const [id, seen] of activeUsers) if (seen < cutoff) activeUsers.delete(id);

  const metrics = [
    sum('http_requests', Object.entries(requests).map(([method, n]) => point(n, { method }))),
    sum('auth_attempts', Object.entries(auth).map(([result, n]) => point(n, { result }))),
    gauge('active_users', [point(activeUsers.size)]),
    gauge('cpu_percent', [point(cpuPercent())]),
    gauge('memory_percent', [point(memoryPercent())]),
    sum('pizzas_sold', [point(pizzas.sold)]),
    sum('pizza_failures', [point(pizzas.failures)]),
    sum('pizza_revenue', [point(pizzas.revenue)]),
    gauge('latency_ms', [point(average(serviceLatency), { endpoint: 'service' }), point(average(pizzaLatency), { endpoint: 'pizza_creation' })]),
  ];
  serviceLatency.sum = serviceLatency.count = 0;
  pizzaLatency.sum = pizzaLatency.count = 0;
  return { resourceMetrics: [{ scopeMetrics: [{ metrics }] }] };
}

async function send() {
  try {
    const res = await fetch(config.metrics.endpointUrl, {
      method: 'POST',
      body: JSON.stringify(collect()),
      headers: { Authorization: `Bearer ${config.metrics.accountId}:${config.metrics.apiKey}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) console.log('Failed to push metrics:', await res.text());
  } catch (error) {
    console.log('Error pushing metrics:', error);
  }
}

function start(periodMs) {
  setInterval(send, periodMs).unref();
}

module.exports = { requestTracker, pizzaPurchase, start };

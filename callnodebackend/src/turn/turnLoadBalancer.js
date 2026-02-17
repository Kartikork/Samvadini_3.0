/**
 * TURN Load Balancer
 * Selects the least-loaded TURN server using Prometheus metrics.
 */

import net from 'net';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';

const METRICS_PORT = 9641;
const METRICS_TIMEOUT_MS = 1500;
const METRICS_CACHE_TTL_MS = 3000;
const MAX_METRICS_BYTES = 1024 * 1024; // 1MB safety limit

const TURN_URL_UDP_PORT = 3478;
const TURN_URL_TCP_PORT = 3478;
const TURNS_URL_TLS_PORT = 5349;

const MB_DIVISOR = 1024 * 1024;

const METRIC_LOOKUP = {
  activeAllocations: {
    exact: [
      'turn_active_allocations',
      'turn_allocations',
      'turn_current_allocations',
      'turn_allocation_count',
      'coturn_active_allocations',
    ],
    patterns: [
      /^turn_.*allocations?$/i,
      /^turn_.*active_.*allocations?$/i,
      /^coturn_.*allocations?$/i,
    ],
  },
  connectionsTotal: {
    exact: [
      'turn_connections_total',
      'turn_total_connections',
      'turn_connections',
      'turn_current_connections',
      'coturn_connections_total',
    ],
    patterns: [
      /^turn_.*connections?_total$/i,
      /^turn_.*connections?$/i,
      /^coturn_.*connections?_total$/i,
    ],
  },
  trafficSentBytes: {
    exact: [
      'turn_traffic_sentb',
      'turn_traffic_sent_bytes',
      'turn_total_traffic_sentb',
      'turn_total_traffic_sent_bytes',
      'turn_sent_bytes_total',
      'turn_bytes_sent_total',
    ],
    patterns: [
      /^turn_.*traffic_.*sent.*(?:b|bytes)$/i,
      /^turn_.*sent.*bytes?.*total$/i,
    ],
  },
  trafficRecvBytes: {
    exact: [
      'turn_traffic_rcvb',
      'turn_traffic_recvb',
      'turn_traffic_received_bytes',
      'turn_total_traffic_rcvb',
      'turn_total_traffic_recvb',
      'turn_total_traffic_received_bytes',
      'turn_recv_bytes_total',
      'turn_bytes_received_total',
    ],
    patterns: [
      /^turn_.*traffic_.*(?:rcv|recv|received).*(?:b|bytes)$/i,
      /^turn_.*(?:rcv|recv|received).*(?:bytes?).*total$/i,
    ],
  },
  trafficTotalBytes: {
    exact: [
      'turn_total_traffic',
      'turn_total_traffic_bytes',
      'turn_traffic_total_bytes',
      'turn_bytes_total',
    ],
    patterns: [
      /^turn_total_traffic.*$/i,
      /^turn_.*traffic.*total.*$/i,
      /^turn_.*bytes_total$/i,
    ],
  },
  errorsTotal: {
    exact: [
      'turn_errors_total',
      'turn_total_errors',
      'turn_error_total',
      'turn_failures_total',
      'coturn_errors_total',
    ],
    patterns: [
      /^turn_.*errors?_total$/i,
      /^turn_.*fail(?:ure|ures)_total$/i,
      /^coturn_.*errors?_total$/i,
    ],
  },
};

/**
 * Minimal parser for Prometheus text exposition format.
 * Supports:
 * - metric_name{label="value"} 123
 * - metric_name 456
 * Ignores comments and invalid lines.
 */
const parsePrometheusMetrics = (text) => {
  const parsed = Object.create(null);

  if (typeof text !== 'string' || text.length === 0) {
    return parsed;
  }

  const metricLineRegex =
    /^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{[^{}]*\})?\s+([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[+-]?Inf|NaN)(?:\s+\d+)?\s*$/;

  const lines = text.split(/\r?\n/);
  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const match = line.match(metricLineRegex);
    if (!match) {
      continue;
    }

    const metricName = match[1];
    const numericValue = Number(match[2]);

    if (!Number.isFinite(numericValue)) {
      continue;
    }

    parsed[metricName] = (parsed[metricName] || 0) + numericValue;
  }

  return parsed;
};

const clampNonNegative = (value) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return value < 0 ? 0 : value;
};

const stripIPv6Brackets = (host) => {
  if (host.startsWith('[') && host.endsWith(']')) {
    return host.slice(1, -1);
  }
  return host;
};

const formatHostForUrl = (host) => {
  const normalized = stripIPv6Brackets(host);
  return net.isIP(normalized) === 6 ? `[${normalized}]` : normalized;
};

const isValidHostname = (host) => {
  if (!host || host.length > 253) {
    return false;
  }
  if (!/^[a-zA-Z0-9.-]+$/.test(host)) {
    return false;
  }

  const labels = host.split('.');
  return labels.every((label) => {
    if (label.length < 1 || label.length > 63) {
      return false;
    }
    if (label.startsWith('-') || label.endsWith('-')) {
      return false;
    }
    return true;
  });
};

const isValidHost = (host) => {
  if (!host) {
    return false;
  }
  if (/[/?#@]/.test(host) || host.includes('://')) {
    return false;
  }

  const normalized = stripIPv6Brackets(host);
  if (net.isIP(normalized) !== 0) {
    return true;
  }

  return isValidHostname(normalized);
};

const parseTurnServers = (input) => {
  if (!input || typeof input !== 'string' || input.trim().length === 0) {
    return [];
  }

  const raw = input.trim();
  let parsedServers = [];

  if (raw.startsWith('[')) {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('TURN_SERVERS contains invalid JSON');
    }

    if (!Array.isArray(parsed)) {
      throw new Error('TURN_SERVERS JSON must be an array');
    }

    parsedServers = parsed.map((item, index) => {
      if (!item || typeof item !== 'object') {
        throw new Error(`TURN_SERVERS[${index}] must be an object`);
      }

      return {
        name: String(item.name || '').trim(),
        host: stripIPv6Brackets(String(item.host || '').trim()),
      };
    });
  } else {
    parsedServers = raw
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const eqIndex = entry.indexOf('=');
        if (eqIndex <= 0 || eqIndex === entry.length - 1) {
          throw new Error(
            `Invalid TURN_SERVERS CSV entry "${entry}", expected name=host`
          );
        }

        return {
          name: entry.slice(0, eqIndex).trim(),
          host: stripIPv6Brackets(entry.slice(eqIndex + 1).trim()),
        };
      });
  }

  const dedupe = new Map();

  parsedServers.forEach((server, index) => {
    if (!/^[a-zA-Z0-9_.-]{1,64}$/.test(server.name)) {
      throw new Error(
        `TURN_SERVERS entry at index ${index} has invalid name "${server.name}"`
      );
    }

    if (!isValidHost(server.host)) {
      throw new Error(
        `TURN_SERVERS entry at index ${index} has invalid host "${server.host}"`
      );
    }

    const key = `${server.name.toLowerCase()}|${server.host.toLowerCase()}`;
    if (!dedupe.has(key)) {
      dedupe.set(key, server);
    }
  });

  return Array.from(dedupe.values());
};

/**
 * Utility function for normalizing different coturn metric names
 * to canonical metric categories.
 */
const getNormalizedMetricValue = (metricMap, canonicalName) => {
  const lookup = METRIC_LOOKUP[canonicalName];
  if (!lookup) {
    return { found: false, value: 0 };
  }

  for (const metricName of lookup.exact) {
    if (
      Object.prototype.hasOwnProperty.call(metricMap, metricName) &&
      Number.isFinite(metricMap[metricName])
    ) {
      return {
        found: true,
        value: metricMap[metricName],
        sourceMetric: metricName,
      };
    }
  }

  let total = 0;
  let found = false;

  for (const [metricName, metricValue] of Object.entries(metricMap)) {
    if (!Number.isFinite(metricValue)) {
      continue;
    }

    for (const pattern of lookup.patterns) {
      if (pattern.test(metricName)) {
        total += metricValue;
        found = true;
        break;
      }
    }
  }

  return {
    found,
    value: total,
    sourceMetric: found ? 'pattern_match' : null,
  };
};

class TURNLoadBalancer {
  constructor() {
    this.servers = [];
    this.cache = new Map(); // host -> { value, expiresAt, promise }
    this.trafficHistory = new Map(); // host -> { bytes, at }
    this.turnServersParseError = null;

    this.initializeServers();
  }

  initializeServers() {
    try {
      this.servers = parseTurnServers(config.turn.turnServers);
      this.turnServersParseError = null;

      logger.info('[TURN-LB] TURN servers loaded', {
        count: this.servers.length,
        servers: this.servers.map((server) => server.name),
      });
    } catch (error) {
      this.servers = [];
      this.turnServersParseError = error.message;
      logger.error('[TURN-LB] Failed to parse TURN_SERVERS:', error);
    }
  }

  async getBestServer() {
    if (this.turnServersParseError) {
      logger.warn('[TURN-LB] TURN_SERVERS parse error', {
        error: this.turnServersParseError,
      });
      return null;
    }

    if (this.servers.length === 0) {
      logger.warn('[TURN-LB] No TURN servers configured');
      return null;
    }

    const evaluations = await Promise.all(
      this.servers.map((server) => this.evaluateServerCached(server))
    );

    const healthyServers = evaluations.filter((server) => server.healthy);

    if (healthyServers.length === 0) {
      logger.warn('[TURN-LB] No healthy TURN servers found');
      return null;
    }

    healthyServers.sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }
      return a.name.localeCompare(b.name);
    });

    const best = healthyServers[0];
    const hostForUrl = formatHostForUrl(best.host);

    return {
      name: best.name,
      host: best.host,
      turnUrlUdp: `turn:${hostForUrl}:${TURN_URL_UDP_PORT}?transport=udp`,
      turnUrlTcp: `turn:${hostForUrl}:${TURN_URL_TCP_PORT}?transport=tcp`,
      turnsUrlTls: `turns:${hostForUrl}:${TURNS_URL_TLS_PORT}`,
      metrics: best.metrics,
      score: Number(best.score.toFixed(2)),
    };
  }

  async evaluateServerCached(server) {
    const now = Date.now();
    const cacheEntry = this.cache.get(server.host);

    if (cacheEntry?.value && cacheEntry.expiresAt > now) {
      return cacheEntry.value;
    }

    if (cacheEntry?.promise) {
      return cacheEntry.promise;
    }

    const requestPromise = this.evaluateServer(server)
      .then((value) => {
        this.cache.set(server.host, {
          value,
          expiresAt: Date.now() + METRICS_CACHE_TTL_MS,
          promise: null,
        });
        return value;
      })
      .catch((error) => {
        logger.error('[TURN-LB] Evaluation failure', {
          server: server.name,
          host: server.host,
          error: error.message,
        });

        const unhealthy = this.buildUnhealthyResult(
          server,
          `evaluation_failed:${error.message}`
        );

        this.cache.set(server.host, {
          value: unhealthy,
          expiresAt: Date.now() + METRICS_CACHE_TTL_MS,
          promise: null,
        });

        return unhealthy;
      });

    this.cache.set(server.host, {
      value: cacheEntry?.value || null,
      expiresAt: cacheEntry?.expiresAt || 0,
      promise: requestPromise,
    });

    return requestPromise;
  }

  async evaluateServer(server) {
    let metricsText;
    try {
      metricsText = await this.fetchMetrics(server.host);
    } catch (error) {
      return this.buildUnhealthyResult(
        server,
        `metrics_fetch_failed:${error.message}`
      );
    }

    const parsedMetrics = parsePrometheusMetrics(metricsText);

    if (Object.keys(parsedMetrics).length === 0) {
      return this.buildUnhealthyResult(server, 'no_parseable_metrics');
    }

    const extracted = this.extractMetrics(server.host, parsedMetrics);
    if (!extracted.meaningful) {
      return this.buildUnhealthyResult(server, 'no_meaningful_metrics');
    }

    const score = this.calculateScore(extracted.metrics);

    return {
      healthy: true,
      name: server.name,
      host: server.host,
      metrics: extracted.metrics,
      score,
    };
  }

  async fetchMetrics(host) {
    const hostForUrl = formatHostForUrl(host);
    const url = `http://${hostForUrl}:${METRICS_PORT}/metrics`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), METRICS_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'text/plain',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`http_${response.status}`);
      }

      const text = await response.text();
      if (!text || text.trim().length === 0) {
        throw new Error('empty_metrics');
      }

      if (Buffer.byteLength(text, 'utf8') > MAX_METRICS_BYTES) {
        throw new Error('metrics_payload_too_large');
      }

      return text;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('timeout');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  extractMetrics(host, metricMap) {
    const activeAllocationsRaw = getNormalizedMetricValue(
      metricMap,
      'activeAllocations'
    );
    const connectionsTotalRaw = getNormalizedMetricValue(
      metricMap,
      'connectionsTotal'
    );
    const trafficSentRaw = getNormalizedMetricValue(metricMap, 'trafficSentBytes');
    const trafficRecvRaw = getNormalizedMetricValue(metricMap, 'trafficRecvBytes');
    const trafficTotalRaw = getNormalizedMetricValue(metricMap, 'trafficTotalBytes');
    const errorsTotalRaw = getNormalizedMetricValue(metricMap, 'errorsTotal');

    const activeAllocations = activeAllocationsRaw.found
      ? clampNonNegative(activeAllocationsRaw.value)
      : 0;
    const connectionsTotal = connectionsTotalRaw.found
      ? clampNonNegative(connectionsTotalRaw.value)
      : 0;
    const errorsTotal = errorsTotalRaw.found
      ? clampNonNegative(errorsTotalRaw.value)
      : 0;

    const hasTraffic =
      trafficSentRaw.found || trafficRecvRaw.found || trafficTotalRaw.found;

    let trafficBytesCurrent = 0;
    if (trafficSentRaw.found || trafficRecvRaw.found) {
      trafficBytesCurrent =
        clampNonNegative(trafficSentRaw.value || 0) +
        clampNonNegative(trafficRecvRaw.value || 0);
    } else if (trafficTotalRaw.found) {
      trafficBytesCurrent = clampNonNegative(trafficTotalRaw.value);
    }

    let trafficBytesLastWindow = 0;
    let trafficSource = 'none';

    if (hasTraffic) {
      trafficSource = 'absolute_fallback';
      trafficBytesLastWindow = trafficBytesCurrent;

      const previous = this.trafficHistory.get(host);
      if (
        previous &&
        Number.isFinite(previous.bytes) &&
        trafficBytesCurrent >= previous.bytes
      ) {
        trafficBytesLastWindow = trafficBytesCurrent - previous.bytes;
        trafficSource = 'delta';
      }

      this.trafficHistory.set(host, {
        bytes: trafficBytesCurrent,
        at: Date.now(),
      });
    }

    const trafficBytesLastWindowMb = trafficBytesLastWindow / MB_DIVISOR;

    const meaningful =
      activeAllocationsRaw.found ||
      connectionsTotalRaw.found ||
      hasTraffic ||
      errorsTotalRaw.found;

    return {
      meaningful,
      metrics: {
        activeAllocations,
        connectionsTotal,
        trafficBytesCurrent,
        trafficBytesLastWindow,
        trafficBytesLastWindowMb: Number(trafficBytesLastWindowMb.toFixed(6)),
        trafficSource,
        errorsTotal,
      },
    };
  }

  calculateScore(metrics) {
    return (
      metrics.activeAllocations * 5 +
      metrics.connectionsTotal * 1 +
      metrics.trafficBytesLastWindowMb * 2 +
      metrics.errorsTotal * 10
    );
  }

  buildUnhealthyResult(server, reason) {
    return {
      healthy: false,
      name: server.name,
      host: server.host,
      reason,
    };
  }
}

export const turnLoadBalancer = new TURNLoadBalancer();


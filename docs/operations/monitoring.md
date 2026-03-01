# Monitoring & Observability Guide

This guide covers comprehensive monitoring, logging, and observability for Content Command in production environments.

## Table of Contents

1. [Overview](#overview)
2. [Application Monitoring](#application-monitoring)
3. [Infrastructure Monitoring](#infrastructure-monitoring)
4. [Error Tracking](#error-tracking)
5. [Performance Monitoring](#performance-monitoring)
6. [Logging Strategy](#logging-strategy)
7. [Alerting & Notifications](#alerting--notifications)
8. [Dashboards](#dashboards)
9. [Health Checks](#health-checks)
10. [Troubleshooting](#troubleshooting)

## Overview

### Monitoring Stack

Content Command uses a multi-layered monitoring approach:

- **Application Performance**: Sentry, Vercel Analytics
- **Infrastructure**: Prometheus, Grafana, Uptime monitoring
- **Database**: Supabase metrics, query performance
- **External APIs**: Integration health monitoring
- **Logs**: Structured logging with correlation IDs
- **Real-time**: WebSocket monitoring, user sessions

### Key Metrics

| Category | Metrics | Target |
|----------|---------|--------|
| **Performance** | Response time, throughput | <500ms avg |
| **Availability** | Uptime, error rate | >99.9% uptime, <1% errors |
| **User Experience** | Page load time, interactivity | <2s LCP, <100ms FID |
| **Business** | Content generation rate, user engagement | Custom KPIs |

## Application Monitoring

### 1. Sentry Integration

```bash
# Install Sentry
npm install @sentry/nextjs
```

```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  
  integrations: [
    new Sentry.BrowserTracing({
      tracingOrigins: ['localhost', process.env.NEXT_PUBLIC_APP_URL],
    }),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  beforeSend(event) {
    // Filter out development errors
    if (process.env.NODE_ENV === 'development') {
      return null
    }
    
    // Don't send errors for 404s
    if (event.exception?.values?.[0]?.type === 'ChunkLoadError') {
      return null
    }
    
    return event
  },
})
```

```javascript
// sentry.server.config.js
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],
  
  beforeSend(event) {
    // Filter sensitive data
    if (event.request?.headers) {
      delete event.request.headers.authorization
      delete event.request.headers.cookie
    }
    
    return event
  },
})
```

### 2. Custom Error Tracking

```typescript
// lib/monitoring/error-tracker.ts
import * as Sentry from '@sentry/nextjs'
import { logger } from '@/lib/logging/logger'

export class ErrorTracker {
  static captureException(error: Error, context?: Record<string, any>) {
    logger.error('Exception captured', { error: error.message, stack: error.stack, ...context })
    
    Sentry.withScope((scope) => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setTag(key, value)
        })
      }
      
      scope.setLevel('error')
      Sentry.captureException(error)
    })
  }
  
  static captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
    logger[level](message, context)
    
    Sentry.withScope((scope) => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setTag(key, value)
        })
      }
      
      scope.setLevel(level)
      Sentry.captureMessage(message)
    })
  }
  
  static setUser(user: { id: string; email?: string; username?: string }) {
    Sentry.setUser(user)
  }
  
  static addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: 'info',
      timestamp: Date.now() / 1000,
    })
  }
}

// Usage in API routes
export async function POST(request: Request) {
  try {
    ErrorTracker.addBreadcrumb('API call started', 'api', { endpoint: '/api/content/generate' })
    
    const result = await generateContent(data)
    
    ErrorTracker.addBreadcrumb('Content generated successfully', 'business', { 
      contentId: result.id,
      wordCount: result.wordCount 
    })
    
    return NextResponse.json(result)
  } catch (error) {
    ErrorTracker.captureException(error as Error, {
      endpoint: '/api/content/generate',
      userId: user?.id,
      clientId: data.clientId,
    })
    
    return NextResponse.json({ error: 'Content generation failed' }, { status: 500 })
  }
}
```

### 3. Performance Tracking

```typescript
// lib/monitoring/performance.ts
import { performance } from 'perf_hooks'
import * as Sentry from '@sentry/nextjs'

export class PerformanceTracker {
  private static measurements = new Map<string, number>()
  
  static startMeasurement(name: string): void {
    this.measurements.set(name, performance.now())
  }
  
  static endMeasurement(name: string, metadata?: Record<string, any>): number {
    const startTime = this.measurements.get(name)
    if (!startTime) {
      console.warn(`No start time found for measurement: ${name}`)
      return 0
    }
    
    const duration = performance.now() - startTime
    this.measurements.delete(name)
    
    // Log slow operations
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`, metadata)
    }
    
    // Send to Sentry
    Sentry.addBreadcrumb({
      message: `Performance: ${name}`,
      category: 'performance',
      data: { duration: duration.toFixed(2), ...metadata },
      level: duration > 5000 ? 'warning' : 'info',
    })
    
    return duration
  }
  
  static async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.startMeasurement(name)
    try {
      const result = await fn()
      this.endMeasurement(name, metadata)
      return result
    } catch (error) {
      this.endMeasurement(name, { ...metadata, error: true })
      throw error
    }
  }
  
  static trackDatabaseQuery(query: string, duration: number, rowCount?: number) {
    const data = { query: query.substring(0, 100), duration, rowCount }
    
    if (duration > 1000) {
      console.warn('Slow database query detected', data)
    }
    
    Sentry.addBreadcrumb({
      message: 'Database query',
      category: 'database',
      data,
      level: duration > 2000 ? 'warning' : 'info',
    })
  }
  
  static trackApiCall(endpoint: string, method: string, duration: number, status: number) {
    const data = { endpoint, method, duration, status }
    
    Sentry.addBreadcrumb({
      message: 'API call',
      category: 'http',
      data,
      level: status >= 400 ? 'error' : 'info',
    })
  }
}

// Usage example
export async function generateContent(briefId: string) {
  return await PerformanceTracker.measureAsync(
    'content-generation',
    async () => {
      const brief = await getBrief(briefId)
      const content = await callOpenAI(brief)
      const saved = await saveContent(content)
      return saved
    },
    { briefId, model: 'gpt-4' }
  )
}
```

## Infrastructure Monitoring

### 1. Prometheus Configuration

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'content-command'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 30s
    scrape_timeout: 10s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:9113']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
```

### 2. Custom Metrics Endpoint

```typescript
// app/api/metrics/route.ts
import { NextResponse } from 'next/server'
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client'

// Collect default Node.js metrics
collectDefaultMetrics()

// Custom metrics
const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
})

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
})

const contentGenerationTotal = new Counter({
  name: 'content_generation_total',
  help: 'Total number of content generations',
  labelNames: ['model', 'status'],
})

const activeUsers = new Gauge({
  name: 'active_users_total',
  help: 'Number of active users',
})

const databaseConnectionsActive = new Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections',
})

export async function GET() {
  try {
    const metrics = await register.metrics()
    
    return new NextResponse(metrics, {
      headers: {
        'Content-Type': register.contentType,
      },
    })
  } catch (error) {
    console.error('Error generating metrics:', error)
    return new NextResponse('Error generating metrics', { status: 500 })
  }
}

// Export metrics for use in other parts of the application
export { 
  httpRequestsTotal, 
  httpRequestDuration, 
  contentGenerationTotal, 
  activeUsers,
  databaseConnectionsActive 
}
```

### 3. Metrics Middleware

```typescript
// lib/monitoring/metrics-middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { httpRequestsTotal, httpRequestDuration } from '@/app/api/metrics/route'

export function metricsMiddleware(request: NextRequest) {
  const start = Date.now()
  const method = request.method
  const pathname = request.nextUrl.pathname
  
  // Normalize route for metrics (remove dynamic segments)
  const route = pathname
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '/:id')
    .replace(/\/\d+/g, '/:id')
  
  const response = NextResponse.next()
  
  // Record metrics after response
  response.headers.set('x-response-time', Date.now().toString())
  
  // This would ideally be done in an async manner or after the response
  setTimeout(() => {
    const duration = (Date.now() - start) / 1000
    const status = response.status.toString()
    
    httpRequestsTotal.inc({ method, route, status_code: status })
    httpRequestDuration.observe({ method, route }, duration)
  }, 0)
  
  return response
}
```

### 4. Alert Rules

```yaml
# monitoring/alert_rules.yml
groups:
  - name: content-command-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} requests per second"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"

      - alert: DatabaseConnectionsHigh
        expr: database_connections_active > 80
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "High number of database connections"
          description: "{{ $value }} active database connections"

      - alert: ContentGenerationFailures
        expr: rate(content_generation_total{status="error"}[5m]) > 0.1
        for: 3m
        labels:
          severity: critical
        annotations:
          summary: "High content generation failure rate"
          description: "Content generation failing at {{ $value }} per second"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "{{ $labels.instance }} has been down for more than 1 minute"
```

## Error Tracking

### 1. Structured Error Handling

```typescript
// lib/errors/error-types.ts
export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly context: Record<string, any>

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context: Record<string, any> = {}
  ) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.context = context
    this.name = this.constructor.name

    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, 400, true, context)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, 404, true, { resource, id })
  }
}

export class RateLimitError extends AppError {
  constructor(limit: number, window: string) {
    super(`Rate limit exceeded: ${limit} requests per ${window}`, 429, true, { limit, window })
  }
}

export class ExternalAPIError extends AppError {
  constructor(service: string, message: string, context: Record<string, any> = {}) {
    super(`External API error from ${service}: ${message}`, 502, true, { service, ...context })
  }
}
```

### 2. Global Error Handler

```typescript
// lib/errors/error-handler.ts
import { NextRequest, NextResponse } from 'next/server'
import { AppError } from './error-types'
import { ErrorTracker } from '@/lib/monitoring/error-tracker'
import { logger } from '@/lib/logging/logger'

export function handleError(error: unknown, request?: NextRequest): NextResponse {
  // Determine if it's an operational error
  const isOperational = error instanceof AppError ? error.isOperational : false
  
  // Log the error
  if (error instanceof AppError) {
    logger.error('Application error', {
      message: error.message,
      statusCode: error.statusCode,
      context: error.context,
      stack: error.stack,
      url: request?.url,
      method: request?.method,
    })
  } else if (error instanceof Error) {
    logger.error('Unexpected error', {
      message: error.message,
      stack: error.stack,
      url: request?.url,
      method: request?.method,
    })
  } else {
    logger.error('Unknown error', {
      error: String(error),
      url: request?.url,
      method: request?.method,
    })
  }

  // Track in Sentry if it's not operational
  if (!isOperational) {
    ErrorTracker.captureException(
      error instanceof Error ? error : new Error(String(error)),
      {
        url: request?.url,
        method: request?.method,
        userAgent: request?.headers.get('user-agent'),
      }
    )
  }

  // Return appropriate response
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.constructor.name,
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && { context: error.context }),
      },
      { status: error.statusCode }
    )
  }

  // Don't leak internal errors in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error instanceof Error ? error.message : String(error)

  return NextResponse.json(
    { error: 'InternalServerError', message },
    { status: 500 }
  )
}

// Wrapper for API routes
export function withErrorHandling(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context)
    } catch (error) {
      return handleError(error, request)
    }
  }
}
```

## Performance Monitoring

### 1. Web Vitals Tracking

```typescript
// lib/monitoring/web-vitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'
import * as Sentry from '@sentry/nextjs'

export function trackWebVitals() {
  function sendToAnalytics(metric: any) {
    // Send to multiple analytics services
    
    // Sentry
    Sentry.addBreadcrumb({
      message: `Web Vital: ${metric.name}`,
      category: 'performance',
      data: {
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
      },
      level: metric.rating === 'poor' ? 'warning' : 'info',
    })

    // Custom analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', metric.name, {
        event_category: 'Web Vitals',
        event_label: metric.id,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        non_interaction: true,
      })
    }

    // Log for debugging
    console.log('Web Vital:', metric.name, metric.value, metric.rating)
  }

  getCLS(sendToAnalytics)
  getFID(sendToAnalytics)
  getFCP(sendToAnalytics)
  getLCP(sendToAnalytics)
  getTTFB(sendToAnalytics)
}

// Usage in app
// app/layout.tsx
'use client'
import { useEffect } from 'react'
import { trackWebVitals } from '@/lib/monitoring/web-vitals'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    trackWebVitals()
  }, [])

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

### 2. Real User Monitoring (RUM)

```typescript
// lib/monitoring/rum.ts
export class RealUserMonitoring {
  private static sessionId = this.generateSessionId()
  private static pageLoadTime = Date.now()
  
  private static generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15)
  }
  
  static trackPageView(path: string) {
    const loadTime = Date.now() - this.pageLoadTime
    
    this.sendEvent('page_view', {
      path,
      loadTime,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      connection: this.getConnectionInfo(),
    })
  }
  
  static trackUserAction(action: string, target: string, metadata?: Record<string, any>) {
    this.sendEvent('user_action', {
      action,
      target,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      ...metadata,
    })
  }
  
  static trackError(error: Error, context?: Record<string, any>) {
    this.sendEvent('client_error', {
      message: error.message,
      stack: error.stack,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      url: window.location.href,
      ...context,
    })
  }
  
  private static getConnectionInfo() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
      }
    }
    return null
  }
  
  private static async sendEvent(type: string, data: Record<string, any>) {
    try {
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data }),
      })
    } catch (error) {
      console.warn('Failed to send analytics event:', error)
    }
  }
}

// Usage in components
export function useRUM() {
  useEffect(() => {
    RealUserMonitoring.trackPageView(window.location.pathname)
    
    const handleError = (event: ErrorEvent) => {
      RealUserMonitoring.trackError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      })
    }
    
    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])
  
  return {
    trackAction: RealUserMonitoring.trackUserAction,
    trackError: RealUserMonitoring.trackError,
  }
}
```

## Logging Strategy

### 1. Structured Logging

```typescript
// lib/logging/logger.ts
import winston from 'winston'
import { v4 as uuidv4 } from 'uuid'

// Custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      correlationId: meta.correlationId || 'unknown',
      service: 'content-command',
      environment: process.env.NODE_ENV,
      ...meta,
    })
  })
)

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: structuredFormat,
  defaultMeta: { 
    service: 'content-command',
    version: process.env.npm_package_version || '1.0.0',
  },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
    }),
  ],
})

// Add console transport for non-production
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }))
}

// Correlation ID context
export class LogContext {
  private static contexts = new Map<string, string>()
  
  static setCorrelationId(id: string = uuidv4()): string {
    this.contexts.set('correlationId', id)
    return id
  }
  
  static getCorrelationId(): string {
    return this.contexts.get('correlationId') || 'unknown'
  }
  
  static withContext<T>(correlationId: string, fn: () => T): T {
    const oldId = this.contexts.get('correlationId')
    this.contexts.set('correlationId', correlationId)
    
    try {
      return fn()
    } finally {
      if (oldId) {
        this.contexts.set('correlationId', oldId)
      } else {
        this.contexts.delete('correlationId')
      }
    }
  }
}

// Enhanced logger with context
export const contextLogger = {
  debug: (message: string, meta?: Record<string, any>) => {
    logger.debug(message, { ...meta, correlationId: LogContext.getCorrelationId() })
  },
  info: (message: string, meta?: Record<string, any>) => {
    logger.info(message, { ...meta, correlationId: LogContext.getCorrelationId() })
  },
  warn: (message: string, meta?: Record<string, any>) => {
    logger.warn(message, { ...meta, correlationId: LogContext.getCorrelationId() })
  },
  error: (message: string, meta?: Record<string, any>) => {
    logger.error(message, { ...meta, correlationId: LogContext.getCorrelationId() })
  },
}
```

### 2. Request Logging Middleware

```typescript
// lib/logging/request-logger.ts
import { NextRequest, NextResponse } from 'next/server'
import { contextLogger, LogContext } from './logger'

export function requestLoggingMiddleware(request: NextRequest) {
  const correlationId = LogContext.setCorrelationId()
  const startTime = Date.now()
  
  // Log incoming request
  contextLogger.info('Incoming request', {
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    ip: request.ip || request.headers.get('x-forwarded-for'),
    correlationId,
  })
  
  const response = NextResponse.next()
  
  // Add correlation ID to response headers
  response.headers.set('x-correlation-id', correlationId)
  
  // Log response (this is approximate since we can't easily intercept the actual response)
  setTimeout(() => {
    const duration = Date.now() - startTime
    contextLogger.info('Request completed', {
      method: request.method,
      url: request.url,
      duration,
      correlationId,
    })
  }, 0)
  
  return response
}
```

### 3. Database Query Logging

```typescript
// lib/logging/database-logger.ts
import { contextLogger } from './logger'
import { PerformanceTracker } from '@/lib/monitoring/performance'

export function logDatabaseQuery(
  query: string,
  params?: any[],
  duration?: number,
  rowCount?: number,
  error?: Error
) {
  const logData = {
    query: query.substring(0, 200), // Truncate long queries
    paramCount: params?.length || 0,
    duration,
    rowCount,
    error: error?.message,
  }
  
  if (error) {
    contextLogger.error('Database query failed', logData)
  } else if (duration && duration > 1000) {
    contextLogger.warn('Slow database query', logData)
  } else {
    contextLogger.debug('Database query executed', logData)
  }
  
  // Track performance metrics
  if (duration) {
    PerformanceTracker.trackDatabaseQuery(query, duration, rowCount)
  }
}

// Wrapper for Supabase queries
export function withQueryLogging<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  return PerformanceTracker.measureAsync(
    `db-${queryName}`,
    async () => {
      const startTime = Date.now()
      
      try {
        const result = await queryFn()
        const duration = Date.now() - startTime
        
        logDatabaseQuery(queryName, [], duration)
        
        return result
      } catch (error) {
        const duration = Date.now() - startTime
        logDatabaseQuery(queryName, [], duration, undefined, error as Error)
        throw error
      }
    }
  )
}
```

## Health Checks

### 1. Comprehensive Health Check

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { Redis } from '@upstash/redis'
import { contextLogger } from '@/lib/logging/logger'

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  environment: string
  checks: {
    database: HealthCheckResult
    redis: HealthCheckResult
    external_apis: HealthCheckResult
    disk_space: HealthCheckResult
    memory: HealthCheckResult
  }
  uptime: number
}

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime?: number
  error?: string
  metadata?: Record<string, any>
}

const startTime = Date.now()

export async function GET(): Promise<NextResponse<HealthCheck>> {
  const healthCheck: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: Date.now() - startTime,
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      external_apis: await checkExternalAPIs(),
      disk_space: await checkDiskSpace(),
      memory: checkMemory(),
    },
  }
  
  // Determine overall health status
  const checkStatuses = Object.values(healthCheck.checks).map(check => check.status)
  
  if (checkStatuses.some(status => status === 'unhealthy')) {
    healthCheck.status = 'unhealthy'
  } else if (checkStatuses.some(status => status === 'degraded')) {
    healthCheck.status = 'degraded'
  }
  
  // Log health check results
  contextLogger.info('Health check completed', {
    status: healthCheck.status,
    checks: Object.entries(healthCheck.checks).reduce((acc, [key, value]) => {
      acc[key] = value.status
      return acc
    }, {} as Record<string, string>),
  })
  
  const statusCode = healthCheck.status === 'healthy' ? 200 : 503
  
  return NextResponse.json(healthCheck, { status: statusCode })
}

async function checkDatabase(): Promise<HealthCheckResult> {
  try {
    const startTime = Date.now()
    const supabase = createServerClient()
    
    const { error } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
    
    const responseTime = Date.now() - startTime
    
    if (error) {
      return {
        status: 'unhealthy',
        responseTime,
        error: error.message,
      }
    }
    
    return {
      status: responseTime > 1000 ? 'degraded' : 'healthy',
      responseTime,
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function checkRedis(): Promise<HealthCheckResult> {
  try {
    const startTime = Date.now()
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    
    await redis.ping()
    const responseTime = Date.now() - startTime
    
    return {
      status: responseTime > 500 ? 'degraded' : 'healthy',
      responseTime,
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function checkExternalAPIs(): Promise<HealthCheckResult> {
  const apis = [
    { name: 'OpenAI', url: 'https://api.openai.com/v1/models' },
    { name: 'Anthropic', url: 'https://api.anthropic.com/v1/messages' },
  ]
  
  const results = await Promise.allSettled(
    apis.map(async (api) => {
      const startTime = Date.now()
      const response = await fetch(api.url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      })
      
      return {
        name: api.name,
        status: response.ok,
        responseTime: Date.now() - startTime,
      }
    })
  )
  
  const healthyCount = results.filter(
    result => result.status === 'fulfilled' && result.value.status
  ).length
  
  const totalCount = results.length
  const healthyRatio = healthyCount / totalCount
  
  let status: 'healthy' | 'degraded' | 'unhealthy'
  if (healthyRatio >= 1) status = 'healthy'
  else if (healthyRatio >= 0.5) status = 'degraded'
  else status = 'unhealthy'
  
  return {
    status,
    metadata: {
      healthy: healthyCount,
      total: totalCount,
      ratio: healthyRatio,
    },
  }
}

async function checkDiskSpace(): Promise<HealthCheckResult> {
  try {
    const fs = await import('fs/promises')
    const stats = await fs.statfs('.')
    
    const total = stats.bavail * stats.bsize
    const free = stats.bavail * stats.bsize
    const used = total - free
    const usagePercent = (used / total) * 100
    
    let status: 'healthy' | 'degraded' | 'unhealthy'
    if (usagePercent < 80) status = 'healthy'
    else if (usagePercent < 90) status = 'degraded'
    else status = 'unhealthy'
    
    return {
      status,
      metadata: {
        total: Math.round(total / 1024 / 1024 / 1024), // GB
        free: Math.round(free / 1024 / 1024 / 1024), // GB
        usagePercent: Math.round(usagePercent),
      },
    }
  } catch (error) {
    return {
      status: 'degraded',
      error: 'Unable to check disk space',
    }
  }
}

function checkMemory(): HealthCheckResult {
  const usage = process.memoryUsage()
  const totalHeap = usage.heapTotal
  const usedHeap = usage.heapUsed
  const usagePercent = (usedHeap / totalHeap) * 100
  
  let status: 'healthy' | 'degraded' | 'unhealthy'
  if (usagePercent < 80) status = 'healthy'
  else if (usagePercent < 90) status = 'degraded'
  else status = 'unhealthy'
  
  return {
    status,
    metadata: {
      heapUsed: Math.round(usedHeap / 1024 / 1024), // MB
      heapTotal: Math.round(totalHeap / 1024 / 1024), // MB
      usagePercent: Math.round(usagePercent),
      rss: Math.round(usage.rss / 1024 / 1024), // MB
    },
  }
}
```

### 2. Readiness and Liveness Probes

```typescript
// app/api/health/live/route.ts
import { NextResponse } from 'next/server'

// Liveness probe - basic service availability
export async function GET() {
  return NextResponse.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
}
```

```typescript
// app/api/health/ready/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// Readiness probe - service ready to handle requests
export async function GET() {
  try {
    // Quick database connectivity check
    const supabase = createServerClient()
    const { error } = await supabase.from('organizations').select('id').limit(1)
    
    if (error) {
      return NextResponse.json(
        { status: 'not ready', error: error.message },
        { status: 503 }
      )
    }
    
    return NextResponse.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'not ready', 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 503 }
    )
  }
}
```

## Alerting & Notifications

### 1. Alertmanager Configuration

```yaml
# monitoring/alertmanager.yml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@yourdomain.com'
  smtp_auth_username: 'alerts@yourdomain.com'
  smtp_auth_password: 'your-app-password'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'
  routes:
  - match:
      severity: critical
    receiver: 'critical-alerts'
  - match:
      severity: warning
    receiver: 'warning-alerts'

receivers:
- name: 'web.hook'
  webhook_configs:
  - url: 'https://yourdomain.com/api/webhooks/alerts'

- name: 'critical-alerts'
  email_configs:
  - to: 'team@yourdomain.com'
    subject: 'CRITICAL: {{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
    body: |
      {{ range .Alerts }}
      Alert: {{ .Annotations.summary }}
      Description: {{ .Annotations.description }}
      Severity: {{ .Labels.severity }}
      Instance: {{ .Labels.instance }}
      {{ end }}
  slack_configs:
  - api_url: 'YOUR_SLACK_WEBHOOK_URL'
    channel: '#alerts'
    title: 'Critical Alert'
    text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'

- name: 'warning-alerts'
  email_configs:
  - to: 'team@yourdomain.com'
    subject: 'WARNING: {{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

### 2. Custom Alert Webhook

```typescript
// app/api/webhooks/alerts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { contextLogger } from '@/lib/logging/logger'

interface AlertWebhook {
  version: string
  groupKey: string
  status: 'firing' | 'resolved'
  receiver: string
  groupLabels: Record<string, string>
  commonLabels: Record<string, string>
  commonAnnotations: Record<string, string>
  externalURL: string
  alerts: Array<{
    status: 'firing' | 'resolved'
    labels: Record<string, string>
    annotations: Record<string, string>
    startsAt: string
    endsAt?: string
    generatorURL: string
    fingerprint: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    const webhook: AlertWebhook = await request.json()
    
    contextLogger.info('Alert webhook received', {
      status: webhook.status,
      alertCount: webhook.alerts.length,
      receiver: webhook.receiver,
    })
    
    // Process each alert
    for (const alert of webhook.alerts) {
      await processAlert(alert, webhook.status)
    }
    
    return NextResponse.json({ status: 'processed' })
  } catch (error) {
    contextLogger.error('Failed to process alert webhook', { error })
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
  }
}

async function processAlert(
  alert: AlertWebhook['alerts'][0], 
  status: 'firing' | 'resolved'
) {
  const severity = alert.labels.severity || 'unknown'
  const alertname = alert.labels.alertname || 'Unknown Alert'
  
  // Log alert
  contextLogger.warn('Alert processed', {
    alertname,
    severity,
    status,
    instance: alert.labels.instance,
    summary: alert.annotations.summary,
    description: alert.annotations.description,
  })
  
  // Send to external services based on severity
  if (severity === 'critical') {
    await sendSlackNotification(alert, status)
    await sendPagerDutyAlert(alert, status)
  }
  
  // Store alert in database for historical tracking
  await storeAlert(alert, status)
}

async function sendSlackNotification(
  alert: AlertWebhook['alerts'][0], 
  status: 'firing' | 'resolved'
) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return
  
  const color = status === 'firing' ? 'danger' : 'good'
  const emoji = status === 'firing' ? '🚨' : '✅'
  
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${emoji} Alert ${status.toUpperCase()}`,
        attachments: [{
          color,
          fields: [
            { title: 'Alert', value: alert.labels.alertname, short: true },
            { title: 'Severity', value: alert.labels.severity, short: true },
            { title: 'Instance', value: alert.labels.instance, short: true },
            { title: 'Summary', value: alert.annotations.summary, short: false },
            { title: 'Description', value: alert.annotations.description, short: false },
          ],
          ts: Math.floor(new Date(alert.startsAt).getTime() / 1000),
        }],
      }),
    })
  } catch (error) {
    contextLogger.error('Failed to send Slack notification', { error })
  }
}

async function storeAlert(
  alert: AlertWebhook['alerts'][0], 
  status: 'firing' | 'resolved'
) {
  // Store alert in database for historical analysis
  // This could be useful for alert fatigue analysis, SLA tracking, etc.
}
```

## Dashboards

### 1. Grafana Dashboard Configuration

```json
{
  "dashboard": {
    "id": null,
    "title": "Content Command - Application Metrics",
    "tags": ["content-command", "production"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ],
        "yAxes": [
          {
            "label": "Requests/sec",
            "min": 0
          }
        ],
        "alert": {
          "conditions": [
            {
              "query": {
                "queryType": "",
                "refId": "A"
              },
              "reducer": {
                "type": "last",
                "params": []
              },
              "evaluator": {
                "params": [100],
                "type": "gt"
              }
            }
          ],
          "executionErrorState": "alerting",
          "noDataState": "no_data",
          "frequency": "10s",
          "handler": 1,
          "name": "High Request Rate",
          "message": "Request rate is unusually high"
        }
      },
      {
        "id": 2,
        "title": "Response Time (95th percentile)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ],
        "yAxes": [
          {
            "label": "Seconds",
            "min": 0
          }
        ]
      },
      {
        "id": 3,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          },
          {
            "expr": "rate(http_requests_total{status_code=~\"4..\"}[5m])",
            "legendFormat": "4xx errors"
          }
        ]
      },
      {
        "id": 4,
        "title": "Content Generation Metrics",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(content_generation_total{status=\"success\"}[5m])",
            "legendFormat": "Successful generations"
          },
          {
            "expr": "rate(content_generation_total{status=\"error\"}[5m])",
            "legendFormat": "Failed generations"
          }
        ]
      },
      {
        "id": 5,
        "title": "Database Connections",
        "type": "singlestat",
        "targets": [
          {
            "expr": "database_connections_active",
            "legendFormat": "Active connections"
          }
        ],
        "thresholds": "70,80",
        "colors": ["green", "yellow", "red"]
      },
      {
        "id": 6,
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "process_resident_memory_bytes / 1024 / 1024",
            "legendFormat": "RSS Memory (MB)"
          },
          {
            "expr": "nodejs_heap_size_used_bytes / 1024 / 1024",
            "legendFormat": "Heap Used (MB)"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
```

### 2. Business Metrics Dashboard

```typescript
// lib/monitoring/business-metrics.ts
import { createServerClient } from '@/lib/supabase/server'
import { contextLogger } from '@/lib/logging/logger'

export class BusinessMetrics {
  static async getContentGenerationMetrics(timeRange: '1h' | '24h' | '7d' = '24h') {
    try {
      const supabase = createServerClient()
      const hoursBack = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : 168
      
      const { data, error } = await supabase
        .from('generated_content')
        .select('status, created_at, ai_model_used, word_count')
        .gte('created_at', new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString())
      
      if (error) throw error
      
      const metrics = {
        total: data.length,
        successful: data.filter(item => item.status === 'generated').length,
        failed: data.filter(item => item.status === 'error').length,
        avgWordCount: data.reduce((sum, item) => sum + (item.word_count || 0), 0) / data.length,
        modelUsage: data.reduce((acc, item) => {
          acc[item.ai_model_used] = (acc[item.ai_model_used] || 0) + 1
          return acc
        }, {} as Record<string, number>),
      }
      
      contextLogger.info('Business metrics calculated', { timeRange, metrics })
      return metrics
    } catch (error) {
      contextLogger.error('Failed to calculate business metrics', { error, timeRange })
      throw error
    }
  }
  
  static async getUserEngagementMetrics() {
    try {
      const supabase = createServerClient()
      
      // This would typically come from your analytics/session tracking
      const activeUsers = await this.getActiveUserCount()
      const contentViews = await this.getContentViewCount()
      const avgSessionDuration = await this.getAverageSessionDuration()
      
      return {
        activeUsers,
        contentViews,
        avgSessionDuration,
      }
    } catch (error) {
      contextLogger.error('Failed to calculate user engagement metrics', { error })
      throw error
    }
  }
  
  private static async getActiveUserCount(): Promise<number> {
    // Implementation depends on your user tracking system
    return 0
  }
  
  private static async getContentViewCount(): Promise<number> {
    // Implementation depends on your analytics system
    return 0
  }
  
  private static async getAverageSessionDuration(): Promise<number> {
    // Implementation depends on your session tracking
    return 0
  }
}
```

This comprehensive monitoring setup provides:

1. **Real-time application monitoring** with Sentry and custom metrics
2. **Infrastructure monitoring** with Prometheus and Grafana
3. **Structured logging** with correlation IDs and context
4. **Health checks** for dependencies and system resources
5. **Alerting** via multiple channels (email, Slack, PagerDuty)
6. **Business metrics** tracking for KPIs and user engagement
7. **Performance monitoring** including Web Vitals and RUM

The system is designed to be production-ready with proper error handling, security considerations, and scalability in mind.

---

For additional monitoring resources:
- [Troubleshooting Guide](troubleshooting.md)
- [Production Setup](../deployment/production-setup.md)
- [Performance Optimization](../development/performance.md)
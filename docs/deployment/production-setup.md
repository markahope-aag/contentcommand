# Production Deployment Guide

This guide covers deploying Content Command to production environments with best practices for security, performance, and reliability.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Deployment Platforms](#deployment-platforms)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Security Configuration](#security-configuration)
6. [Performance Optimization](#performance-optimization)
7. [Monitoring & Logging](#monitoring--logging)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [Backup & Recovery](#backup--recovery)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js**: 18.17+ or 20.0+
- **Memory**: Minimum 512MB RAM (2GB+ recommended)
- **Storage**: 10GB+ available space
- **Network**: HTTPS-enabled domain
- **Database**: PostgreSQL 14+ (Supabase recommended)

### Required Services

- **Supabase**: Database, Auth, and Real-time subscriptions
- **Redis**: Caching and rate limiting (Upstash recommended)
- **Email Service**: Transactional emails (optional)
- **Monitoring**: Error tracking and performance monitoring

### External API Keys

Ensure you have valid API keys for:
- OpenAI (GPT models)
- Anthropic (Claude models)
- DataForSEO (competitive analysis)
- Frase (content analysis)
- Google APIs (OAuth, Search Console)
- LLMRefs (AI citation tracking)

## Deployment Platforms

### Vercel (Recommended)

Vercel provides the best Next.js experience with zero-config deployment.

#### 1. Connect Repository

```bash
# Install Vercel CLI
npm i -g vercel

# Login and link project
vercel login
vercel link

# Deploy to production
vercel --prod
```

#### 2. Configure Environment Variables

In Vercel dashboard:
1. Go to Project → Settings → Environment Variables
2. Add all required variables (see [Environment Configuration](#environment-configuration))
3. Set appropriate environments (Production, Preview, Development)

#### 3. Configure Build Settings

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm ci",
  "devCommand": "npm run dev"
}
```

#### 4. Domain Configuration

```bash
# Add custom domain
vercel domains add yourdomain.com

# Configure DNS
# Add CNAME record: www.yourdomain.com → cname.vercel-dns.com
# Add A record: yourdomain.com → 76.76.19.61
```

### Docker Deployment

For self-hosted environments or cloud providers.

#### 1. Create Dockerfile

```dockerfile
# Production Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### 2. Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      # ... other environment variables
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    restart: unless-stopped
```

#### 3. Deploy with Docker

```bash
# Build and deploy
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f app

# Update deployment
docker-compose pull
docker-compose up -d
```

### AWS Deployment

Deploy to AWS using various services.

#### Option 1: AWS App Runner

```yaml
# apprunner.yaml
version: 1.0
runtime: nodejs18
build:
  commands:
    build:
      - npm ci
      - npm run build
run:
  runtime-version: 18
  command: npm start
  network:
    port: 3000
    env: PORT
  env:
    - name: NODE_ENV
      value: production
```

#### Option 2: ECS Fargate

```json
{
  "family": "content-command",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "content-command",
      "image": "your-ecr-repo/content-command:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "SUPABASE_SERVICE_ROLE_KEY",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:content-command/supabase-key"
        }
      ]
    }
  ]
}
```

## Environment Configuration

### Production Environment Variables

Create a comprehensive `.env.production` file:

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
PORT=3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Services
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# External Integrations
DATAFORSEO_LOGIN=your-dataforseo-login
DATAFORSEO_PASSWORD=your-dataforseo-password
FRASE_API_KEY=your-frase-api-key
LLMREFS_API_KEY=your-llmrefs-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# Security
NEXTAUTH_SECRET=your-very-secure-random-string-32-chars-min
NEXTAUTH_URL=https://yourdomain.com
CSRF_SECRET=another-secure-random-string

# Monitoring (optional)
SENTRY_DSN=https://your-sentry-dsn
VERCEL_ANALYTICS_ID=your-vercel-analytics-id

# Email (optional)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@yourdomain.com
```

### Environment Validation

Add environment validation to catch missing variables early:

```typescript
// lib/config/env-validation.ts
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
})

export const env = envSchema.parse(process.env)
```

## Database Setup

### Supabase Production Configuration

#### 1. Create Production Project

```bash
# Install Supabase CLI
npm install -g supabase

# Login and create project
supabase login
supabase projects create content-command-prod --org-id your-org-id

# Link local project
supabase link --project-ref your-project-ref
```

#### 2. Deploy Database Schema

```bash
# Deploy migrations
supabase db push

# Verify deployment
supabase db diff --schema public
```

#### 3. Configure Row Level Security

Ensure RLS is properly configured:

```sql
-- Verify RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false;

-- Enable RLS on any missing tables
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

#### 4. Database Performance Optimization

```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_briefs_client_status 
ON content_briefs(client_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_content_brief_status 
ON generated_content(brief_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_org_id 
ON clients(org_id);

-- Analyze tables for query optimization
ANALYZE;
```

#### 5. Backup Configuration

```bash
# Configure automated backups
supabase projects api-keys create --project-ref your-project-ref --name backup-key

# Set up daily backups (example with cron)
0 2 * * * pg_dump "postgresql://user:pass@host:5432/db" | gzip > backup-$(date +%Y%m%d).sql.gz
```

### Self-Hosted PostgreSQL

If using your own PostgreSQL instance:

```bash
# Install PostgreSQL 14+
sudo apt update
sudo apt install postgresql-14 postgresql-client-14

# Configure PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE contentcommand;
CREATE USER contentcommand WITH ENCRYPTED PASSWORD 'secure-password';
GRANT ALL PRIVILEGES ON DATABASE contentcommand TO contentcommand;

# Configure connection limits and security
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
SELECT pg_reload_conf();
```

## Security Configuration

### 1. HTTPS and SSL

#### Vercel (Automatic)
Vercel provides automatic HTTPS with Let's Encrypt certificates.

#### Self-Hosted with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. Security Headers

Configure security headers in `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://*.upstash.io;"
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
```

### 3. API Security

```typescript
// lib/security/rate-limiting.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const rateLimits = {
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
  }),
  content: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    analytics: true,
  }),
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
  }),
}
```

### 4. Input Validation

```typescript
// lib/validation/api-schemas.ts
import { z } from 'zod'

export const createClientSchema = z.object({
  name: z.string().min(1).max(100),
  domain: z.string().url().or(z.string().regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)),
  industry: z.string().max(50).optional(),
  target_keywords: z.array(z.string()).max(20).optional(),
  brand_voice: z.record(z.any()).optional(),
  org_id: z.string().uuid().optional(),
})

export const createContentBriefSchema = z.object({
  client_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  target_keyword: z.string().min(1).max(100),
  target_audience: z.string().min(1).max(500),
  content_type: z.enum(['blog_post', 'article', 'guide', 'tutorial', 'case_study', 'whitepaper']),
  target_word_count: z.number().int().min(100).max(10000),
  priority_level: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  content_requirements: z.record(z.any()).optional(),
})
```

## Performance Optimization

### 1. Next.js Configuration

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  
  // Image optimization
  images: {
    domains: ['your-supabase-project.supabase.co'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Compression
  compress: true,
  
  // Bundle analyzer (for development)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config) => {
      config.plugins.push(new (require('@next/bundle-analyzer'))({
        enabled: true,
      }))
      return config
    },
  }),
  
  // Output configuration for Docker
  output: 'standalone',
  
  // Reduce bundle size
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@sentry/node': false,
        '@sentry/profiling-node': false,
      }
    }
    return config
  },
}

module.exports = nextConfig
```

### 2. Caching Strategy

```typescript
// lib/cache/redis-cache.ts
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  try {
    const cached = await redis.get(key)
    if (cached) {
      return cached as T
    }
  } catch (error) {
    console.warn('Cache read error:', error)
  }
  
  const data = await fetcher()
  
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data))
  } catch (error) {
    console.warn('Cache write error:', error)
  }
  
  return data
}

// Cache invalidation
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch (error) {
    console.warn('Cache invalidation error:', error)
  }
}
```

### 3. Database Connection Pooling

```typescript
// lib/supabase/connection-pool.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'content-command-prod',
    },
  },
})
```

## Monitoring & Logging

### 1. Error Tracking with Sentry

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
  tracesSampleRate: 0.1,
  debug: false,
  integrations: [
    new Sentry.BrowserTracing({
      tracingOrigins: ['localhost', process.env.NEXT_PUBLIC_APP_URL],
    }),
  ],
})
```

```javascript
// sentry.server.config.js
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  debug: false,
})
```

### 2. Application Logging

```typescript
// lib/logging/logger.ts
import winston from 'winston'

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'content-command' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }))
}

export { logger }
```

### 3. Health Checks

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { Redis } from '@upstash/redis'

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {
      database: 'unknown',
      redis: 'unknown',
      external_apis: 'unknown',
    },
  }

  try {
    // Database check
    const supabase = createServerClient()
    const { error: dbError } = await supabase.from('organizations').select('id').limit(1)
    checks.checks.database = dbError ? 'unhealthy' : 'healthy'

    // Redis check
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    await redis.ping()
    checks.checks.redis = 'healthy'

    // External API checks (basic connectivity)
    const apiChecks = await Promise.allSettled([
      fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      }),
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ model: 'claude-3-haiku-20240307', max_tokens: 1, messages: [] }),
      }),
    ])

    const healthyApis = apiChecks.filter(result => 
      result.status === 'fulfilled' && result.value.ok
    ).length

    checks.checks.external_apis = healthyApis >= apiChecks.length / 2 ? 'healthy' : 'degraded'

  } catch (error) {
    checks.status = 'unhealthy'
    console.error('Health check error:', error)
  }

  const overallHealthy = Object.values(checks.checks).every(status => 
    status === 'healthy' || status === 'degraded'
  )

  return NextResponse.json(checks, {
    status: overallHealthy ? 200 : 503,
  })
}
```

### 4. Performance Monitoring

```typescript
// lib/monitoring/performance.ts
export function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const start = performance.now()
    
    try {
      const result = await fn()
      const duration = performance.now() - start
      
      // Log slow operations
      if (duration > 1000) {
        console.warn(`Slow operation: ${name} took ${duration.toFixed(2)}ms`)
      }
      
      // Send to monitoring service
      if (process.env.NODE_ENV === 'production') {
        // Example: send to DataDog, New Relic, etc.
        console.log(`Performance: ${name} - ${duration.toFixed(2)}ms`)
      }
      
      resolve(result)
    } catch (error) {
      const duration = performance.now() - start
      console.error(`Failed operation: ${name} failed after ${duration.toFixed(2)}ms`, error)
      reject(error)
    }
  })
}
```

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run TypeScript check
        run: npx tsc --noEmit
      
      - name: Run linting
        run: npm run lint
      
      - name: Run tests
        run: npm test
        env:
          NODE_ENV: test
      
      - name: Build application
        run: npm run build
        env:
          NODE_ENV: production
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

  database-migration:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest
      
      - name: Run database migrations
        run: supabase db push --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

### Docker CI/CD

```yaml
# .github/workflows/docker.yml
name: Docker Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:latest
            ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      
      - name: Deploy to production
        run: |
          # Deploy to your container orchestration platform
          # Example: kubectl, docker-compose, etc.
          echo "Deploying to production..."
```

## Backup & Recovery

### 1. Database Backups

```bash
#!/bin/bash
# scripts/backup-database.sh

set -e

# Configuration
BACKUP_DIR="/backups/contentcommand"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql.gz"
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup
echo "Creating database backup..."
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"

# Verify backup
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    echo "Backup created successfully: $BACKUP_FILE"
else
    echo "Backup failed!"
    exit 1
fi

# Clean up old backups
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed successfully"
```

### 2. Application State Backup

```typescript
// scripts/backup-app-state.ts
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function backupApplicationState() {
  const backupDir = path.join(process.cwd(), 'backups', new Date().toISOString().split('T')[0])
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  // Backup critical tables
  const tables = [
    'organizations',
    'clients',
    'content_briefs',
    'generated_content',
    'integration_health'
  ]

  for (const table of tables) {
    console.log(`Backing up ${table}...`)
    
    const { data, error } = await supabase
      .from(table)
      .select('*')
    
    if (error) {
      console.error(`Error backing up ${table}:`, error)
      continue
    }
    
    fs.writeFileSync(
      path.join(backupDir, `${table}.json`),
      JSON.stringify(data, null, 2)
    )
  }

  console.log(`Backup completed in: ${backupDir}`)
}

backupApplicationState().catch(console.error)
```

### 3. Recovery Procedures

```bash
#!/bin/bash
# scripts/restore-database.sh

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <backup-file>"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Restoring database from: $BACKUP_FILE"

# Create a new database for restoration
createdb contentcommand_restore

# Restore the backup
if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | psql contentcommand_restore
else
    psql contentcommand_restore < "$BACKUP_FILE"
fi

echo "Database restored to: contentcommand_restore"
echo "Verify the restoration and then rename the database if needed"
```

## Troubleshooting

### Common Production Issues

#### 1. Memory Issues

```bash
# Monitor memory usage
docker stats
htop

# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=2048" npm start
```

#### 2. Database Connection Issues

```typescript
// lib/supabase/health-check.ts
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const supabase = createServerClient()
    const { error } = await supabase.from('organizations').select('id').limit(1)
    return !error
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}
```

#### 3. Rate Limiting Issues

```typescript
// lib/rate-limit/adaptive.ts
export class AdaptiveRateLimit {
  private failures = 0
  private lastFailure = 0
  
  async checkLimit(identifier: string): Promise<boolean> {
    const now = Date.now()
    
    // Increase limits if system is healthy
    if (now - this.lastFailure > 300000) { // 5 minutes
      this.failures = Math.max(0, this.failures - 1)
    }
    
    const multiplier = Math.min(1 + this.failures * 0.5, 5)
    const limit = Math.floor(100 / multiplier)
    
    // Apply rate limit logic
    return true // Simplified
  }
  
  recordFailure(): void {
    this.failures++
    this.lastFailure = Date.now()
  }
}
```

#### 4. SSL Certificate Issues

```bash
# Check certificate expiration
openssl x509 -in /path/to/cert.pem -text -noout | grep "Not After"

# Renew Let's Encrypt certificate
sudo certbot renew --dry-run
sudo certbot renew
```

### Monitoring Commands

```bash
# Check application logs
docker-compose logs -f app

# Monitor system resources
htop
iostat -x 1
netstat -tulpn

# Check disk space
df -h
du -sh /var/log/*

# Monitor database performance
psql -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
psql -c "SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_user_tables;"
```

### Performance Debugging

```bash
# Analyze bundle size
npm run build
npm install -g @next/bundle-analyzer
ANALYZE=true npm run build

# Profile Node.js performance
node --prof app.js
node --prof-process isolate-*.log > processed.txt

# Database query analysis
EXPLAIN ANALYZE SELECT * FROM content_briefs WHERE client_id = 'uuid';
```

## Security Checklist

- [ ] HTTPS enabled with valid SSL certificate
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection enabled
- [ ] CSRF protection configured
- [ ] Environment variables secured
- [ ] Database RLS policies active
- [ ] API keys rotated regularly
- [ ] Error messages don't leak sensitive info
- [ ] Logging configured (but not logging secrets)
- [ ] Monitoring and alerting set up
- [ ] Backup and recovery procedures tested

## Final Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificate installed and valid
- [ ] DNS records configured correctly
- [ ] Health checks passing
- [ ] Monitoring and logging active
- [ ] Backup procedures tested
- [ ] Performance benchmarks met
- [ ] Security scan completed
- [ ] Load testing performed
- [ ] Rollback procedure documented
- [ ] Team notified of deployment

---

For additional support, refer to:
- [Troubleshooting Guide](../operations/troubleshooting.md)
- [API Documentation](../api/overview.md)
- [Monitoring Setup](../operations/monitoring.md)
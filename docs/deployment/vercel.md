# Vercel Deployment Guide

This guide covers deploying Content Command to Vercel, the recommended platform for Next.js applications.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Deployment](#quick-deployment)
3. [Environment Configuration](#environment-configuration)
4. [Custom Domains](#custom-domains)
5. [Performance Optimization](#performance-optimization)
6. [Monitoring & Analytics](#monitoring--analytics)
7. [CI/CD Integration](#cicd-integration)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### Requirements

- **GitHub/GitLab/Bitbucket** account with your repository
- **Vercel** account (free tier available)
- **Node.js** 18+ for local development
- **Environment variables** configured (see [Environment Setup](../getting-started/environment.md))

### Vercel CLI Installation

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to your Vercel account
vercel login

# Verify installation
vercel --version
```

## Quick Deployment

### Method 1: Vercel Dashboard (Recommended)

1. **Connect Repository**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Select your Git provider (GitHub, GitLab, Bitbucket)
   - Import your Content Command repository

2. **Configure Project**
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `npm ci` (auto-detected)

3. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be available at `https://your-project.vercel.app`

### Method 2: Vercel CLI

```bash
# Navigate to your project directory
cd content-command

# Link project to Vercel
vercel link

# Deploy to preview (development)
vercel

# Deploy to production
vercel --prod

# Check deployment status
vercel ls
```

### Method 3: Git Integration

```bash
# Push to main branch for automatic deployment
git add .
git commit -m "Deploy to production"
git push origin main

# Vercel will automatically deploy on push to main
```

## Environment Configuration

### Setting Environment Variables

#### Via Vercel Dashboard

1. Go to your project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable with appropriate environment scope:

| Variable | Environment | Value |
|----------|-------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development | `your-anon-key` |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | `your-service-role-key` |
| `OPENAI_API_KEY` | Production, Preview | `sk-your-openai-key` |
| `ANTHROPIC_API_KEY` | Production, Preview | `sk-ant-your-anthropic-key` |
| `NEXTAUTH_SECRET` | Production, Preview | `your-secure-secret` |
| `NEXTAUTH_URL` | Production | `https://yourdomain.com` |
| `NEXTAUTH_URL` | Preview | `https://your-project-git-branch.vercel.app` |

#### Via Vercel CLI

```bash
# Add production environment variable
vercel env add OPENAI_API_KEY production

# Add variable for all environments
vercel env add NEXT_PUBLIC_SUPABASE_URL production preview development

# List environment variables
vercel env ls

# Remove environment variable
vercel env rm VARIABLE_NAME production
```

#### Using .env Files

Create environment-specific files:

```bash
# .env.production (for production builds)
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXTAUTH_URL=https://yourdomain.com

# .env.preview (for preview deployments)
NODE_ENV=development
NEXT_PUBLIC_APP_URL=https://your-project-git-branch.vercel.app
NEXTAUTH_URL=https://your-project-git-branch.vercel.app
```

### Environment Variable Validation

```typescript
// lib/config/vercel-env.ts
import { z } from 'zod'

const vercelEnvSchema = z.object({
  // Vercel-specific variables
  VERCEL: z.string().optional(),
  VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
  VERCEL_URL: z.string().optional(),
  VERCEL_REGION: z.string().optional(),
  
  // Application variables
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
})

export const vercelEnv = vercelEnvSchema.parse(process.env)

// Dynamic NEXTAUTH_URL based on Vercel environment
export const getAuthUrl = () => {
  if (process.env.VERCEL_ENV === 'production') {
    return process.env.NEXTAUTH_URL
  }
  
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  return 'http://localhost:3000'
}
```

## Custom Domains

### Adding a Custom Domain

#### Via Vercel Dashboard

1. Go to your project dashboard
2. Navigate to **Settings** → **Domains**
3. Click **Add Domain**
4. Enter your domain (e.g., `yourdomain.com`)
5. Follow DNS configuration instructions

#### Via Vercel CLI

```bash
# Add domain
vercel domains add yourdomain.com

# List domains
vercel domains ls

# Remove domain
vercel domains rm yourdomain.com
```

### DNS Configuration

#### Option 1: Nameservers (Recommended)

If you can change nameservers:

1. Set nameservers to Vercel's:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`

2. Vercel will automatically manage all DNS records

#### Option 2: CNAME Record

If you want to keep your current DNS provider:

```bash
# Add CNAME record
www.yourdomain.com CNAME cname.vercel-dns.com

# For apex domain, add A record
yourdomain.com A 76.76.19.61
```

#### Option 3: Custom DNS Setup

```bash
# A Records (for apex domain)
yourdomain.com A 76.76.19.61

# CNAME Records (for subdomains)
www.yourdomain.com CNAME cname.vercel-dns.com
api.yourdomain.com CNAME cname.vercel-dns.com

# Optional: CAA record for SSL
yourdomain.com CAA 0 issue "letsencrypt.org"
```

### SSL Certificate

Vercel automatically provides SSL certificates via Let's Encrypt:

- **Automatic renewal**: Certificates are renewed automatically
- **Wildcard support**: Available for wildcard domains
- **Custom certificates**: Upload your own if needed

```bash
# Check SSL certificate status
vercel certs ls

# Add custom certificate
vercel certs add yourdomain.com cert.pem key.pem
```

## Performance Optimization

### Vercel Configuration

```javascript
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm ci",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    },
    {
      "source": "/_next/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/docs",
      "destination": "/docs/getting-started/quick-start",
      "permanent": false
    }
  ],
  "rewrites": [
    {
      "source": "/api/docs",
      "destination": "https://petstore.swagger.io/?url=https://yourdomain.com/api/openapi.yaml"
    }
  ]
}
```

### Edge Functions

```typescript
// middleware.ts (runs on Vercel Edge Runtime)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Add security headers
  const response = NextResponse.next()
  
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  // Rate limiting based on IP
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  
  // Add rate limiting logic here
  
  return response
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
```

### Image Optimization

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'your-supabase-project.supabase.co',
      'vercel.com',
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
}

module.exports = nextConfig
```

### Bundle Analysis

```bash
# Install bundle analyzer
npm install --save-dev @next/bundle-analyzer

# Add to next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer(nextConfig)

# Analyze bundle
ANALYZE=true npm run build
```

## Monitoring & Analytics

### Vercel Analytics

Enable Vercel Analytics for performance insights:

```bash
# Install Vercel Analytics
npm install @vercel/analytics

# Add to your app
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### Speed Insights

```bash
# Install Speed Insights
npm install @vercel/speed-insights

# Add to your app
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
```

### Custom Monitoring

```typescript
// lib/monitoring/vercel-metrics.ts
export function trackDeployment() {
  if (process.env.VERCEL_ENV === 'production') {
    // Track deployment metrics
    console.log('Production deployment completed', {
      timestamp: new Date().toISOString(),
      region: process.env.VERCEL_REGION,
      commit: process.env.VERCEL_GIT_COMMIT_SHA,
    })
  }
}

// Track API performance
export function trackApiCall(endpoint: string, duration: number, status: number) {
  if (process.env.VERCEL_ENV === 'production') {
    console.log('API call tracked', {
      endpoint,
      duration,
      status,
      region: process.env.VERCEL_REGION,
      timestamp: new Date().toISOString(),
    })
  }
}
```

## CI/CD Integration

### GitHub Actions with Vercel

```yaml
# .github/workflows/vercel.yml
name: Vercel Deployment

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  deploy:
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
      
      - name: Run tests
        run: npm test
        env:
          NODE_ENV: test
      
      - name: Build project
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: ${{ github.ref == 'refs/heads/main' && '--prod' || '' }}
          scope: ${{ secrets.VERCEL_ORG_ID }}
```

### Preview Deployments

Vercel automatically creates preview deployments for:

- **Pull Requests**: Each PR gets a unique URL
- **Branch Pushes**: Each branch gets a unique URL
- **Commits**: Each commit gets a unique URL

```typescript
// lib/utils/deployment.ts
export function getDeploymentInfo() {
  return {
    environment: process.env.VERCEL_ENV,
    url: process.env.VERCEL_URL,
    region: process.env.VERCEL_REGION,
    commit: process.env.VERCEL_GIT_COMMIT_SHA,
    branch: process.env.VERCEL_GIT_COMMIT_REF,
    isProduction: process.env.VERCEL_ENV === 'production',
    isPreview: process.env.VERCEL_ENV === 'preview',
  }
}

// Use in components
export function DeploymentBanner() {
  const deployment = getDeploymentInfo()
  
  if (deployment.isProduction) return null
  
  return (
    <div className="bg-yellow-100 border-b border-yellow-200 px-4 py-2 text-sm">
      Preview deployment from branch: <strong>{deployment.branch}</strong>
    </div>
  )
}
```

### Database Migrations

```yaml
# .github/workflows/migrate.yml
name: Database Migration

on:
  push:
    branches: [main]
    paths: ['supabase/migrations/**']

jobs:
  migrate:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest
      
      - name: Run migrations
        run: supabase db push --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

## Troubleshooting

### Common Deployment Issues

#### 1. Build Failures

```bash
# Check build logs
vercel logs your-deployment-url

# Local build test
npm run build

# Check for TypeScript errors
npx tsc --noEmit
```

#### 2. Environment Variable Issues

```bash
# List environment variables
vercel env ls

# Test environment variable access
vercel env add TEST_VAR production
vercel logs --follow
```

#### 3. Function Timeout

```javascript
// vercel.json
{
  "functions": {
    "app/api/generate-content/route.ts": {
      "maxDuration": 60
    }
  }
}
```

#### 4. Memory Limit Exceeded

```javascript
// vercel.json
{
  "functions": {
    "app/api/**/*.ts": {
      "memory": 1024
    }
  }
}
```

### Performance Issues

#### 1. Cold Start Optimization

```typescript
// lib/utils/warm-up.ts
let isWarmedUp = false

export async function warmUp() {
  if (isWarmedUp) return
  
  // Initialize connections, load configurations
  await Promise.all([
    // Pre-initialize Supabase client
    import('@/lib/supabase/server'),
    // Pre-load critical data
    import('@/lib/cache/redis'),
  ])
  
  isWarmedUp = true
}

// Use in API routes
export async function GET() {
  await warmUp()
  // ... rest of your API logic
}
```

#### 2. Bundle Size Optimization

```javascript
// next.config.js
const nextConfig = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@supabase/supabase-js', 'lucide-react'],
  },
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Remove unused code
      config.resolve.alias = {
        ...config.resolve.alias,
        '@sentry/node': false,
        '@sentry/profiling-node': false,
      }
    }
    return config
  },
}
```

### Debugging Tools

```bash
# View deployment logs
vercel logs

# Follow logs in real-time
vercel logs --follow

# View specific function logs
vercel logs --function=api/generate-content

# Inspect deployment
vercel inspect your-deployment-url

# Download deployment source
vercel download your-deployment-url
```

### Support Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Next.js on Vercel**: https://vercel.com/docs/frameworks/nextjs
- **Vercel Community**: https://github.com/vercel/vercel/discussions
- **Status Page**: https://vercel-status.com/

---

For additional deployment options:
- [Production Setup Guide](production-setup.md)
- [Docker Deployment](docker.md)
- [Environment Configuration](../getting-started/environment.md)
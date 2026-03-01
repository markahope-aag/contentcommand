# Environment Configuration

This guide covers all environment variables and configuration options for Content Command.

## Environment Files

Content Command uses environment files to manage configuration across different environments:

- `.env.local` - Local development (not committed to git)
- `.env.example` - Template file with all required variables
- `.env.production` - Production environment variables (Vercel)

## Required Environment Variables

### Supabase Configuration

```env
# Supabase Project Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**How to get these values:**
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Go to Settings → API
3. Copy the Project URL and anon key
4. Copy the service_role key (keep this secret!)

### AI API Keys

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-...

# Anthropic Configuration  
ANTHROPIC_API_KEY=sk-ant-...
```

**How to get these keys:**
- **OpenAI**: Sign up at [platform.openai.com](https://platform.openai.com), go to API Keys
- **Anthropic**: Sign up at [console.anthropic.com](https://console.anthropic.com), create an API key

## Optional Environment Variables

### Integration APIs

```env
# DataForSEO API (for competitive analysis)
DATAFORSEO_LOGIN=your_login
DATAFORSEO_PASSWORD=your_password

# Frase API (for content analysis)
FRASE_API_KEY=your_frase_api_key

# LLMRefs API (for AI citation tracking)
LLMREFS_API_KEY=your_llmrefs_api_key
```

### Google OAuth (Optional)

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Google APIs (for Search Console & Analytics)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Setting up Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API and Google Analytics API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback` (development)
   - `https://yourdomain.com/auth/callback` (production)

### Redis Cache (Optional but Recommended)

```env
# Upstash Redis Configuration
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

**Setting up Redis:**
1. Create account at [upstash.com](https://upstash.com)
2. Create a Redis database
3. Copy the REST URL and token

### Rate Limiting (Optional)

```env
# Rate Limiting Configuration
RATE_LIMIT_REQUESTS_PER_MINUTE=100
RATE_LIMIT_WINDOW_MINUTES=1
```

## Environment Setup by Deployment Type

### Local Development

Create `.env.local` in your project root:

```env
# Copy from .env.example and fill in your values
cp .env.example .env.local
```

**Minimum required for local development:**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

### Vercel Deployment

Set environment variables in the Vercel dashboard:

1. Go to your project in Vercel
2. Navigate to Settings → Environment Variables
3. Add all required variables for Production environment

**Vercel-specific considerations:**
- Use the Vercel CLI for easy variable management
- Set different values for Preview and Production environments
- Use Vercel's secret management for sensitive keys

```bash
# Using Vercel CLI
vercel env add OPENAI_API_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

### Docker Deployment

Create a `.env` file for Docker:

```env
# Docker environment file
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# ... other variables
```

Use with Docker Compose:

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    env_file:
      - .env
    ports:
      - "3000:3000"
```

## Environment Variable Validation

Content Command validates environment variables at startup:

```typescript
// lib/env.ts
import { z } from 'zod'

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
})

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  DATAFORSEO_LOGIN: z.string().optional(),
  DATAFORSEO_PASSWORD: z.string().optional(),
  FRASE_API_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
})

export function clientEnv() {
  return clientEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })
}

export function serverEnv() {
  return serverEnvSchema.parse(process.env)
}
```

## Security Best Practices

### Environment Variable Security

1. **Never commit secrets to git**
   ```bash
   # Add to .gitignore
   .env.local
   .env.production
   ```

2. **Use different keys for different environments**
   - Development: Separate API keys with lower limits
   - Production: Production-grade keys with appropriate limits

3. **Rotate keys regularly**
   - Set up key rotation schedule
   - Monitor key usage and expiration

4. **Principle of least privilege**
   - Only grant necessary permissions to API keys
   - Use separate service accounts for different functions

### Supabase Security

```env
# Use RLS-enabled keys
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... # This key respects RLS
SUPABASE_SERVICE_ROLE_KEY=eyJ... # This key bypasses RLS - keep secret!
```

**Important**: The service role key bypasses Row Level Security. Never expose it to the client.

### API Key Management

```env
# Good: Environment-specific keys
OPENAI_API_KEY_DEV=sk-dev-...
OPENAI_API_KEY_PROD=sk-prod-...

# Good: Descriptive key names
DATAFORSEO_API_LOGIN=your_login
DATAFORSEO_API_PASSWORD=your_password

# Bad: Generic or unclear names
API_KEY=sk-...
SECRET=your_secret
```

## Configuration Validation

### Startup Validation

The application validates configuration at startup and provides helpful error messages:

```typescript
// Validation errors provide clear guidance
try {
  const env = serverEnv()
} catch (error) {
  console.error('Environment configuration error:')
  console.error('Missing required environment variable: OPENAI_API_KEY')
  console.error('Please add this variable to your .env.local file')
  process.exit(1)
}
```

### Runtime Validation

Some configurations are validated at runtime:

```typescript
// API key validation
if (!process.env.OPENAI_API_KEY?.startsWith('sk-')) {
  throw new Error('Invalid OpenAI API key format')
}

// URL validation
if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase.co')) {
  throw new Error('Invalid Supabase URL')
}
```

## Environment-Specific Configuration

### Development Environment

```env
# Development-specific settings
NODE_ENV=development
NEXT_PUBLIC_APP_ENV=development

# Relaxed rate limits for development
RATE_LIMIT_REQUESTS_PER_MINUTE=1000

# Development database
NEXT_PUBLIC_SUPABASE_URL=https://dev-project.supabase.co

# Lower-tier API keys for development
OPENAI_API_KEY=sk-dev-...
```

### Production Environment

```env
# Production settings
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production

# Production rate limits
RATE_LIMIT_REQUESTS_PER_MINUTE=100

# Production database
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co

# Production API keys
OPENAI_API_KEY=sk-prod-...
```

### Testing Environment

```env
# Testing configuration
NODE_ENV=test
NEXT_PUBLIC_APP_ENV=test

# Test database
NEXT_PUBLIC_SUPABASE_URL=https://test-project.supabase.co

# Mock API keys for testing
OPENAI_API_KEY=sk-test-mock-key
ANTHROPIC_API_KEY=sk-test-mock-key
```

## Troubleshooting

### Common Environment Issues

#### 1. Missing Environment Variables

**Error**: `Environment configuration error: Missing required variable`

**Solution**:
```bash
# Check your .env.local file exists
ls -la .env.local

# Verify all required variables are set
cat .env.local | grep -E "(SUPABASE|OPENAI|ANTHROPIC)"
```

#### 2. Invalid API Keys

**Error**: `Invalid API key format` or `401 Unauthorized`

**Solution**:
```bash
# Test API key format
echo $OPENAI_API_KEY | grep -E "^sk-[a-zA-Z0-9]{48}$"

# Test API key validity
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models
```

#### 3. Supabase Connection Issues

**Error**: `Failed to connect to Supabase`

**Solution**:
```bash
# Verify Supabase URL format
echo $NEXT_PUBLIC_SUPABASE_URL | grep "supabase.co"

# Test connection
curl $NEXT_PUBLIC_SUPABASE_URL/rest/v1/
```

#### 4. Environment Variable Not Loading

**Issue**: Variables defined but not accessible in application

**Solutions**:
1. **Restart development server** after adding new variables
2. **Check variable names** - they must start with `NEXT_PUBLIC_` for client-side access
3. **Verify file location** - `.env.local` should be in project root
4. **Check syntax** - no spaces around `=` sign

### Debugging Environment Issues

```typescript
// Add to a page or API route for debugging
export default function DebugPage() {
  return (
    <div>
      <h1>Environment Debug</h1>
      <pre>
        {JSON.stringify({
          NODE_ENV: process.env.NODE_ENV,
          SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
          OPENAI_KEY: process.env.OPENAI_API_KEY ? 'Set' : 'Missing',
          // Don't log actual values in production!
        }, null, 2)}
      </pre>
    </div>
  )
}
```

## Environment Variable Reference

### Complete Variable List

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | ✅ | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | ✅ | Supabase service role key |
| `OPENAI_API_KEY` | Server | ✅ | OpenAI API key |
| `ANTHROPIC_API_KEY` | Server | ✅ | Anthropic API key |
| `DATAFORSEO_LOGIN` | Server | ⚠️ | DataForSEO login |
| `DATAFORSEO_PASSWORD` | Server | ⚠️ | DataForSEO password |
| `FRASE_API_KEY` | Server | ⚠️ | Frase API key |
| `LLMREFS_API_KEY` | Server | ⚠️ | LLMRefs API key |
| `GOOGLE_CLIENT_ID` | Server | ⚠️ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Server | ⚠️ | Google OAuth client secret |
| `UPSTASH_REDIS_REST_URL` | Server | ⚠️ | Redis cache URL |
| `UPSTASH_REDIS_REST_TOKEN` | Server | ⚠️ | Redis cache token |

✅ Required | ⚠️ Optional

### Variable Types

- **Client**: Available in browser (must start with `NEXT_PUBLIC_`)
- **Server**: Server-side only (never exposed to browser)

This environment configuration guide ensures secure and proper setup of Content Command across all deployment environments.
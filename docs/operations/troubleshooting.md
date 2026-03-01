# Troubleshooting Guide

This guide covers common issues and their solutions when using Content Command.

## Quick Diagnostics

### Health Check Endpoints

Use these endpoints to verify system health:

```bash
# Application health
curl https://your-domain.com/api/health

# Database connectivity
curl https://your-domain.com/api/health/database

# Integration status
curl https://your-domain.com/api/integrations/health
```

### System Status Dashboard

Access the system status at `/dashboard/system-status` to view:
- Database connection status
- API integration health
- Recent error logs
- Performance metrics

## Common Issues

### Authentication Problems

#### Issue: "Invalid JWT token" or "Authentication failed"

**Symptoms:**
- Unable to log in
- Automatic logout
- API requests returning 401 errors

**Causes:**
- Expired session tokens
- Invalid Supabase configuration
- Clock synchronization issues

**Solutions:**

1. **Clear browser storage and retry**
   ```javascript
   // In browser console
   localStorage.clear()
   sessionStorage.clear()
   location.reload()
   ```

2. **Verify Supabase configuration**
   ```bash
   # Check environment variables
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

3. **Check system clock**
   ```bash
   # Ensure system time is correct
   date
   ```

4. **Regenerate Supabase keys**
   - Go to Supabase Dashboard → Settings → API
   - Regenerate anon key if compromised
   - Update environment variables

#### Issue: "User not found" or "Email not confirmed"

**Symptoms:**
- Login fails with valid credentials
- New user registration issues

**Solutions:**

1. **Check email confirmation**
   - Look for confirmation email in spam folder
   - Resend confirmation email from Supabase Auth

2. **Verify user in Supabase Dashboard**
   - Go to Authentication → Users
   - Check if user exists and is confirmed

3. **Check email settings**
   - Verify SMTP configuration in Supabase
   - Test email delivery

### Database Connection Issues

#### Issue: "Failed to connect to database" or timeout errors

**Symptoms:**
- Application won't start
- Database queries failing
- Intermittent connection drops

**Solutions:**

1. **Check Supabase project status**
   ```bash
   # Test connection
   curl https://your-project.supabase.co/rest/v1/
   ```

2. **Verify connection limits**
   - Check Supabase dashboard for connection usage
   - Upgrade plan if hitting limits

3. **Check network connectivity**
   ```bash
   # Test DNS resolution
   nslookup your-project.supabase.co
   
   # Test connectivity
   telnet your-project.supabase.co 443
   ```

4. **Review connection pooling**
   - Ensure proper connection cleanup in code
   - Check for connection leaks

#### Issue: "Row Level Security policy violation"

**Symptoms:**
- Data not appearing for users
- Permission denied errors
- Empty query results

**Solutions:**

1. **Verify user authentication**
   ```sql
   -- Check current user in Supabase SQL editor
   SELECT auth.uid(), auth.jwt();
   ```

2. **Review RLS policies**
   ```sql
   -- Check policies for a table
   SELECT * FROM pg_policies WHERE tablename = 'clients';
   ```

3. **Test policy logic**
   ```sql
   -- Test organization membership
   SELECT * FROM organization_members WHERE user_id = auth.uid();
   ```

4. **Temporarily disable RLS for debugging**
   ```sql
   -- ONLY for debugging - re-enable immediately
   ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
   -- Test queries
   ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
   ```

### API Integration Failures

#### Issue: OpenAI API errors (Rate limits, invalid keys)

**Symptoms:**
- Content generation fails
- 429 rate limit errors
- 401 authentication errors

**Solutions:**

1. **Check API key validity**
   ```bash
   curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models
   ```

2. **Monitor rate limits**
   ```bash
   # Check usage in OpenAI dashboard
   curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/usage
   ```

3. **Implement retry logic**
   ```typescript
   // Add exponential backoff
   const retryWithBackoff = async (fn: () => Promise<any>, retries = 3) => {
     try {
       return await fn()
     } catch (error) {
       if (retries > 0 && error.status === 429) {
         await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)))
         return retryWithBackoff(fn, retries - 1)
       }
       throw error
     }
   }
   ```

4. **Upgrade API plan**
   - Check OpenAI billing dashboard
   - Upgrade to higher tier if needed

#### Issue: DataForSEO API connection problems

**Symptoms:**
- Competitor analysis not working
- SERP data not updating
- Authentication errors

**Solutions:**

1. **Verify credentials**
   ```bash
   curl -u "$DATAFORSEO_LOGIN:$DATAFORSEO_PASSWORD" \
     https://api.dataforseo.com/v3/user
   ```

2. **Check API limits**
   ```bash
   # Check remaining credits
   curl -u "$DATAFORSEO_LOGIN:$DATAFORSEO_PASSWORD" \
     https://api.dataforseo.com/v3/appendix/user_data
   ```

3. **Review API documentation**
   - Check for API changes or deprecations
   - Update endpoints if necessary

### Content Generation Issues

#### Issue: Poor content quality or inappropriate responses

**Symptoms:**
- Low quality scores
- Off-topic content
- Inappropriate or biased content

**Solutions:**

1. **Review content briefs**
   - Ensure detailed, specific briefs
   - Include clear guidelines and constraints

2. **Adjust AI model parameters**
   ```typescript
   // Improve content quality
   const generationParams = {
     model: 'gpt-4', // Use higher-quality model
     temperature: 0.7, // Reduce randomness
     max_tokens: 2000,
     top_p: 0.9,
   }
   ```

3. **Implement content filtering**
   ```typescript
   // Add content validation
   const validateContent = (content: string) => {
     // Check for inappropriate content
     // Verify topic relevance
     // Ensure quality standards
   }
   ```

4. **Use multiple models for comparison**
   - Generate content with different models
   - Compare and select best output

#### Issue: Content generation timeouts

**Symptoms:**
- Generation process hangs
- Timeout errors
- Incomplete content

**Solutions:**

1. **Increase timeout limits**
   ```typescript
   // Extend API timeouts
   const response = await fetch('/api/content/generate', {
     method: 'POST',
     body: JSON.stringify(data),
     signal: AbortSignal.timeout(120000) // 2 minutes
   })
   ```

2. **Implement streaming responses**
   ```typescript
   // Use streaming for long content
   const stream = await openai.chat.completions.create({
     model: 'gpt-4',
     messages: [...],
     stream: true,
   })
   ```

3. **Break down large requests**
   - Split long content into sections
   - Generate sections separately
   - Combine results

### Performance Issues

#### Issue: Slow page load times

**Symptoms:**
- Long initial page loads
- Slow navigation
- Poor Lighthouse scores

**Solutions:**

1. **Enable caching**
   ```typescript
   // Implement Redis caching
   import { redis } from '@/lib/redis'
   
   const getCachedData = async (key: string) => {
     const cached = await redis.get(key)
     if (cached) return JSON.parse(cached)
     
     const data = await fetchData()
     await redis.setex(key, 300, JSON.stringify(data))
     return data
   }
   ```

2. **Optimize database queries**
   ```sql
   -- Add missing indexes
   CREATE INDEX idx_content_client_status ON generated_content(client_id, status);
   CREATE INDEX idx_briefs_created_at ON content_briefs(created_at DESC);
   ```

3. **Implement pagination**
   ```typescript
   // Add pagination to large datasets
   const { data, count } = await supabase
     .from('content_briefs')
     .select('*', { count: 'exact' })
     .range(0, 19) // First 20 items
   ```

4. **Use Next.js optimization features**
   ```typescript
   // Enable static generation where possible
   export const revalidate = 3600 // Revalidate every hour
   
   // Use dynamic imports for large components
   const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
     loading: () => <Spinner />
   })
   ```

#### Issue: High memory usage or memory leaks

**Symptoms:**
- Application crashes
- Increasing memory usage over time
- Out of memory errors

**Solutions:**

1. **Monitor memory usage**
   ```bash
   # Check memory usage
   ps aux | grep node
   
   # Use Node.js built-in profiler
   node --inspect app.js
   ```

2. **Fix common memory leaks**
   ```typescript
   // Cleanup event listeners
   useEffect(() => {
     const handleResize = () => { /* ... */ }
     window.addEventListener('resize', handleResize)
     
     return () => {
       window.removeEventListener('resize', handleResize)
     }
   }, [])
   
   // Cleanup intervals
   useEffect(() => {
     const interval = setInterval(() => { /* ... */ }, 1000)
     return () => clearInterval(interval)
   }, [])
   ```

3. **Optimize large data handling**
   ```typescript
   // Use streaming for large datasets
   const processLargeDataset = async (data: any[]) => {
     for (const chunk of chunks(data, 100)) {
       await processChunk(chunk)
       // Allow garbage collection
       await new Promise(resolve => setTimeout(resolve, 0))
     }
   }
   ```

### Deployment Issues

#### Issue: Build failures on Vercel

**Symptoms:**
- Deployment fails during build
- TypeScript errors in production
- Missing environment variables

**Solutions:**

1. **Check build logs**
   ```bash
   # Local build test
   npm run build
   
   # Check for TypeScript errors
   npx tsc --noEmit
   ```

2. **Verify environment variables**
   ```bash
   # Check Vercel environment variables
   vercel env ls
   
   # Add missing variables
   vercel env add OPENAI_API_KEY
   ```

3. **Fix TypeScript errors**
   ```typescript
   // Ensure all types are properly defined
   // Fix any 'any' types
   // Resolve import/export issues
   ```

4. **Check dependencies**
   ```bash
   # Verify all dependencies are installed
   npm ci
   
   # Check for security vulnerabilities
   npm audit
   ```

#### Issue: Database migration failures

**Symptoms:**
- New deployments fail
- Database schema out of sync
- Migration errors in logs

**Solutions:**

1. **Check migration status**
   ```bash
   # Using Supabase CLI
   supabase migration list
   
   # Check applied migrations
   supabase db remote --db-url="your-db-url" migration list
   ```

2. **Apply migrations manually**
   ```bash
   # Reset database (development only)
   supabase db reset
   
   # Apply specific migration
   supabase migration up --db-url="your-db-url"
   ```

3. **Fix migration conflicts**
   ```sql
   -- Check for conflicting changes
   SELECT * FROM supabase_migrations.schema_migrations;
   
   -- Resolve conflicts manually if needed
   ```

## Debugging Tools

### Application Logs

#### Accessing Logs

**Vercel Deployment:**
```bash
# View real-time logs
vercel logs your-deployment-url

# View function logs
vercel logs your-deployment-url --follow
```

**Local Development:**
```bash
# Enable debug logging
DEBUG=* npm run dev

# Filter specific logs
DEBUG=supabase:* npm run dev
```

#### Log Analysis

```typescript
// Add structured logging
import { logger } from '@/lib/logger'

logger.info('User action', {
  userId: user.id,
  action: 'content_generated',
  clientId: client.id,
  timestamp: new Date().toISOString()
})

logger.error('API Error', {
  error: error.message,
  stack: error.stack,
  endpoint: '/api/content/generate',
  userId: user.id
})
```

### Database Debugging

#### Query Performance

```sql
-- Enable query timing
SET track_io_timing = on;

-- Analyze slow queries
SELECT query, total_time, calls, mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename = 'generated_content';
```

#### RLS Policy Testing

```sql
-- Test as specific user
SET request.jwt.claims TO '{"sub": "user-id-here"}';

-- Test query with RLS
SELECT * FROM clients WHERE id = 'client-id';

-- Reset to admin
RESET request.jwt.claims;
```

### API Debugging

#### Request Tracing

```typescript
// Add request tracing middleware
export async function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  console.log(`[${requestId}] ${request.method} ${request.url}`)
  
  const response = NextResponse.next()
  response.headers.set('x-request-id', requestId)
  
  return response
}
```

#### API Testing

```bash
# Test API endpoints
curl -X POST https://your-domain.com/api/content/briefs \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Brief", "clientId": "client-id"}'

# Test with verbose output
curl -v -X GET https://your-domain.com/api/clients \
  -H "Authorization: Bearer $JWT_TOKEN"
```

## Monitoring and Alerts

### Setting Up Monitoring

1. **Vercel Analytics**
   - Enable in Vercel dashboard
   - Monitor Core Web Vitals
   - Track error rates

2. **Supabase Monitoring**
   - Monitor database performance
   - Set up alerts for high CPU/memory usage
   - Track API request patterns

3. **Custom Monitoring**
   ```typescript
   // Add custom metrics
   const trackMetric = (name: string, value: number, tags?: Record<string, string>) => {
     // Send to monitoring service
     console.log(`Metric: ${name}=${value}`, tags)
   }
   
   // Track content generation time
   const start = Date.now()
   await generateContent(brief)
   trackMetric('content_generation_time', Date.now() - start, {
     model: 'gpt-4',
     clientId: brief.clientId
   })
   ```

### Alert Configuration

Set up alerts for:
- High error rates (>5%)
- Slow response times (>2s)
- Database connection issues
- API rate limit approaching
- Failed deployments

## Getting Help

### Support Channels

1. **Documentation**
   - Check this troubleshooting guide
   - Review API documentation
   - Search user guides

2. **Community Support**
   - GitHub Discussions
   - Community forum
   - Stack Overflow (tag: content-command)

3. **Direct Support**
   - Create GitHub issue for bugs
   - Email support for urgent issues
   - Schedule call for complex problems

### Reporting Issues

When reporting issues, include:

1. **Environment Information**
   ```bash
   # System info
   node --version
   npm --version
   
   # Package versions
   npm list next react @supabase/supabase-js
   ```

2. **Error Details**
   - Full error message and stack trace
   - Steps to reproduce
   - Expected vs actual behavior

3. **Logs and Screenshots**
   - Relevant application logs
   - Browser console errors
   - Screenshots of UI issues

4. **Configuration**
   - Environment variables (without secrets)
   - Relevant configuration files
   - Database schema if relevant

### Emergency Procedures

For critical production issues:

1. **Immediate Response**
   - Check system status dashboard
   - Review recent deployments
   - Check external service status

2. **Rollback Procedure**
   ```bash
   # Rollback Vercel deployment
   vercel rollback your-deployment-url
   
   # Rollback database migration (if safe)
   supabase migration down
   ```

3. **Communication**
   - Update status page
   - Notify affected users
   - Document incident for post-mortem

This troubleshooting guide should help resolve most common issues with Content Command. For issues not covered here, please refer to the support channels or create a detailed issue report.
# API Overview

Content Command provides a comprehensive REST API for managing content creation, client data, and integrations. This document covers the API structure, authentication, and general usage patterns.

## Base URL

```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

## Authentication

All API endpoints require authentication using JWT tokens provided by Supabase Auth.

### Authentication Header

```http
Authorization: Bearer <your-jwt-token>
```

### Getting an Access Token

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Sign in to get access token
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

const accessToken = data.session?.access_token
```

## API Structure

### Endpoint Categories

| Category | Base Path | Description |
|----------|-----------|-------------|
| Organizations | `/api/organizations` | Multi-tenant organization management |
| Content | `/api/content` | Content briefs, generation, and management |
| Clients | `/api/clients` | Client management and configuration |
| Integrations | `/api/integrations` | External API connections and health |
| Analytics | `/api/analytics` | Performance metrics and reporting |
| Cron Jobs | `/api/cron` | Scheduled background tasks |

### HTTP Methods

- **GET**: Retrieve data
- **POST**: Create new resources
- **PUT**: Update existing resources
- **DELETE**: Remove resources
- **PATCH**: Partial updates (where applicable)

## Response Format

### Success Response

```json
{
  "data": {
    // Response data
  },
  "message": "Success message (optional)"
}
```

### Error Response

```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    // Additional error context
  }
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

## Pagination

Large datasets are paginated using cursor-based pagination:

### Request Parameters

```http
GET /api/content/briefs?page=1&pageSize=20&sortBy=created_at&sortOrder=desc
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number (1-based) |
| `pageSize` | number | 20 | Items per page (max 100) |
| `sortBy` | string | created_at | Sort field |
| `sortOrder` | string | desc | Sort direction (asc/desc) |

### Response Format

```json
{
  "data": [
    // Array of items
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

## Filtering and Search

### Query Parameters

```http
GET /api/content/briefs?status=approved&clientId=123&search=keyword
```

### Common Filters

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Full-text search |
| `status` | string | Filter by status |
| `clientId` | string | Filter by client |
| `createdAfter` | ISO date | Created after date |
| `createdBefore` | ISO date | Created before date |

## Rate Limiting

API requests are rate-limited to ensure fair usage:

### Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Authentication | 10 requests | 1 minute |
| Content Generation | 5 requests | 1 minute |
| Data Retrieval | 100 requests | 1 minute |
| Integrations | 20 requests | 1 minute |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Rate Limit Exceeded Response

```json
{
  "error": "RateLimitExceeded",
  "message": "Too many requests. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 100,
    "window": 60,
    "retryAfter": 30
  }
}
```

## Webhooks

Content Command supports webhooks for real-time notifications:

### Supported Events

- `content.generated` - New content generated
- `brief.approved` - Content brief approved
- `integration.health_changed` - Integration status changed
- `client.created` - New client added

### Webhook Payload

```json
{
  "event": "content.generated",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "id": "content-id",
    "clientId": "client-id",
    "briefId": "brief-id",
    "status": "generated"
  },
  "organizationId": "org-id"
}
```

## SDK and Client Libraries

### JavaScript/TypeScript

```bash
npm install @contentcommand/sdk
```

```javascript
import { ContentCommandClient } from '@contentcommand/sdk'

const client = new ContentCommandClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://your-domain.com/api'
})

// Create content brief
const brief = await client.content.createBrief({
  title: 'SEO Best Practices 2024',
  targetKeyword: 'seo best practices',
  clientId: 'client-id'
})
```

### cURL Examples

#### Create Content Brief

```bash
curl -X POST https://your-domain.com/api/content/briefs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "SEO Best Practices 2024",
    "targetKeyword": "seo best practices",
    "clientId": "client-id"
  }'
```

#### Get Content Queue

```bash
curl -X GET "https://your-domain.com/api/content/queue?status=generated" \
  -H "Authorization: Bearer <token>"
```

## Error Handling

### Common Error Scenarios

#### Validation Errors

```json
{
  "error": "ValidationError",
  "message": "Invalid request data",
  "code": "VALIDATION_FAILED",
  "details": {
    "fields": {
      "targetKeyword": "Target keyword is required",
      "clientId": "Invalid client ID format"
    }
  }
}
```

#### Resource Not Found

```json
{
  "error": "NotFound",
  "message": "Content brief not found",
  "code": "RESOURCE_NOT_FOUND",
  "details": {
    "resource": "content_brief",
    "id": "invalid-id"
  }
}
```

#### Permission Denied

```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions to access this resource",
  "code": "PERMISSION_DENIED",
  "details": {
    "required": "client:read",
    "provided": "client:write"
  }
}
```

## API Versioning

The API uses URL-based versioning:

```
/api/v1/content/briefs  (current)
/api/v2/content/briefs  (future)
```

### Version Support

- **v1**: Current stable version
- **v2**: Future version (in development)

### Deprecation Policy

- New versions announced 90 days in advance
- Old versions supported for 12 months after deprecation
- Breaking changes only in major versions

## Testing and Development

### Sandbox Environment

Use the development environment for testing:

```
Base URL: http://localhost:3000/api
```

### API Testing Tools

#### Postman Collection

Import our Postman collection for easy API testing:

```bash
# Download collection
curl -o contentcommand-api.json https://your-domain.com/api/postman-collection
```

#### OpenAPI Specification

Access the OpenAPI spec at:

```
https://your-domain.com/api/openapi.json
```

### Example Integration

```javascript
// Complete example: Create brief and generate content
async function createAndGenerateContent() {
  try {
    // 1. Create content brief
    const brief = await fetch('/api/content/briefs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'AI Content Strategy',
        targetKeyword: 'ai content marketing',
        clientId: 'client-123'
      })
    }).then(res => res.json())

    // 2. Generate content
    const content = await fetch('/api/content/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        briefId: brief.data.id,
        model: 'gpt-4'
      })
    }).then(res => res.json())

    console.log('Content generated:', content.data)
  } catch (error) {
    console.error('API Error:', error)
  }
}
```

## Support and Resources

- [API Reference](./reference.md) - Complete endpoint documentation
- [Authentication Guide](./authentication.md) - Detailed auth setup
- [Integration Examples](./examples.md) - Code examples and use cases
- [Changelog](./changelog.md) - API version history
- [Status Page](https://status.your-domain.com) - API uptime and incidents
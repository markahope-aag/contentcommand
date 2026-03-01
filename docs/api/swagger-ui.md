# API Documentation with Swagger UI

This guide shows you how to explore and test the Content Command API using Swagger UI.

## Online Documentation

The interactive API documentation is available at:
- **Production**: https://contentcommand.vercel.app/api/docs
- **Development**: http://localhost:3000/api/docs

## Local Setup

### Option 1: Swagger UI Docker Container

Run Swagger UI locally with Docker:

```bash
# Pull and run Swagger UI
docker run -p 8080:8080 \
  -e SWAGGER_JSON=/app/openapi.yaml \
  -v $(pwd)/docs/api/openapi.yaml:/app/openapi.yaml \
  swaggerapi/swagger-ui

# Access at http://localhost:8080
```

### Option 2: Swagger Editor

Use the online Swagger Editor:

1. Go to https://editor.swagger.io/
2. Copy the contents of `docs/api/openapi.yaml`
3. Paste into the editor
4. Use the "Try it out" feature to test endpoints

### Option 3: VS Code Extension

Install the Swagger Viewer extension:

1. Install "Swagger Viewer" extension in VS Code
2. Open `docs/api/openapi.yaml`
3. Press `Shift+Alt+P` and select "Preview Swagger"

## Authentication Setup

To test authenticated endpoints:

1. **Get JWT Token**:
   ```bash
   # Login via the app or API
   curl -X POST https://contentcommand.vercel.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "your@email.com", "password": "yourpassword"}'
   ```

2. **Configure Authorization**:
   - Click the "Authorize" button in Swagger UI
   - Enter: `Bearer YOUR_JWT_TOKEN`
   - Click "Authorize"

3. **Test Endpoints**:
   - All authenticated endpoints will now include the Authorization header
   - Use "Try it out" to test API calls

## Common Use Cases

### 1. Content Creation Workflow

```bash
# 1. Create a content brief
POST /api/content/briefs
{
  "client_id": "uuid",
  "title": "SEO Best Practices 2024",
  "target_keyword": "seo best practices",
  "target_audience": "Digital marketers",
  "content_type": "blog_post",
  "target_word_count": 2000
}

# 2. Approve the brief
POST /api/content/briefs/{id}/approve

# 3. Generate content
POST /api/content/generate
{
  "briefId": "uuid",
  "model": "gpt-4",
  "temperature": 0.7
}

# 4. Review generated content
PUT /api/content/{id}/review
{
  "action": "approve",
  "reviewerNotes": "Great content!"
}
```

### 2. Client Management

```bash
# 1. Create organization
POST /api/organizations
{
  "name": "Acme Marketing",
  "slug": "acme-marketing"
}

# 2. Create client
POST /api/clients
{
  "name": "Tech Startup",
  "domain": "techstartup.com",
  "industry": "Technology",
  "org_id": "uuid"
}

# 3. List clients
GET /api/clients?orgId=uuid&page=1&pageSize=20
```

### 3. Integration Health Monitoring

```bash
# Check integration status
GET /api/integrations/health

# Sync integrations
POST /api/integrations/sync
{
  "provider": "dataforseo",
  "clientId": "uuid"
}
```

## Response Examples

### Success Response
```json
{
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Example Client",
    "domain": "example.com",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### Paginated Response
```json
{
  "data": [
    {"id": "uuid1", "name": "Client 1"},
    {"id": "uuid2", "name": "Client 2"}
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

### Error Response
```json
{
  "error": "ValidationError",
  "message": "Invalid request data",
  "code": "VALIDATION_FAILED",
  "details": {
    "fields": {
      "name": "Name is required",
      "email": "Invalid email format"
    }
  }
}
```

## Rate Limiting

The API implements rate limiting per endpoint category:

| Category | Limit | Window |
|----------|-------|--------|
| Authentication | 10 requests | 1 minute |
| Content Generation | 5 requests | 1 minute |
| Data Retrieval | 100 requests | 1 minute |
| Integrations | 20 requests | 1 minute |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Error Handling

All API errors follow a consistent format:

- **400 Bad Request**: Invalid input data or request format
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions for the resource
- **404 Not Found**: Resource does not exist
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Unexpected server error

## SDK and Code Generation

Generate client SDKs from the OpenAPI spec:

### JavaScript/TypeScript
```bash
npx @openapitools/openapi-generator-cli generate \
  -i docs/api/openapi.yaml \
  -g typescript-fetch \
  -o ./sdk/typescript
```

### Python
```bash
openapi-generator generate \
  -i docs/api/openapi.yaml \
  -g python \
  -o ./sdk/python
```

### cURL Examples
```bash
# Generate cURL examples
npx swagger-codegen generate \
  -i docs/api/openapi.yaml \
  -l bash \
  -o ./examples/curl
```

## Postman Collection

Import the OpenAPI spec into Postman:

1. Open Postman
2. Click "Import" → "Link"
3. Enter: `https://raw.githubusercontent.com/your-repo/main/docs/api/openapi.yaml`
4. Click "Import"

Or use the Postman collection generator:
```bash
npx openapi-to-postman \
  -s docs/api/openapi.yaml \
  -o docs/api/postman-collection.json
```

## Validation

Validate the OpenAPI specification:

```bash
# Install swagger-cli
npm install -g @apidevtools/swagger-cli

# Validate spec
swagger-cli validate docs/api/openapi.yaml

# Bundle spec (resolve $refs)
swagger-cli bundle docs/api/openapi.yaml -o docs/api/openapi-bundled.yaml
```

## Contributing

When adding new endpoints:

1. Update `docs/api/openapi.yaml` with new paths and schemas
2. Validate the spec: `swagger-cli validate docs/api/openapi.yaml`
3. Test in Swagger UI to ensure proper rendering
4. Update this documentation with examples
5. Generate updated SDK if needed

## Support

For API questions or issues:
- Check the [troubleshooting guide](../operations/troubleshooting.md)
- Review error responses in Swagger UI
- Contact support with specific endpoint and error details
# Quick Start Guide

Get up and running with Content Command in under 10 minutes.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account
- Vercel account (for deployment)

## 1. Clone and Install

```bash
git clone https://github.com/your-org/contentcommand.git
cd contentcommand
npm install
```

## 2. Environment Setup

Copy the environment template and configure your variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI API Keys
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Integration API Keys
DATAFORSEO_LOGIN=your_dataforseo_login
DATAFORSEO_PASSWORD=your_dataforseo_password
FRASE_API_KEY=your_frase_api_key

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Redis (optional, for caching)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

## 3. Database Setup

Run the database migrations to set up your schema:

```bash
# If using Supabase CLI
supabase db reset

# Or apply migrations manually through Supabase dashboard
```

The following tables will be created:
- `organizations` - Multi-tenant organization management
- `organization_members` - User roles and permissions
- `clients` - Client management
- `competitors` - Competitor tracking
- `content_briefs` - Content planning and briefs
- `generated_content` - AI-generated content storage
- `content_quality_analysis` - Quality scoring and feedback
- `ai_usage_tracking` - AI API usage and cost tracking
- `integration_health` - API integration monitoring
- `api_request_logs` - Request logging and debugging

## 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 5. Initial Setup

### Create Your First Organization

1. Sign up at `/signup` or login at `/login`
2. You'll be automatically redirected to create your first organization
3. Fill in your organization details

### Add Your First Client

1. Navigate to **Clients** in the sidebar
2. Click **Add Client**
3. Enter client details:
   - Name and domain
   - Industry and target keywords
   - Brand voice preferences

### Configure Integrations

1. Go to **Integrations** in the sidebar
2. Set up your API connections:
   - **DataForSEO**: For competitor analysis
   - **Frase**: For content analysis
   - **Google APIs**: For Search Console and Analytics data

## 6. Create Your First Content Brief

1. Navigate to **Content** → **Briefs**
2. Click **Create Brief**
3. Enter your target keyword and client
4. Let the AI generate competitive analysis and content strategy
5. Review and approve the brief

## 7. Generate Content

1. From your approved brief, click **Generate Content**
2. Choose your AI model preferences
3. Review the generated content and quality scores
4. Edit and refine as needed
5. Publish or export your content

## Next Steps

- [Dashboard Overview](../user-guides/dashboard.md) - Learn about the main interface
- [Client Management](../user-guides/clients.md) - Detailed client setup and management
- [Content Creation Workflow](../user-guides/content-creation.md) - Master the content creation process
- [Integration Setup](../user-guides/integrations.md) - Configure all available integrations

## Common Issues

### Database Connection Errors
- Verify your Supabase URL and keys are correct
- Check that RLS policies are properly configured
- Ensure your Supabase project is active

### API Integration Failures
- Verify all API keys are valid and have proper permissions
- Check rate limits and usage quotas
- Review the integration health dashboard

### Authentication Issues
- Confirm Google OAuth credentials if using social login
- Check Supabase Auth configuration
- Verify redirect URLs are properly configured

## Getting Help

- Check the [User Guides](../user-guides/) for detailed feature documentation
- Review [API Documentation](../api/) for integration details
- See [Troubleshooting Guide](../operations/troubleshooting.md) for common issues
- [Create an issue](https://github.com/your-org/contentcommand/issues) for bugs or feature requests
/**
 * Simplified unit tests for all 18 API endpoints
 * Focuses on core functionality without complex external dependencies
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */

// Mock all external dependencies first
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data: any, init?: ResponseInit) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
      headers: new Headers(init?.headers),
      data,
      init,
    })),
    redirect: jest.fn((url: string) => ({
      status: 302,
      headers: { Location: url },
    })),
  },
}))

jest.mock('@/lib/validations', () => ({
  validateBody: jest.fn(),
  briefGenerateSchema: {},
  contentGenerateSchema: {},
  contentScoreSchema: {},
  contentReviewSchema: {},
  createOrgSchema: {},
  memberSchema: {},
  dataforseoSchema: {},
  fraseSchema: {},
  llmrefsSchema: {},
  syncSchema: {},
}))

jest.mock('@/lib/ai/content-engine', () => ({
  generateBrief: jest.fn(),
  generateContent: jest.fn(),
  generateCompetitorInsights: jest.fn(),
}))

jest.mock('@/lib/ai/content-engine', () => ({
  generateBrief: jest.fn(),
  generateContent: jest.fn(),
  generateCompetitorInsights: jest.fn(),
  scoreContent: jest.fn(),
}))

jest.mock('@/lib/ai/quality-analyzer', () => ({
  scoreContent: jest.fn(),
}))

jest.mock('@/lib/content/workflow', () => ({
  transitionBriefStatus: jest.fn(),
  canTransition: jest.fn(),
}))

jest.mock('@/lib/integrations/dataforseo', () => ({
  dataForSEO: {
    getCompetitorKeywords: jest.fn(),
    getDomainMetrics: jest.fn(),
    getSerpResults: jest.fn(),
  },
}))

jest.mock('@/lib/integrations/frase', () => ({
  frase: {
    analyzeSerp: jest.fn(),
    analyzeUrl: jest.fn(),
    getSemanticKeywords: jest.fn(),
  },
}))

jest.mock('@/lib/integrations/llmrefs', () => ({
  getOrganizations: jest.fn(),
  getProjects: jest.fn(),
  getKeywords: jest.fn(),
  getKeywordDetail: jest.fn(),
  getSearchEngines: jest.fn(),
  getLocations: jest.fn(),
}))

jest.mock('@/lib/integrations/google', () => ({
  googleAuth: {
    getAuthUrl: jest.fn(),
    handleCallback: jest.fn(),
  },
}))

jest.mock('@/lib/integrations/health', () => ({
  checkIntegrationHealth: jest.fn(),
}))

// Mock the rate limiting and base classes
jest.mock('@/lib/integrations/base', () => ({
  RateLimitError: class RateLimitError extends Error {
    retryAfter: number
    constructor(retryAfter: number = 60) {
      super('Rate limit exceeded')
      this.retryAfter = retryAfter
    }
  },
}))

import { createMockRequest } from '@/lib/test-utils/api-test-framework'

const { createClient } = require('@/lib/supabase/server')
const { validateBody } = require('@/lib/validations')
const { NextResponse } = require('next/server')

// Test data
const testData = {
  validUuid: '123e4567-e89b-12d3-a456-426614174000',
  user: { id: 'test-user', email: 'test@example.com' },
  briefData: { clientId: '123e4567-e89b-12d3-a456-426614174000', targetKeyword: 'test', contentType: 'blog' },
  orgData: { name: 'Test Org', slug: 'test-org' },
}

function createMockSupabaseClient(overrides: any = {}) {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: testData.user },
        error: null,
      }),
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
    ...overrides,
  }
}

describe('API Endpoints Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Content Management APIs', () => {
    it('POST /api/content/briefs/generate - generates brief successfully', async () => {
      const mockClient = createMockSupabaseClient()
      createClient.mockResolvedValue(mockClient)
      
      validateBody.mockReturnValue({
        success: true,
        data: testData.briefData,
      })

      const { generateBrief } = require('@/lib/ai/content-engine')
      generateBrief.mockResolvedValue({ id: 'brief-123', title: 'Test Brief' })

      // Import the route handler after mocks are set up
      const { POST } = require('../content/briefs/generate/route')
      
      const request = createMockRequest({
        method: 'POST',
        body: testData.briefData,
      })

      await POST(request)

      expect(mockClient.rpc).toHaveBeenCalledWith('user_has_client_access', {
        check_client_id: testData.briefData.clientId,
      })
      expect(generateBrief).toHaveBeenCalledWith(testData.briefData)
      expect(NextResponse.json).toHaveBeenCalledWith({ 
        data: { id: 'brief-123', title: 'Test Brief' }
      })
    })

    it('POST /api/content/generate - generates content successfully', async () => {
      const mockClient = createMockSupabaseClient({
        single: jest.fn().mockResolvedValue({
          data: { status: 'approved', client_id: testData.validUuid },
          error: null,
        }),
      })
      createClient.mockResolvedValue(mockClient)
      
      validateBody.mockReturnValue({
        success: true,
        data: { briefId: testData.validUuid, model: 'claude' },
      })

      const { generateContent } = require('@/lib/ai/content-engine')
      generateContent.mockResolvedValue({ id: 'content-123', title: 'Generated Content' })

      const { POST } = require('../content/generate/route')
      
      const request = createMockRequest({
        method: 'POST',
        body: { briefId: testData.validUuid, model: 'claude' },
      })

      await POST(request)

      expect(generateContent).toHaveBeenCalled()
      expect(NextResponse.json).toHaveBeenCalledWith({ 
        data: { id: 'content-123', title: 'Generated Content' }
      })
    })

    it('POST /api/content/score - scores content successfully', async () => {
      const mockClient = createMockSupabaseClient({
        single: jest.fn().mockResolvedValue({
          data: { 
            client_id: testData.validUuid,
          },
          error: null,
        }),
      })
      createClient.mockResolvedValue(mockClient)
      
      validateBody.mockReturnValue({
        success: true,
        data: { contentId: testData.validUuid },
      })

      const { scoreContent } = require('@/lib/ai/content-engine')
      scoreContent.mockResolvedValue({ overall_score: 85, seo_score: 90 })

      const { POST } = require('../content/score/route')
      
      const request = createMockRequest({
        method: 'POST',
        body: { contentId: testData.validUuid },
      })

      await POST(request)

      expect(scoreContent).toHaveBeenCalledWith(testData.validUuid)
      expect(NextResponse.json).toHaveBeenCalledWith({ 
        data: { overall_score: 85, seo_score: 90 }
      })
    })

    it('GET /api/content/queue - returns content queue', async () => {
      const mockQueue = [
        { id: '1', status: 'generating', priority: 'high' },
        { id: '2', status: 'reviewing', priority: 'medium' },
      ]

      const mockClient = createMockSupabaseClient({
        order: jest.fn().mockResolvedValue({
          data: mockQueue,
          error: null,
        }),
      })
      createClient.mockResolvedValue(mockClient)

      const { GET } = require('../content/queue/route')
      
      const request = createMockRequest({ method: 'GET' })

      await GET(request)

      expect(mockClient.from).toHaveBeenCalledWith('generated_content')
      expect(NextResponse.json).toHaveBeenCalledWith({ data: mockQueue })
    })
  })

  describe('Organization Management APIs', () => {
    it('GET /api/organizations - returns organizations', async () => {
      const mockOrgs = [
        { id: testData.validUuid, name: 'Test Org', slug: 'test-org' },
      ]

      const mockClient = createMockSupabaseClient({
        order: jest.fn().mockResolvedValue({
          data: mockOrgs,
          error: null,
        }),
      })
      createClient.mockResolvedValue(mockClient)

      const { GET } = require('../organizations/route')
      
      const request = createMockRequest({ method: 'GET' })

      await GET()

      expect(mockClient.from).toHaveBeenCalledWith('organizations')
      expect(NextResponse.json).toHaveBeenCalledWith({ data: mockOrgs })
    })

    it('POST /api/organizations - creates organization', async () => {
      const mockClient = createMockSupabaseClient({
        rpc: jest.fn().mockResolvedValue({
          data: testData.validUuid,
          error: null,
        }),
      })
      createClient.mockResolvedValue(mockClient)
      
      validateBody.mockReturnValue({
        success: true,
        data: testData.orgData,
      })

      const { POST } = require('../organizations/route')
      
      const request = createMockRequest({
        method: 'POST',
        body: testData.orgData,
      })

      await POST(request)

      expect(mockClient.rpc).toHaveBeenCalledWith('create_org_with_owner', {
        org_name: testData.orgData.name,
        org_slug: testData.orgData.slug,
      })
      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: { id: testData.validUuid } },
        { status: 201 }
      )
    })

    it('POST /api/organizations/[id]/members - adds member', async () => {
      const mockClient = createMockSupabaseClient({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'member-123', org_id: testData.validUuid, user_id: testData.validUuid, role: 'member' },
          error: null,
        }),
      })
      createClient.mockResolvedValue(mockClient)
      
      validateBody.mockReturnValue({
        success: true,
        data: { userId: testData.validUuid, role: 'member' },
      })

      const { POST } = require('../organizations/[id]/members/route')
      
      const request = createMockRequest({
        method: 'POST',
        body: { userId: testData.validUuid, role: 'member' },
      })

      await POST(request, { params: Promise.resolve({ id: testData.validUuid }) })

      expect(mockClient.from).toHaveBeenCalledWith('organization_members')
      expect(mockClient.insert).toHaveBeenCalledWith({
        org_id: testData.validUuid,
        user_id: testData.validUuid,
        role: 'member',
      })
      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: { id: 'member-123', org_id: testData.validUuid, user_id: testData.validUuid, role: 'member' } },
        { status: 201 }
      )
    })
  })

  describe('Integration APIs', () => {
    it('POST /api/integrations/dataforseo/competitors - fetches competitor data', async () => {
      const mockClient = createMockSupabaseClient()
      createClient.mockResolvedValue(mockClient)
      
      validateBody.mockReturnValue({
        success: true,
        data: {
          clientId: testData.validUuid,
          domain: 'example.com',
          type: 'keywords',
          competitorDomain: 'competitor.com',
        },
      })

      const { dataForSEO } = require('@/lib/integrations/dataforseo')
      dataForSEO.getCompetitorKeywords.mockResolvedValue({
        keywords: [{ keyword: 'test', volume: 1000 }],
      })

      const { POST } = require('../integrations/dataforseo/competitors/route')
      
      const request = createMockRequest({
        method: 'POST',
        body: {
          clientId: testData.validUuid,
          domain: 'example.com',
          type: 'keywords',
          competitorDomain: 'competitor.com',
        },
      })

      await POST(request)

      expect(dataForSEO.getCompetitorKeywords).toHaveBeenCalledWith(
        'example.com',
        'competitor.com',
        testData.validUuid
      )
      expect(NextResponse.json).toHaveBeenCalledWith({ 
        data: { keywords: [{ keyword: 'test', volume: 1000 }] }
      })
    })

    it('POST /api/integrations/frase/content-analysis - analyzes content', async () => {
      const mockClient = createMockSupabaseClient()
      createClient.mockResolvedValue(mockClient)
      
      validateBody.mockReturnValue({
        success: true,
        data: {
          clientId: testData.validUuid,
          type: 'serp',
          query: 'test query',
        },
      })

      const { frase } = require('@/lib/integrations/frase')
      frase.analyzeSerp.mockResolvedValue({
        score: 85,
        suggestions: ['Add more headings'],
      })

      const { POST } = require('../integrations/frase/content-analysis/route')
      
      const request = createMockRequest({
        method: 'POST',
        body: {
          clientId: testData.validUuid,
          type: 'serp',
          query: 'test query',
        },
      })

      await POST(request)

      expect(frase.analyzeSerp).toHaveBeenCalledWith('test query', testData.validUuid)
      expect(NextResponse.json).toHaveBeenCalledWith({ 
        data: { score: 85, suggestions: ['Add more headings'] }
      })
    })

    it('POST /api/integrations/llmrefs - fetches LLMRefs data', async () => {
      const mockClient = createMockSupabaseClient()
      createClient.mockResolvedValue(mockClient)
      
      validateBody.mockReturnValue({
        success: true,
        data: { type: 'organizations' },
      })

      const { getOrganizations } = require('@/lib/integrations/llmrefs')
      getOrganizations.mockResolvedValue([
        { id: 'org-1', name: 'Test Org' },
      ])

      const { POST } = require('../integrations/llmrefs/route')
      
      const request = createMockRequest({
        method: 'POST',
        body: { type: 'organizations' },
      })

      await POST(request)

      expect(getOrganizations).toHaveBeenCalled()
      expect(NextResponse.json).toHaveBeenCalledWith({ 
        data: [{ id: 'org-1', name: 'Test Org' }]
      })
    })

    it('GET /api/integrations/health - returns health status', async () => {
      const mockHealthData = [
        { provider: 'dataforseo', status: 'healthy' },
        { provider: 'frase', status: 'healthy' },
      ]

      const mockClient = createMockSupabaseClient({
        order: jest.fn().mockResolvedValue({
          data: mockHealthData,
          error: null,
        }),
      })
      createClient.mockResolvedValue(mockClient)

      const { GET } = require('../integrations/health/route')

      await GET()

      expect(mockClient.from).toHaveBeenCalledWith('integration_health')
      expect(NextResponse.json).toHaveBeenCalledWith({ 
        data: mockHealthData
      })
    })

    it('GET /api/integrations/google/auth - generates auth URL', async () => {
      const mockClient = createMockSupabaseClient()
      createClient.mockResolvedValue(mockClient)

      const { googleAuth } = require('@/lib/integrations/google')
      googleAuth.getAuthUrl.mockReturnValue('https://accounts.google.com/oauth/authorize')

      const { GET } = require('../integrations/google/auth/route')
      
      const request = createMockRequest({ 
        method: 'GET',
        searchParams: { clientId: testData.validUuid }
      })

      await GET(request)

      expect(googleAuth.getAuthUrl).toHaveBeenCalledWith(testData.validUuid)
      expect(NextResponse.json).toHaveBeenCalledWith({
        url: 'https://accounts.google.com/oauth/authorize'
      })
    })

    it('GET /api/integrations/google/callback - handles OAuth callback', async () => {
      const mockClient = createMockSupabaseClient({
        from: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockResolvedValue({ data: { id: 'integration-123' }, error: null }),
      })
      createClient.mockResolvedValue(mockClient)

      const { googleAuth } = require('@/lib/integrations/google')
      googleAuth.handleCallback.mockResolvedValue({
        tokens: { access_token: 'token123', refresh_token: 'refresh123' },
        userInfo: { id: 'google123', email: 'test@example.com' },
      })

      const { GET } = require('../integrations/google/callback/route')
      
      const request = createMockRequest({
        method: 'GET',
        searchParams: { code: 'auth_code', state: 'csrf_state' },
      })

      await GET(request)

      expect(googleAuth.handleCallback).toHaveBeenCalledWith('auth_code', 'csrf_state')
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('/dashboard/integrations?success=google-connected')
        })
      )
    })
  })

  describe('Authentication and Authorization', () => {
    it('returns 401 for unauthenticated requests', async () => {
      const mockClient = createMockSupabaseClient({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Not authenticated'),
          }),
        },
      })
      createClient.mockResolvedValue(mockClient)

      const { POST } = require('../content/briefs/generate/route')
      
      const request = createMockRequest({
        method: 'POST',
        body: testData.briefData,
      })

      await POST(request)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    })

    it('returns 403 for insufficient permissions', async () => {
      const mockClient = createMockSupabaseClient({
        rpc: jest.fn().mockResolvedValue({ data: false, error: null }),
      })
      createClient.mockResolvedValue(mockClient)
      
      validateBody.mockReturnValue({
        success: true,
        data: testData.briefData,
      })

      const { POST } = require('../content/briefs/generate/route')
      
      const request = createMockRequest({
        method: 'POST',
        body: testData.briefData,
      })

      await POST(request)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Access denied' },
        { status: 403 }
      )
    })
  })

  describe('Error Handling', () => {
    it('handles validation errors', async () => {
      const mockClient = createMockSupabaseClient()
      createClient.mockResolvedValue(mockClient)

      const mockValidationResponse = {
        json: () => Promise.resolve({ error: 'Validation failed' }),
        status: 400,
      }
      validateBody.mockReturnValue({
        success: false,
        response: mockValidationResponse,
      })

      const { POST } = require('../content/briefs/generate/route')
      
      const request = createMockRequest({
        method: 'POST',
        body: { invalid: 'data' },
      })

      const result = await POST(request)
      expect(result).toBe(mockValidationResponse)
    })

    it('handles rate limiting', async () => {
      const mockClient = createMockSupabaseClient()
      createClient.mockResolvedValue(mockClient)
      
      validateBody.mockReturnValue({
        success: true,
        data: testData.briefData,
      })

      const { RateLimitError } = require('@/lib/integrations/base')
      const { generateBrief } = require('@/lib/ai/content-engine')
      generateBrief.mockRejectedValue(new RateLimitError(120))

      const { POST } = require('../content/briefs/generate/route')
      
      const request = createMockRequest({
        method: 'POST',
        body: testData.briefData,
      })

      await POST(request)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Rate limit exceeded', retryAfter: 120 },
        { status: 429 }
      )
    })

    it('handles internal server errors', async () => {
      const mockClient = createMockSupabaseClient()
      createClient.mockResolvedValue(mockClient)
      
      validateBody.mockReturnValue({
        success: true,
        data: testData.briefData,
      })

      const { generateBrief } = require('@/lib/ai/content-engine')
      generateBrief.mockRejectedValue(new Error('Internal service error'))

      const { POST } = require('../content/briefs/generate/route')
      
      const request = createMockRequest({
        method: 'POST',
        body: testData.briefData,
      })

      await POST(request)

      expect(console.error).toHaveBeenCalledWith(
        'Brief generation error:',
        expect.any(Error)
      )
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Internal server error' },
        { status: 500 }
      )
    })
  })
})
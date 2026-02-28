/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-function-type */
/**
 * Comprehensive API testing framework for Content Command
 * Provides utilities for testing all 18 API endpoints with authentication and mocking
 */

import { NextRequest, NextResponse } from 'next/server'

// Enhanced mock for Supabase client with all required methods
export function createMockSupabaseClient(overrides: any = {}) {
  const defaultClient = {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
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
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
  }

  return {
    ...defaultClient,
    ...overrides,
  }
}

// Mock for NextResponse with proper typing
export const mockNextResponse = {
  json: jest.fn((data: any, init?: ResponseInit) => ({
    json: () => Promise.resolve(data),
    status: init?.status || 200,
    headers: new Headers(init?.headers),
    data,
    init,
  })),
}

// Mock Request builder with proper headers and body
export function createMockRequest(options: {
  method?: string
  body?: any
  headers?: Record<string, string>
  url?: string
  searchParams?: Record<string, string>
} = {}) {
  const {
    method = 'GET',
    body = null,
    headers = {},
    url = 'http://localhost:3000/api/test',
    searchParams = {}
  } = options

  const mockUrl = new URL(url)
  Object.entries(searchParams).forEach(([key, value]) => {
    mockUrl.searchParams.set(key, value)
  })

  return {
    method,
    headers: new Headers(headers),
    url: mockUrl.toString(),
    nextUrl: mockUrl,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest
}

// Authentication scenarios for testing
export const authScenarios = {
  authenticated: {
    user: { id: 'test-user-id', email: 'test@example.com' },
    error: null,
  },
  unauthenticated: {
    user: null,
    error: new Error('Not authenticated'),
  },
  invalidToken: {
    user: null,
    error: new Error('Invalid token'),
  },
}

// Test data factories
export const testDataFactory = {
  validUuid: '123e4567-e89b-12d3-a456-426614174000',
  
  briefGenerateRequest: {
    clientId: '123e4567-e89b-12d3-a456-426614174000',
    targetKeyword: 'content marketing',
    contentType: 'blog post',
  },

  contentGenerateRequest: {
    briefId: '123e4567-e89b-12d3-a456-426614174000',
    model: 'claude' as const,
  },

  contentScoreRequest: {
    contentId: '123e4567-e89b-12d3-a456-426614174000',
  },

  contentReviewRequest: {
    action: 'approve' as const,
    reviewerNotes: 'Looks good to publish',
    reviewTimeMinutes: 15,
  },

  organizationRequest: {
    name: 'Test Organization',
    slug: 'test-organization',
  },

  memberRequest: {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    role: 'member' as const,
  },

  dataforseoKeywordsRequest: {
    clientId: '123e4567-e89b-12d3-a456-426614174000',
    domain: 'example.com',
    type: 'keywords' as const,
    competitorDomain: 'competitor.com',
  },

  dataforseoDomainRequest: {
    clientId: '123e4567-e89b-12d3-a456-426614174000',
    domain: 'example.com',
    type: 'domain_metrics' as const,
  },

  dataforseoSerpRequest: {
    clientId: '123e4567-e89b-12d3-a456-426614174000',
    domain: 'example.com',
    type: 'serp' as const,
    keyword: 'test keyword',
  },

  fraseSerpRequest: {
    clientId: '123e4567-e89b-12d3-a456-426614174000',
    type: 'serp' as const,
    query: 'content marketing',
  },

  fraseUrlRequest: {
    clientId: '123e4567-e89b-12d3-a456-426614174000',
    type: 'url' as const,
    url: 'https://example.com/article',
  },

  llmrefsOrgsRequest: {
    type: 'organizations' as const,
  },

  llmrefsProjectsRequest: {
    type: 'projects' as const,
    organizationId: 'org-123',
  },

  syncRequest: {
    clientId: '123e4567-e89b-12d3-a456-426614174000',
    provider: 'dataforseo' as const,
  },

  googleAuthRequest: {
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  },
}

// Mock external service responses
export const mockServiceResponses = {
  generateBrief: {
    id: 'brief-123',
    title: 'Generated Brief Title',
    target_keyword: 'content marketing',
    status: 'draft',
    client_id: '123e4567-e89b-12d3-a456-426614174000',
    created_at: new Date().toISOString(),
  },

  generateContent: {
    id: 'content-123',
    title: 'Generated Content Title',
    content: 'This is the generated content body...',
    word_count: 1500,
    brief_id: '123e4567-e89b-12d3-a456-426614174000',
    created_at: new Date().toISOString(),
  },

  scoreContent: {
    id: 'score-123',
    content_id: '123e4567-e89b-12d3-a456-426614174000',
    overall_score: 85,
    seo_score: 90,
    readability_score: 80,
    authority_score: 85,
    engagement_score: 88,
    aeo_score: 82,
    created_at: new Date().toISOString(),
  },

  organizationList: [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Organization',
      slug: 'test-organization',
      created_at: new Date().toISOString(),
    },
  ],

  dataforseoKeywords: {
    keywords: [
      { keyword: 'content marketing', search_volume: 10000, difficulty: 65 },
      { keyword: 'digital marketing', search_volume: 8000, difficulty: 70 },
    ],
    total_count: 2,
  },

  dataforseoDomainMetrics: {
    domain: 'example.com',
    domain_rank: 1000,
    organic_keywords: 5000,
    organic_traffic: 50000,
  },

  dataforseoSerp: {
    keyword: 'test keyword',
    results: [
      { position: 1, url: 'https://example.com', title: 'Best Content Marketing Guide' },
      { position: 2, url: 'https://competitor.com', title: 'Content Marketing Tips' },
    ],
  },

  fraseAnalysis: {
    query: 'content marketing',
    content_score: 85,
    readability_score: 78,
    suggestions: ['Add more headings', 'Include statistics'],
  },

  llmrefsOrganizations: [
    { id: 'org-1', name: 'Test Org 1' },
    { id: 'org-2', name: 'Test Org 2' },
  ],

  googleAuthUrl: 'https://accounts.google.com/oauth/authorize?client_id=test&redirect_uri=test',

  integrationHealth: [
    { provider: 'dataforseo', status: 'healthy', last_check: new Date().toISOString() },
    { provider: 'frase', status: 'healthy', last_check: new Date().toISOString() },
    { provider: 'llmrefs', status: 'healthy', last_check: new Date().toISOString() },
  ],
}

// Rate limit error for testing
export class MockRateLimitError extends Error {
  retryAfter: number
  
  constructor(retryAfter: number = 60) {
    super('Rate limit exceeded')
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

// Test helper for setting up common mocks
export function setupCommonMocks() {
  // Mock console.error to avoid noise in tests
  jest.spyOn(console, 'error').mockImplementation(() => {})
  
  // Mock external services
  jest.mock('@/lib/ai/content-engine', () => ({
    generateBrief: jest.fn(),
    generateContent: jest.fn(),
  }))

  jest.mock('@/lib/ai/quality-analyzer', () => ({
    scoreContent: jest.fn(),
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
      analyzeSerpContent: jest.fn(),
      analyzeUrl: jest.fn(),
      getSemanticKeywords: jest.fn(),
    },
  }))

  jest.mock('@/lib/integrations/llmrefs', () => ({
    llmrefs: {
      getOrganizations: jest.fn(),
      getProjects: jest.fn(),
      getKeywords: jest.fn(),
    },
  }))

  jest.mock('@/lib/integrations/google', () => ({
    googleAuth: {
      getAuthUrl: jest.fn(),
      handleCallback: jest.fn(),
    },
  }))
}

// Test helper for API endpoint testing
export async function testApiEndpoint(
  handler: Function,
  request: NextRequest,
  expectedStatus: number,
  expectedResponse?: any
) {
  const response = await handler(request)
  
  expect(mockNextResponse.json).toHaveBeenCalledWith(
    expectedResponse ? expect.objectContaining(expectedResponse) : expect.any(Object),
    expectedStatus !== 200 ? { status: expectedStatus } : undefined
  )
  
  return response
}

// Permission testing helper
export function createPermissionTest(
  hasAccess: boolean,
  clientId: string = testDataFactory.validUuid
) {
  return {
    rpc: jest.fn().mockResolvedValue({ data: hasAccess, error: null }),
    mockCall: {
      function: 'user_has_client_access',
      params: { check_client_id: clientId },
    },
  }
}
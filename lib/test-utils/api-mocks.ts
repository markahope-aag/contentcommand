/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Test utilities for mocking API dependencies
 */

// Mock Supabase client builder
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
    rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
  }

  return {
    ...defaultClient,
    ...overrides,
  }
}

// Mock NextResponse for consistent testing
export const mockNextResponse = {
  json: jest.fn((data: any, init?: ResponseInit) => ({
    json: () => Promise.resolve(data),
    status: init?.status || 200,
    headers: new Headers(init?.headers),
    data,
    init,
  })),
}

// Mock Request object
export function createMockRequest(options: {
  method?: string
  body?: any
  headers?: Record<string, string>
  url?: string
} = {}) {
  const {
    method = 'GET',
    body = null,
    headers = {},
    url = 'http://localhost:3000/api/test'
  } = options

  return {
    method,
    headers: new Headers(headers),
    url,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Request
}

// Common test data
export const testData = {
  validUser: {
    id: 'test-user-id',
    email: 'test@example.com',
  },
  validClientId: '123e4567-e89b-12d3-a456-426614174000',
  validOrgId: '987e6543-e21b-43d2-a654-321098765432',
  validBrief: {
    id: 'brief-123',
    title: 'Test Brief',
    target_keyword: 'test keyword',
    status: 'draft',
    client_id: '123e4567-e89b-12d3-a456-426614174000',
  },
  validOrganization: {
    id: '987e6543-e21b-43d2-a654-321098765432',
    name: 'Test Organization',
    slug: 'test-org',
    created_at: '2024-01-01T00:00:00Z',
  },
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
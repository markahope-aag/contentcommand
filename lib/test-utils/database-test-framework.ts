/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Database Testing Framework
 * Utilities for testing database operations, RLS policies, and transactions
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Organization,
  Client,
  ContentBrief,
  GeneratedContent,
  OrganizationMember,
  Competitor
} from '@/types/database'

// Test user credentials for authentication testing
export const TEST_USERS = {
  owner: {
    email: 'owner@test.com',
    password: 'testpassword123',
    id: '00000000-0000-0000-0000-000000000001',
  },
  admin: {
    email: 'admin@test.com',
    password: 'testpassword123',
    id: '00000000-0000-0000-0000-000000000002',
  },
  member: {
    email: 'member@test.com',
    password: 'testpassword123',
    id: '00000000-0000-0000-0000-000000000003',
  },
  unauthorized: {
    email: 'unauthorized@test.com',
    password: 'testpassword123',
    id: '00000000-0000-0000-0000-000000000004',
  },
} as const

// Mock Supabase client for testing
export function createMockSupabaseClient(): jest.Mocked<SupabaseClient> {
  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockReturnThis(),
    then: jest.fn(),
  }

  return {
    from: jest.fn().mockReturnValue(mockQueryBuilder),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    rpc: jest.fn().mockReturnThis(),
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      refreshSession: jest.fn(),
      signUp: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      mfa: {
        challenge: jest.fn(),
        verify: jest.fn(),
      },
    },
    channel: jest.fn(),
    removeChannel: jest.fn(),
    removeAllChannels: jest.fn(),
    getChannels: jest.fn(),
  } as any
}

// Test data factories
export const testDataFactory = {
  organization: (overrides: Partial<Organization> = {}): Organization => ({
    id: 'org-test-id',
    name: 'Test Organization',
    slug: 'test-org',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }),

  organizationMember: (overrides: Partial<OrganizationMember> = {}): OrganizationMember => ({
    id: 'member-test-id',
    org_id: 'org-test-id',
    user_id: TEST_USERS.owner.id,
    role: 'owner',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }),

  client: (overrides: Partial<Client> = {}): Client => ({
    id: 'client-test-id',
    name: 'Test Client',
    domain: 'testclient.com',
    industry: 'Technology',
    target_keywords: ['test', 'keywords'],
    brand_voice: { tone: 'professional' },
    org_id: 'org-test-id',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }),

  competitor: (overrides: Partial<Competitor> = {}): Competitor => ({
    id: 'competitor-test-id',
    client_id: 'client-test-id',
    domain: 'competitor.com',
    name: 'Test Competitor',
    competitive_strength: 8.5,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }),

  contentBrief: (overrides: Partial<ContentBrief> = {}): ContentBrief => ({
    id: 'brief-test-id',
    client_id: 'client-test-id',
    title: 'Test Content Brief',
    target_keyword: 'test keyword',
    competitive_gap: 'Test gap analysis',
    unique_angle: 'Test unique angle',
    ai_citation_opportunity: 'Test citation opportunity',
    status: 'draft',
    content_requirements: { wordCount: 1000 },
    created_at: '2024-01-01T00:00:00Z',
    target_audience: 'Test audience',
    content_type: 'blog_post',
    competitive_gap_analysis: { gaps: ['gap1', 'gap2'] },
    ai_citation_opportunity_data: { opportunities: ['opp1', 'opp2'] },
    serp_content_analysis: 'Test SERP analysis',
    authority_signals: 'Test authority signals',
    controversial_positions: 'Test controversial positions',
    target_word_count: 1000,
    required_sections: ['introduction', 'conclusion'],
    semantic_keywords: ['semantic1', 'semantic2'],
    internal_links: ['link1', 'link2'],
    client_voice_profile: { tone: 'professional' },
    priority_level: 'high',
    updated_at: '2024-01-01T00:00:00Z',
    approved_at: null,
    approved_by: null,
    ...overrides,
  }),

  generatedContent: (overrides: Partial<GeneratedContent> = {}): GeneratedContent => ({
    id: 'content-test-id',
    brief_id: 'brief-test-id',
    content: 'Test generated content',
    quality_score: 85,
    seo_optimizations: { keywords: ['test'] },
    ai_citations_ready: true,
    word_count: 1000,
    status: 'generated',
    created_at: '2024-01-01T00:00:00Z',
    client_id: 'client-test-id',
    title: 'Test Content Title',
    meta_description: 'Test meta description',
    excerpt: 'Test excerpt',
    ai_model_used: 'gpt-4',
    generation_prompt: 'Test prompt',
    generation_time_seconds: 30,
    authority_score: 8.5,
    expertise_score: 9.0,
    readability_score: 7.5,
    optimization_score: 8.0,
    aeo_optimizations: { optimizations: ['test'] },
    internal_links_added: ['link1'],
    external_references: ['ref1'],
    predicted_seo_impact: { impact: 'high' },
    predicted_ai_citations: { citations: 5 },
    competitive_advantage_score: 8.5,
    human_review_time_minutes: null,
    reviewer_notes: null,
    revision_requests: null,
    reviewed_at: null,
    approved_at: null,
    ...overrides,
  }),
}

// Database query result mocks
export const mockQueryResults = {
  success: (data: any) => ({ data, error: null }),
  error: (message: string, code?: string) => ({
    data: null,
    error: { message, code: code || 'PGRST301' }
  }),
  empty: () => ({ data: [], error: null }),
  single: (data: any) => ({ data, error: null }),
  notFound: () => ({
    data: null,
    error: { message: 'No rows found', code: 'PGRST116' }
  }),
}

// RLS policy testing helpers
export const rlsTestHelpers = {
  expectAuthorized: async (queryFn: () => Promise<any>) => {
    const result = await queryFn()
    expect(result.error).toBeNull()
    expect(result.data).toBeDefined()
    return result.data
  },

  expectUnauthorized: async (queryFn: () => Promise<any>) => {
    const result = await queryFn()
    expect(result.error).toBeTruthy()
    expect(result.data).toBeNull()
    return result.error
  },

  expectFiltered: async (queryFn: () => Promise<any>) => {
    const result = await queryFn()
    expect(result.error).toBeNull()
    expect(result.data).toEqual([])
    return result.data
  },
}

// Transaction testing helpers
export const transactionTestHelpers = {
  mockSuccessfulTransaction: (mockClient: jest.Mocked<SupabaseClient>, results: any[]) => {
    results.forEach((result) => {
      mockClient.from.mockReturnValueOnce({
        ...(mockClient.from as any)(),
        ...result,
      } as any)
    })
  },

  mockFailedTransaction: (mockClient: jest.Mocked<SupabaseClient>, errorAtStep: number) => {
    for (let i = 0; i < errorAtStep; i++) {
      mockClient.from.mockReturnValueOnce({
        ...(mockClient.from as any)(),
        ...mockQueryResults.success({}),
      } as any)
    }
    mockClient.from.mockReturnValueOnce({
      ...(mockClient.from as any)(),
      ...mockQueryResults.error('Transaction failed'),
    } as any)
  },
}

// Authentication testing helpers
export const authTestHelpers = {
  mockAuthenticatedUser: (mockClient: jest.Mocked<SupabaseClient>, userId: string) => {
    (mockClient.auth.getUser as any).mockResolvedValue({
      data: {
        user: {
          id: userId,
          email: `${userId}@test.com`,
          aud: 'authenticated',
          role: 'authenticated',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        }
      },
      error: null,
    })
  },

  mockUnauthenticatedUser: (mockClient: jest.Mocked<SupabaseClient>) => {
    (mockClient.auth.getUser as any).mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated', name: 'AuthError' },
    })
  },

  mockSignInSuccess: (mockClient: jest.Mocked<SupabaseClient>, user: typeof TEST_USERS.owner) => {
    (mockClient.auth.signInWithPassword as any).mockResolvedValue({
      data: {
        user: {
          id: user.id,
          email: user.email,
          aud: 'authenticated',
          role: 'authenticated',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        session: {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: user.id,
            email: user.email,
            aud: 'authenticated',
            role: 'authenticated',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        },
      },
      error: null,
    })
  },

  mockSignInFailure: (mockClient: jest.Mocked<SupabaseClient>, message = 'Invalid credentials') => {
    (mockClient.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: null, session: null },
      error: { message, name: 'AuthError' },
    })
  },
}

// Cache testing helpers
export const cacheTestHelpers = {
  mockCacheHit: (key: string, data: any) => {
    return { key, data, hit: true }
  },

  mockCacheMiss: (key: string) => {
    return { key, data: null, hit: false }
  },
}

// Database migration testing helpers
export const migrationTestHelpers = {
  expectTableExists: async (adminClient: SupabaseClient, tableName: string) => {
    const { data, error } = await adminClient
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', tableName)
      .eq('table_schema', 'public')

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect((data as any[])[0].table_name).toBe(tableName)
  },

  expectColumnExists: async (
    adminClient: SupabaseClient,
    tableName: string,
    columnName: string,
    dataType?: string
  ) => {
    const { data, error } = await adminClient
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', tableName)
      .eq('column_name', columnName)
      .eq('table_schema', 'public')

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect((data as any[])[0].column_name).toBe(columnName)
    if (dataType) {
      expect((data as any[])[0].data_type).toBe(dataType)
    }
  },

  expectIndexExists: async (adminClient: SupabaseClient, indexName: string) => {
    const { data, error } = await adminClient
      .from('pg_indexes')
      .select('indexname')
      .eq('indexname', indexName)
      .eq('schemaname', 'public')

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect((data as any[])[0].indexname).toBe(indexName)
  },

  expectRLSEnabled: async (adminClient: SupabaseClient, tableName: string) => {
    const { data, error } = await adminClient
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('tablename', tableName)
      .eq('schemaname', 'public')

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect((data as any[])[0].rowsecurity).toBe(true)
  },
}

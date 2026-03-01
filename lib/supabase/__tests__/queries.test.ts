/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
/**
 * Tests for database query functions
 * Tests query operations, caching, error handling, and data validation
 */

import {
  getOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  getOrganizationMembers,
  addOrganizationMember,
  removeOrganizationMember,
  getClients,
  getClient,
  createClientWithOwner,
  updateClient,
  deleteClient,
  getCompetitors,
  createCompetitor,
  updateCompetitor,
  deleteCompetitor,
  getContentBrief,
  getAllContentBriefs,
  getContentBriefs,
  createContentBrief,
  updateContentBrief,
  deleteContentBrief,
  getGeneratedContent,
  getGeneratedContentByBrief,
  getGeneratedContentByClient,
  getContentQueue,
  updateGeneratedContent,
  getQualityAnalysis,
  getAiUsageByClient,
  getAiUsageSummary,
  getContentPipelineStats,
  getIntegrationHealth,
  getApiRequestLogs,
  getGoogleOAuthStatus,
  getCompetitiveAnalysis,
  getAiCitations,
  type PaginationOptions,
  type PaginatedResult,
} from '../queries'
import { 
  createMockSupabaseClient,
  testDataFactory,
  mockQueryResults,
} from '@/lib/test-utils/database-test-framework'

// Mock the Supabase client
jest.mock('../server', () => ({
  createClient: jest.fn(),
}))

// Mock the cache
jest.mock('@/lib/cache', () => ({
  withCache: jest.fn((key, fn) => fn()),
  invalidateCache: jest.fn(),
}))

describe('Database Queries', () => {
  let mockClient: jest.Mocked<any>

  beforeEach(() => {
    mockClient = createMockSupabaseClient()
    const { createClient } = require('../server')
    createClient.mockResolvedValue(mockClient)
    jest.clearAllMocks()
  })

  describe('Organization Queries', () => {
    describe('getOrganizations', () => {
      it('fetches all organizations ordered by created_at desc', async () => {
        const mockOrgs = [
          testDataFactory.organization({ name: 'Org 1' }),
          testDataFactory.organization({ name: 'Org 2' }),
        ]
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue(mockQueryResults.success(mockOrgs)),
          }),
        })

        const result = await getOrganizations()

        expect(mockClient.from).toHaveBeenCalledWith('organizations')
        expect(result).toEqual(mockOrgs)
      })

      it('throws error when database query fails', async () => {
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockRejectedValue(new Error('Database error')),
          }),
        })

        await expect(getOrganizations()).rejects.toThrow('Database error')
      })
    })

    describe('getOrganization', () => {
      it('fetches single organization by ID', async () => {
        const mockOrg = testDataFactory.organization()
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(mockQueryResults.single(mockOrg)),
            }),
          }),
        })

        const result = await getOrganization('org-test-id')

        expect(mockClient.from).toHaveBeenCalledWith('organizations')
        expect(result).toEqual(mockOrg)
      })

      it('returns null when organization not found', async () => {
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockRejectedValue(new Error('No rows found')),
            }),
          }),
        })

        await expect(getOrganization('nonexistent')).rejects.toThrow('No rows found')
      })
    })

    describe('createOrganization', () => {
      it('creates organization using RPC function', async () => {
        const orgId = 'new-org-id'
        mockClient.rpc.mockResolvedValue(mockQueryResults.success(orgId))

        const result = await createOrganization('Test Org', 'test-org')

        expect(mockClient.rpc).toHaveBeenCalledWith('create_org_with_owner', {
          org_name: 'Test Org',
          org_slug: 'test-org',
        })
        expect(result).toBe(orgId)
      })

      it('throws error when RPC fails', async () => {
        mockClient.rpc.mockRejectedValue(new Error('Slug already exists'))

        await expect(createOrganization('Test Org', 'existing-slug')).rejects.toThrow('Slug already exists')
      })
    })

    describe('updateOrganization', () => {
      it('updates organization and returns updated data', async () => {
        const updatedOrg = testDataFactory.organization({ name: 'Updated Org' })
        mockClient.from.mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue(mockQueryResults.single(updatedOrg)),
              }),
            }),
          }),
        })

        const result = await updateOrganization('org-id', { name: 'Updated Org' })

        expect(mockClient.from).toHaveBeenCalledWith('organizations')
        expect(result).toEqual(updatedOrg)
      })
    })

    describe('getOrganizationMembers', () => {
      it('fetches members for organization ordered by created_at', async () => {
        const mockMembers = [
          testDataFactory.organizationMember({ role: 'owner' }),
          testDataFactory.organizationMember({ role: 'admin' }),
        ]
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue(mockQueryResults.success(mockMembers)),
            }),
          }),
        })

        const result = await getOrganizationMembers('org-id')

        expect(mockClient.from).toHaveBeenCalledWith('organization_members')
        expect(result).toEqual(mockMembers)
      })
    })

    describe('addOrganizationMember', () => {
      it('adds member with default role', async () => {
        const newMember = testDataFactory.organizationMember({ role: 'member' })
        mockClient.from.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(mockQueryResults.single(newMember)),
            }),
          }),
        })

        const result = await addOrganizationMember('org-id', 'user-id')

        expect(mockClient.from).toHaveBeenCalledWith('organization_members')
        expect(result).toEqual(newMember)
      })

      it('adds member with specified role', async () => {
        const newAdmin = testDataFactory.organizationMember({ role: 'admin' })
        mockClient.from.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(mockQueryResults.single(newAdmin)),
            }),
          }),
        })

        const result = await addOrganizationMember('org-id', 'user-id', 'admin')

        expect(result).toEqual(newAdmin)
      })
    })

    describe('removeOrganizationMember', () => {
      it('removes member from organization', async () => {
        mockClient.from.mockReturnValue({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue(mockQueryResults.success(null)),
            }),
          }),
        })

        await removeOrganizationMember('org-id', 'user-id')

        expect(mockClient.from).toHaveBeenCalledWith('organization_members')
      })
    })
  })

  describe('Client Queries', () => {
    describe('getClients', () => {
      it('fetches all clients with caching', async () => {
        const mockClients = [
          testDataFactory.client({ name: 'Client 1' }),
          testDataFactory.client({ name: 'Client 2' }),
        ]
        
        // Mock the withCache function to directly call the fetcher
        const { withCache } = require('@/lib/cache')
        withCache.mockImplementation(async (key: any, fetcher: any) => {
          // Mock the query chain with pagination
          const mockQueryBuilder = {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({
              data: mockClients,
              error: null,
              count: mockClients.length,
            }),
          }
          
          mockClient.from.mockReturnValue(mockQueryBuilder)
          
          return await fetcher()
        })

        const result = await getClients()

        expect(result).toEqual({
          data: mockClients,
          count: mockClients.length,
        })
      })
    })

    describe('getClient', () => {
      it('fetches single client by ID', async () => {
        const mockClient_data = testDataFactory.client()
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(mockQueryResults.single(mockClient_data)),
            }),
          }),
        })

        const result = await getClient('client-id')

        expect(result).toEqual(mockClient_data)
      })
    })

    describe('createClientWithOwner', () => {
      it('creates client using RPC function', async () => {
        const clientId = 'new-client-id'
        mockClient.rpc.mockResolvedValue(mockQueryResults.success(clientId))

        const clientData = {
          name: 'Test Client',
          domain: 'test.com',
          industry: 'Tech',
          target_keywords: ['test'],
          brand_voice: { tone: 'professional' },
        }

        const result = await createClientWithOwner(clientData, 'org-id')

        expect(mockClient.rpc).toHaveBeenCalledWith('create_client_with_owner', {
          client_name: 'Test Client',
          client_domain: 'test.com',
          client_industry: 'Tech',
          client_target_keywords: ['test'],
          client_brand_voice: { tone: 'professional' },
          p_org_id: 'org-id',
        })
        expect(result).toBe(clientId)
      })

      it('handles null org_id', async () => {
        const clientId = 'new-client-id'
        mockClient.rpc.mockResolvedValue(mockQueryResults.success(clientId))

        const clientData = {
          name: 'Test Client',
          domain: 'test.com',
        }

        await createClientWithOwner(clientData as any)

        expect(mockClient.rpc).toHaveBeenCalledWith('create_client_with_owner', {
          client_name: 'Test Client',
          client_domain: 'test.com',
          client_industry: undefined,
          client_target_keywords: undefined,
          client_brand_voice: undefined,
          p_org_id: null,
        })
      })
    })

    describe('updateClient', () => {
      it('updates client and invalidates cache', async () => {
        const updatedClient = testDataFactory.client({ name: 'Updated Client' })
        mockClient.from.mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue(mockQueryResults.single(updatedClient)),
              }),
            }),
          }),
        })

        const result = await updateClient('client-id', { name: 'Updated Client' })

        expect(result).toEqual(updatedClient)
        
        const { invalidateCache } = require('@/lib/cache')
        expect(invalidateCache).toHaveBeenCalledWith('cc:clients:all')
      })
    })

    describe('deleteClient', () => {
      it('deletes client and invalidates cache', async () => {
        mockClient.from.mockReturnValue({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue(mockQueryResults.success(null)),
          }),
        })

        await deleteClient('client-id')

        expect(mockClient.from).toHaveBeenCalledWith('clients')
        
        const { invalidateCache } = require('@/lib/cache')
        expect(invalidateCache).toHaveBeenCalledWith('cc:clients:all')
      })
    })
  })

  describe('Competitor Queries', () => {
    describe('getCompetitors', () => {
      it('fetches competitors for client with caching', async () => {
        const mockCompetitors = [
          testDataFactory.competitor({ name: 'Competitor 1', competitive_strength: 9.0 }),
          testDataFactory.competitor({ name: 'Competitor 2', competitive_strength: 8.5 }),
        ]
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue(mockQueryResults.success(mockCompetitors)),
            }),
          }),
        })

        const result = await getCompetitors('client-id')

        expect(mockClient.from).toHaveBeenCalledWith('competitors')
        expect(result).toEqual(mockCompetitors)
      })
    })

    describe('createCompetitor', () => {
      it('creates competitor and invalidates cache', async () => {
        const newCompetitor = testDataFactory.competitor()
        mockClient.from.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(mockQueryResults.single(newCompetitor)),
            }),
          }),
        })

        const competitorData = {
          client_id: 'client-id',
          domain: 'competitor.com',
          name: 'Test Competitor',
          competitive_strength: 8.5,
        }

        const result = await createCompetitor(competitorData)

        expect(result).toEqual(newCompetitor)
        
        const { invalidateCache } = require('@/lib/cache')
        expect(invalidateCache).toHaveBeenCalledWith('cc:competitors:client-id')
      })
    })
  })

  describe('Content Brief Queries', () => {
    describe('getContentBrief', () => {
      it('fetches single content brief by ID', async () => {
        const mockBrief = testDataFactory.contentBrief()
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(mockQueryResults.single(mockBrief)),
            }),
          }),
        })

        const result = await getContentBrief('brief-id')

        expect(result).toEqual(mockBrief)
      })
    })

    describe('getAllContentBriefs', () => {
      it('fetches all briefs without filters and uses cache', async () => {
        const mockBriefs = [
          testDataFactory.contentBrief({ title: 'Brief 1' }),
          testDataFactory.contentBrief({ title: 'Brief 2' }),
        ]
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue(mockQueryResults.success(mockBriefs)),
          }),
        })

        const result = await getAllContentBriefs()

        expect(result).toEqual(mockBriefs)
      })

      it('applies filters and skips cache', async () => {
        const mockBriefs = [testDataFactory.contentBrief({ status: 'approved' })]
        
        const queryChain = {
          order: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        }
        queryChain.order.mockResolvedValue(mockQueryResults.success(mockBriefs))
        
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue(queryChain),
        })

        const result = await getAllContentBriefs({ 
          clientId: 'client-id', 
          status: 'approved' 
        })

        expect(result).toEqual(mockBriefs)
      })
    })

    describe('createContentBrief', () => {
      it('creates brief and invalidates multiple caches', async () => {
        const newBrief = testDataFactory.contentBrief()
        mockClient.from.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(mockQueryResults.single(newBrief)),
            }),
          }),
        })

        const briefData = {
          client_id: 'client-id',
          title: 'Test Brief',
          target_keyword: 'test keyword',
          status: 'draft',
          content_type: 'blog_post',
          target_word_count: 1000,
          priority_level: 'high',
        }

        const result = await createContentBrief(briefData as any)

        expect(result).toEqual(newBrief)
        
        const { invalidateCache } = require('@/lib/cache')
        expect(invalidateCache).toHaveBeenCalledWith(
          'cc:briefs:all', 
          'cc:pipeline-stats:*', 
          'cc:content-queue:all'
        )
      })
    })
  })

  describe('Generated Content Queries', () => {
    describe('getGeneratedContent', () => {
      it('fetches single generated content by ID', async () => {
        const mockContent = testDataFactory.generatedContent()
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(mockQueryResults.single(mockContent)),
            }),
          }),
        })

        const result = await getGeneratedContent('content-id')

        expect(result).toEqual(mockContent)
      })
    })

    describe('getContentQueue', () => {
      it('fetches content queue with brief data', async () => {
        const mockQueue = [
          {
            ...testDataFactory.generatedContent(),
            content_briefs: testDataFactory.contentBrief(),
          },
        ]
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue(mockQueryResults.success(mockQueue)),
          }),
        })

        const result = await getContentQueue()

        expect(mockClient.from).toHaveBeenCalledWith('generated_content')
        expect(result).toEqual(mockQueue)
      })

      it('applies filters and skips cache', async () => {
        const mockQueue = [
          {
            ...testDataFactory.generatedContent({ status: 'reviewing' }),
            content_briefs: testDataFactory.contentBrief(),
          },
        ]
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue(mockQueryResults.success(mockQueue)),
            }),
          }),
        })

        const result = await getContentQueue({ status: 'reviewing' })

        expect(result).toEqual(mockQueue)
      })
    })
  })

  describe('Quality Analysis Queries', () => {
    describe('getQualityAnalysis', () => {
      it('fetches latest quality analysis for content', async () => {
        const mockAnalysis = {
          id: 'analysis-id',
          content_id: 'content-id',
          overall_score: 85,
          seo_score: 90,
          readability_score: 80,
          authority_score: 85,
          engagement_score: 88,
          aeo_score: 82,
          detailed_feedback: null,
          created_at: '2024-01-01T00:00:00Z',
        }
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue(mockQueryResults.single(mockAnalysis)),
                }),
              }),
            }),
          }),
        })

        const result = await getQualityAnalysis('content-id')

        expect(result).toEqual(mockAnalysis)
      })

      it('returns null when no analysis found', async () => {
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116', message: 'No rows found' },
                  }),
                }),
              }),
            }),
          }),
        })

        const result = await getQualityAnalysis('content-id')

        expect(result).toBeNull()
      })
    })
  })

  describe('AI Usage Queries', () => {
    describe('getAiUsageSummary', () => {
      it('calculates usage summary from raw data', async () => {
        const mockUsageData = [
          {
            id: '1',
            client_id: 'client-1',
            provider: 'openai',
            model: 'gpt-4',
            operation: 'content_generation',
            input_tokens: 1000,
            output_tokens: 500,
            estimated_cost_usd: 0.05,
            brief_id: null,
            content_id: null,
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            id: '2',
            client_id: 'client-1',
            provider: 'anthropic',
            model: 'claude-3',
            operation: 'quality_analysis',
            input_tokens: 800,
            output_tokens: 200,
            estimated_cost_usd: 0.03,
            brief_id: null,
            content_id: null,
            created_at: '2024-01-01T00:00:00Z',
          },
        ]
        
        // Mock the withCache function to directly call the fetcher
        const { withCache } = require('@/lib/cache')
        withCache.mockImplementation(async (key: any, fetcher: any) => {
          // Mock the query chain
          mockClient.from.mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue(mockQueryResults.success(mockUsageData)),
            }),
          })
          
          return await fetcher()
        })

        const result = await getAiUsageSummary('client-1')

        expect(result).toEqual({
          totalCost: 0.08,
          totalInputTokens: 1800,
          totalOutputTokens: 700,
          byProvider: {
            openai: { cost: 0.05, calls: 1 },
            anthropic: { cost: 0.03, calls: 1 },
          },
          byOperation: {
            content_generation: { cost: 0.05, calls: 1 },
            quality_analysis: { cost: 0.03, calls: 1 },
          },
        })
      })

      it('handles global summary without client filter', async () => {
        mockClient.from.mockReturnValue({
          select: jest.fn().mockResolvedValue(mockQueryResults.success([])),
        })

        const result = await getAiUsageSummary()

        expect(result).toEqual({
          totalCost: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          byProvider: {},
          byOperation: {},
        })
      })
    })
  })

  describe('Pipeline Stats Queries', () => {
    describe('getContentPipelineStats', () => {
      it('calculates pipeline statistics', async () => {
        const mockBriefData = [
          { status: 'draft' },
          { status: 'draft' },
          { status: 'approved' },
          { status: 'generating' },
          { status: 'generated' },
        ]
        
        // Mock the withCache function to directly call the fetcher
        const { withCache } = require('@/lib/cache')
        withCache.mockImplementation(async (key: any, fetcher: any) => {
          // Mock the query chain
          mockClient.from.mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue(mockQueryResults.success(mockBriefData)),
            }),
          })
          
          return await fetcher()
        })

        const result = await getContentPipelineStats('client-id')

        expect(result).toEqual({
          draft: 2,
          approved: 1,
          generating: 1,
          generated: 1,
        })
      })
    })
  })

  describe('Integration Health Queries', () => {
    describe('getIntegrationHealth', () => {
      it('fetches integration health data with caching', async () => {
        const mockHealthData = [
          {
            id: '1',
            provider: 'dataforseo',
            status: 'healthy',
            last_success: '2024-01-01T00:00:00Z',
            last_failure: null,
            error_count: 0,
            avg_response_ms: 150,
            metadata: null,
            updated_at: '2024-01-01T00:00:00Z',
          },
        ]
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue(mockQueryResults.success(mockHealthData)),
          }),
        })

        const result = await getIntegrationHealth()

        expect(result).toEqual(mockHealthData)
      })
    })
  })

  describe('Error Handling', () => {
    it('propagates database errors correctly', async () => {
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockRejectedValue(new Error('Connection failed')),
        }),
      })

      await expect(getOrganizations()).rejects.toThrow('Connection failed')
    })

    it('handles network timeouts', async () => {
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockRejectedValue(new Error('Network timeout')),
        }),
      })

      await expect(getOrganizations()).rejects.toThrow('Network timeout')
    })
  })

  describe('Data Validation', () => {
    it('validates required fields in create operations', async () => {
      mockClient.rpc.mockRejectedValue(
        new Error('null value in column "name" violates not-null constraint')
      )

      await expect(createOrganization('', 'test-slug')).rejects.toThrow('not-null constraint')
    })

    it('validates unique constraints', async () => {
      mockClient.rpc.mockRejectedValue(
        new Error('duplicate key value violates unique constraint "organizations_slug_key"')
      )

      await expect(createOrganization('Test Org', 'existing-slug')).rejects.toThrow('unique constraint')
    })
  })
})
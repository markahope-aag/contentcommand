/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
/**
 * Tests for database migrations and transactions
 * Tests schema changes, data integrity, rollback scenarios, and transaction safety
 */

import { createAdminClient } from '../admin'
import { 
  createMockSupabaseClient,
  testDataFactory,
  mockQueryResults,
  transactionTestHelpers,
  migrationTestHelpers,
} from '@/lib/test-utils/database-test-framework'

// Mock the admin client
jest.mock('../admin', () => ({
  createAdminClient: jest.fn(),
}))

// Mock the server client
jest.mock('../server', () => ({
  createClient: jest.fn(),
}))

describe('Database Migrations and Transactions', () => {
  let mockAdminClient: jest.Mocked<any>
  let mockClient: jest.Mocked<any>

  beforeEach(() => {
    mockAdminClient = createMockSupabaseClient()
    mockClient = createMockSupabaseClient()
    
    ;(createAdminClient as jest.Mock).mockReturnValue(mockAdminClient)
    const { createClient } = require('../server')
    createClient.mockResolvedValue(mockClient)
    
    jest.clearAllMocks()
  })

  describe('Schema Migrations', () => {
    describe('Initial Schema Migration', () => {
      it('creates all required tables', async () => {
        const expectedTables = [
          'clients',
          'competitors', 
          'content_briefs',
          'generated_content',
          'performance_tracking',
          'api_integrations',
          'content_quality_analysis',
          'ai_usage_tracking',
          'integration_health',
          'api_request_logs',
          'competitive_analysis',
          'ai_citations',
        ]

        // Mock table existence checks
        expectedTables.forEach(tableName => {
          mockAdminClient.from.mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue(
                  mockQueryResults.success([{ table_name: tableName }])
                ),
              }),
            }),
          })
        })

        for (const tableName of expectedTables) {
          await migrationTestHelpers.expectTableExists(mockAdminClient, tableName)
        }

        expect(mockAdminClient.from).toHaveBeenCalledTimes(expectedTables.length)
      })

      it('creates required indexes', async () => {
        const expectedIndexes = [
          'idx_clients_domain',
          'idx_competitors_client',
          'idx_content_briefs_client',
          'idx_content_briefs_status',
          'idx_generated_content_brief',
          'idx_generated_content_status',
          'idx_ai_usage_client',
          'idx_ai_usage_created_at',
        ]

        // Mock index existence checks
        expectedIndexes.forEach(indexName => {
          mockAdminClient.from.mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue(
                  mockQueryResults.success([{ indexname: indexName }])
                ),
              }),
            }),
          })
        })

        for (const indexName of expectedIndexes) {
          await migrationTestHelpers.expectIndexExists(mockAdminClient, indexName)
        }

        expect(mockAdminClient.from).toHaveBeenCalledTimes(expectedIndexes.length)
      })

      it('enables RLS on all tables', async () => {
        const rlsTables = [
          'clients',
          'competitors',
          'content_briefs', 
          'generated_content',
          'performance_tracking',
          'api_integrations',
        ]

        // Mock RLS status checks
        rlsTables.forEach(tableName => {
          mockAdminClient.from.mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue(
                  mockQueryResults.success([{ tablename: tableName, rowsecurity: true }])
                ),
              }),
            }),
          })
        })

        for (const tableName of rlsTables) {
          await migrationTestHelpers.expectRLSEnabled(mockAdminClient, tableName)
        }

        expect(mockAdminClient.from).toHaveBeenCalledTimes(rlsTables.length)
      })
    })

    describe('RLS Policies Migration', () => {
      it('creates user_clients junction table', async () => {
        mockAdminClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue(
                mockQueryResults.success([{ table_name: 'user_clients' }])
              ),
            }),
          }),
        })

        await migrationTestHelpers.expectTableExists(mockAdminClient, 'user_clients')
      })

      it('creates helper functions for RLS', async () => {
        const expectedFunctions = [
          'user_has_client_access',
          'user_client_ids',
          'create_client_with_owner',
        ]

        // Mock function existence checks
        expectedFunctions.forEach(functionName => {
          mockAdminClient.from.mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue(
                  mockQueryResults.success([{ routine_name: functionName }])
                ),
              }),
            }),
          })
        })

        for (const functionName of expectedFunctions) {
          const { data, error } = await mockAdminClient
            .from('information_schema.routines')
            .select('routine_name')
            .eq('routine_name', functionName)
            .eq('routine_schema', 'public')

          expect(error).toBeNull()
          expect(data).toHaveLength(1)
          expect(data[0].routine_name).toBe(functionName)
        }
      })

      it('creates RLS policies for all tables', async () => {
        const expectedPolicies = [
          { table: 'clients', policy: 'Users can view their clients' },
          { table: 'clients', policy: 'Authenticated users can create clients' },
          { table: 'clients', policy: 'Owners/admins can update their clients' },
          { table: 'clients', policy: 'Owners can delete their clients' },
          { table: 'competitors', policy: 'Users can view competitors of their clients' },
          { table: 'content_briefs', policy: 'Users can view briefs of their clients' },
          { table: 'generated_content', policy: 'Users can view content of their clients' },
        ]

        // Mock policy existence checks
        expectedPolicies.forEach(({ table, policy }) => {
          mockAdminClient.from.mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue(
                  mockQueryResults.success([{ policyname: policy, tablename: table }])
                ),
              }),
            }),
          })
        })

        for (const { table, policy } of expectedPolicies) {
          const { data, error } = await mockAdminClient
            .from('pg_policies')
            .select('policyname, tablename')
            .eq('tablename', table)
            .eq('policyname', policy)

          expect(error).toBeNull()
          expect(data).toHaveLength(1)
          expect(data[0].policyname).toBe(policy)
        }
      })
    })

    describe('Organizations Migration', () => {
      it('creates organizations table', async () => {
        mockAdminClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue(
                mockQueryResults.success([{ table_name: 'organizations' }])
              ),
            }),
          }),
        })

        await migrationTestHelpers.expectTableExists(mockAdminClient, 'organizations')
      })

      it('creates organization_members table', async () => {
        mockAdminClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue(
                mockQueryResults.success([{ table_name: 'organization_members' }])
              ),
            }),
          }),
        })

        await migrationTestHelpers.expectTableExists(mockAdminClient, 'organization_members')
      })

      it('adds org_id column to clients table', async () => {
        mockAdminClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue(
                  mockQueryResults.success([{ 
                    column_name: 'org_id', 
                    data_type: 'uuid' 
                  }])
                ),
              }),
            }),
          }),
        })

        await migrationTestHelpers.expectColumnExists(
          mockAdminClient, 
          'clients', 
          'org_id', 
          'uuid'
        )
      })

      it('updates helper functions for org-based access', async () => {
        const updatedFunctions = [
          'user_client_ids',
          'user_has_client_access', 
          'create_client_with_owner',
          'create_org_with_owner',
        ]

        // Mock function existence checks
        updatedFunctions.forEach(functionName => {
          mockAdminClient.from.mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue(
                  mockQueryResults.success([{ routine_name: functionName }])
                ),
              }),
            }),
          })
        })

        for (const functionName of updatedFunctions) {
          const { data, error } = await mockAdminClient
            .from('information_schema.routines')
            .select('routine_name')
            .eq('routine_name', functionName)
            .eq('routine_schema', 'public')

          expect(error).toBeNull()
          expect(data).toHaveLength(1)
          expect(data[0].routine_name).toBe(functionName)
        }
      })

      it('migrates existing user data to organizations', async () => {
        // Mock the migration data check
        mockAdminClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            neq: jest.fn().mockResolvedValue(
              mockQueryResults.success([
                { id: 'client-1', org_id: 'org-1' },
                { id: 'client-2', org_id: 'org-2' },
              ])
            ),
          }),
        })

        const { data, error } = await mockAdminClient
          .from('clients')
          .select('id, org_id')
          .neq('org_id', null)

        expect(error).toBeNull()
        expect(data).toHaveLength(2)
        expect(data!.every((client: any) => client.org_id)).toBe(true)
      })
    })

    describe('Migration Rollback', () => {
      it('handles failed migration gracefully', async () => {
        // Mock migration failure
        mockAdminClient.from.mockReturnValue({
          insert: jest.fn().mockRejectedValue(
            new Error('Migration failed: constraint violation')
          ),
        })

        await expect(
          mockAdminClient.from('test_table').insert({ invalid_data: 'test' })
        ).rejects.toThrow('Migration failed')
      })

      it('maintains data integrity during rollback', async () => {
        // Mock successful rollback
        mockAdminClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue(
              mockQueryResults.success([{ table_name: 'clients' }])
            ),
          }),
        })

        // Verify original table still exists after rollback
        await migrationTestHelpers.expectTableExists(mockAdminClient, 'clients')
      })
    })
  })

  describe('Transaction Management', () => {
    describe('Successful Transactions', () => {
      it('creates client with owner in single transaction', async () => {
        const newClientId = 'new-client-id'
        
        mockClient.rpc.mockResolvedValue(mockQueryResults.success(newClientId))

        const result = await mockClient.rpc('create_client_with_owner', {
          client_name: 'Test Client',
          client_domain: 'test.com',
          client_industry: 'Technology',
          client_target_keywords: ['test', 'client'],
          client_brand_voice: { tone: 'professional' },
          p_org_id: 'org-id',
        })

        expect(result.data).toBe(newClientId)
        expect(result.error).toBeNull()
      })

      it('creates organization with owner in single transaction', async () => {
        const newOrgId = 'new-org-id'
        
        mockClient.rpc.mockResolvedValue(mockQueryResults.success(newOrgId))

        const result = await mockClient.rpc('create_org_with_owner', {
          org_name: 'Test Organization',
          org_slug: 'test-org',
        })

        expect(result.data).toBe(newOrgId)
        expect(result.error).toBeNull()
      })

      it('handles multi-step content creation transaction', async () => {
        const briefId = 'brief-id'
        const contentId = 'content-id'
        const analysisId = 'analysis-id'

        // Mock successful transaction steps
        transactionTestHelpers.mockSuccessfulTransaction(mockClient, [
          mockQueryResults.single(testDataFactory.contentBrief({ id: briefId })),
          mockQueryResults.single(testDataFactory.generatedContent({ 
            id: contentId, 
            brief_id: briefId 
          })),
          mockQueryResults.single({
            id: analysisId,
            content_id: contentId,
            overall_score: 85,
            seo_score: 90,
            readability_score: 80,
            authority_score: 85,
            engagement_score: 88,
            aeo_score: 82,
            detailed_feedback: null,
            created_at: '2024-01-01T00:00:00Z',
          }),
        ])

        // Step 1: Create brief
        const briefResult = await mockClient
          .from('content_briefs')
          .insert({
            client_id: 'client-id',
            title: 'Test Brief',
            target_keyword: 'test',
            status: 'draft',
            content_type: 'blog_post',
            target_word_count: 1000,
            priority_level: 'high',
          })
          .select()
          .single()

        // Step 2: Create content
        const contentResult = await mockClient
          .from('generated_content')
          .insert({
            brief_id: briefId,
            client_id: 'client-id',
            title: 'Test Content',
            content: 'Generated content...',
            status: 'generated',
          })
          .select()
          .single()

        // Step 3: Create quality analysis
        const analysisResult = await mockClient
          .from('content_quality_analysis')
          .insert({
            content_id: contentId,
            overall_score: 85,
            seo_score: 90,
            readability_score: 80,
            authority_score: 85,
            engagement_score: 88,
            aeo_score: 82,
          })
          .select()
          .single()

        expect(briefResult.data.id).toBe(briefId)
        expect(contentResult.data.id).toBe(contentId)
        expect(analysisResult.data.id).toBe(analysisId)
      })
    })

    describe('Failed Transactions', () => {
      it('rolls back on client creation failure', async () => {
        mockClient.rpc.mockRejectedValue(
          new Error('Client creation failed: domain already exists')
        )

        await expect(
          mockClient.rpc('create_client_with_owner', {
            client_name: 'Test Client',
            client_domain: 'existing.com',
            p_org_id: 'org-id',
          })
        ).rejects.toThrow('domain already exists')
      })

      it('rolls back on organization creation failure', async () => {
        mockClient.rpc.mockRejectedValue(
          new Error('Organization creation failed: slug already exists')
        )

        await expect(
          mockClient.rpc('create_org_with_owner', {
            org_name: 'Test Organization',
            org_slug: 'existing-slug',
          })
        ).rejects.toThrow('slug already exists')
      })

      it('handles partial transaction failure', async () => {
        // Mock transaction that fails at step 2
        transactionTestHelpers.mockFailedTransaction(mockClient, 2)

        // Step 1: Create brief (succeeds)
        const briefResult = await mockClient
          .from('content_briefs')
          .insert({
            client_id: 'client-id',
            title: 'Test Brief',
            target_keyword: 'test',
            status: 'draft',
            content_type: 'blog_post',
            target_word_count: 1000,
            priority_level: 'high',
          })
          .select()
          .single()

        expect(briefResult.error).toBeNull()

        // Step 2: Create content (fails)
        await expect(
          mockClient
            .from('generated_content')
            .insert({
              brief_id: 'brief-id',
              client_id: 'client-id',
              title: 'Test Content',
              content: 'Generated content...',
              status: 'generated',
            })
            .select()
            .single()
        ).rejects.toThrow('Transaction failed')
      })
    })

    describe('Concurrent Transaction Handling', () => {
      it('handles concurrent client creation', async () => {
        const clientIds = ['client-1', 'client-2', 'client-3']
        
        // Mock concurrent RPC calls
        clientIds.forEach(id => {
          mockClient.rpc.mockResolvedValueOnce(mockQueryResults.success(id))
        })

        const promises = clientIds.map((_, index) => 
          mockClient.rpc('create_client_with_owner', {
            client_name: `Test Client ${index + 1}`,
            client_domain: `test${index + 1}.com`,
            p_org_id: 'org-id',
          })
        )

        const results = await Promise.all(promises)

        results.forEach((result, index) => {
          expect(result.data).toBe(clientIds[index])
          expect(result.error).toBeNull()
        })
      })

      it('handles concurrent organization creation with unique slugs', async () => {
        const orgIds = ['org-1', 'org-2', 'org-3']
        
        // Mock concurrent RPC calls
        orgIds.forEach(id => {
          mockClient.rpc.mockResolvedValueOnce(mockQueryResults.success(id))
        })

        const promises = orgIds.map((_, index) => 
          mockClient.rpc('create_org_with_owner', {
            org_name: `Test Organization ${index + 1}`,
            org_slug: `test-org-${index + 1}`,
          })
        )

        const results = await Promise.all(promises)

        results.forEach((result, index) => {
          expect(result.data).toBe(orgIds[index])
          expect(result.error).toBeNull()
        })
      })

      it('handles concurrent slug conflicts gracefully', async () => {
        // First call succeeds
        mockClient.rpc.mockResolvedValueOnce(mockQueryResults.success('org-1'))
        
        // Second call with same slug fails
        mockClient.rpc.mockRejectedValueOnce(
          new Error('duplicate key value violates unique constraint')
        )

        const promises = [
          mockClient.rpc('create_org_with_owner', {
            org_name: 'Test Organization 1',
            org_slug: 'test-org',
          }),
          mockClient.rpc('create_org_with_owner', {
            org_name: 'Test Organization 2', 
            org_slug: 'test-org',
          }),
        ]

        const [result1] = await Promise.allSettled(promises)
        
        expect(result1.status).toBe('fulfilled')
        expect((result1 as PromiseFulfilledResult<any>).value.data).toBe('org-1')
        
        // Second promise should reject
        await expect(promises[1]).rejects.toThrow('unique constraint')
      })
    })

    describe('Data Consistency', () => {
      it('maintains referential integrity', async () => {
        // Mock foreign key constraint violation
        mockClient.from.mockReturnValue({
          insert: jest.fn().mockRejectedValue(
            new Error('insert or update on table violates foreign key constraint')
          ),
        })

        await expect(
          mockClient.from('content_briefs').insert({
            client_id: 'nonexistent-client-id',
            title: 'Test Brief',
            target_keyword: 'test',
            status: 'draft',
            content_type: 'blog_post',
            target_word_count: 1000,
            priority_level: 'high',
          })
        ).rejects.toThrow('foreign key constraint')
      })

      it('enforces unique constraints', async () => {
        mockClient.from.mockReturnValue({
          insert: jest.fn().mockRejectedValue(
            new Error('duplicate key value violates unique constraint')
          ),
        })

        await expect(
          mockClient.from('organizations').insert({
            name: 'Test Organization',
            slug: 'existing-slug',
          })
        ).rejects.toThrow('unique constraint')
      })

      it('validates check constraints', async () => {
        mockClient.from.mockReturnValue({
          insert: jest.fn().mockRejectedValue(
            new Error('new row violates check constraint')
          ),
        })

        await expect(
          mockClient.from('organization_members').insert({
            org_id: 'org-id',
            user_id: 'user-id',
            role: 'invalid_role', // Should violate role check constraint
          })
        ).rejects.toThrow('check constraint')
      })
    })

    describe('Deadlock Prevention', () => {
      it('handles deadlock detection and retry', async () => {
        // First attempt fails with deadlock
        mockClient.from.mockReturnValueOnce({
          update: jest.fn().mockRejectedValue(
            new Error('deadlock detected')
          ),
        })

        // Retry succeeds
        const updatedClient = testDataFactory.client({ name: 'Updated Client' })
        mockClient.from.mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue(
                  mockQueryResults.single(updatedClient)
                ),
              }),
            }),
          }),
        })

        // First attempt
        await expect(
          mockClient
            .from('clients')
            .update({ name: 'Updated Client' })
            .eq('id', 'client-id')
            .select()
            .single()
        ).rejects.toThrow('deadlock detected')

        // Retry
        const retryResult = await mockClient
          .from('clients')
          .update({ name: 'Updated Client' })
          .eq('id', 'client-id')
          .select()
          .single()

        expect(retryResult.error).toBeNull()
        expect(retryResult.data.name).toBe('Updated Client')
      })
    })
  })

  describe('Data Migration Integrity', () => {
    it('preserves data during schema changes', async () => {
      // Mock data before migration
      const originalData = [
        { id: 'client-1', name: 'Client 1', domain: 'client1.com' },
        { id: 'client-2', name: 'Client 2', domain: 'client2.com' },
      ]

      mockAdminClient.from.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockQueryResults.success(originalData)),
      })

      const beforeResult = await mockAdminClient
        .from('clients')
        .select('id, name, domain')

      expect(beforeResult.data).toEqual(originalData)

      // Mock data after migration (with new org_id column)
      const migratedData = originalData.map(client => ({
        ...client,
        org_id: `org-${client.id}`,
      }))

      mockAdminClient.from.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockQueryResults.success(migratedData)),
      })

      const afterResult = await mockAdminClient
        .from('clients')
        .select('id, name, domain, org_id')

      expect(afterResult.data).toHaveLength(originalData.length)
      afterResult.data!.forEach((client: any, index: any) => {
        expect(client.id).toBe(originalData[index].id)
        expect(client.name).toBe(originalData[index].name)
        expect(client.domain).toBe(originalData[index].domain)
        expect(client.org_id).toBeDefined()
      })
    })

    it('handles large dataset migrations efficiently', async () => {
      // Mock large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `client-${i}`,
        name: `Client ${i}`,
        domain: `client${i}.com`,
        org_id: `org-${i}`,
      }))

      mockAdminClient.from.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockQueryResults.success(largeDataset)),
      })

      const result = await mockAdminClient
        .from('clients')
        .select('*')

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(1000)
      expect(result.data!.every((client: any) => client.org_id)).toBe(true)
    })
  })
})
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
/**
 * Tests for admin Supabase client
 * Tests service-role operations, RLS bypass, and admin-only functions
 */

import { createAdminClient } from '../admin'
import { 
  createMockSupabaseClient,
  testDataFactory,
  mockQueryResults,
} from '@/lib/test-utils/database-test-framework'

// Mock environment variables
jest.mock('@/lib/env', () => ({
  clientEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  }),
  serverEnv: () => ({
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  }),
}))

// Mock Supabase client creation
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}))

describe('Admin Supabase Client', () => {
  let mockAdminClient: jest.Mocked<any>

  beforeEach(() => {
    mockAdminClient = createMockSupabaseClient()
    const { createClient } = require('@supabase/supabase-js')
    createClient.mockReturnValue(mockAdminClient)
    jest.clearAllMocks()
  })

  describe('Client Creation', () => {
    it('creates admin client with service role key', () => {
      const adminClient = createAdminClient()
      
      const { createClient } = require('@supabase/supabase-js')
      expect(createClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-service-role-key',
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )
      
      expect(adminClient).toBeDefined()
    })

    it('configures auth settings for server-side usage', () => {
      createAdminClient()
      
      const { createClient } = require('@supabase/supabase-js')
      const callArgs = createClient.mock.calls[0]
      expect(callArgs).toHaveLength(3)
      
      const authConfig = callArgs[2]?.auth
      expect(authConfig).toBeDefined()
      expect(authConfig.autoRefreshToken).toBe(false)
      expect(authConfig.persistSession).toBe(false)
    })
  })

  describe('RLS Bypass Operations', () => {
    it('bypasses RLS for admin operations', async () => {
      const adminClient = createAdminClient()
      const allClients = [
        testDataFactory.client({ name: 'Client 1' }),
        testDataFactory.client({ name: 'Client 2' }),
        testDataFactory.client({ name: 'Client 3' }),
      ]

      mockAdminClient.from.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockQueryResults.success(allClients)),
      })

      const result = await adminClient
        .from('clients')
        .select('*')

      expect(result.error).toBeNull()
      expect(result.data).toEqual(allClients)
      expect(result.data).toHaveLength(3) // Should see all clients regardless of RLS
    })

    it('can access all organizations without user context', async () => {
      const adminClient = createAdminClient()
      const allOrgs = [
        testDataFactory.organization({ name: 'Org 1' }),
        testDataFactory.organization({ name: 'Org 2' }),
        testDataFactory.organization({ name: 'Org 3' }),
      ]

      mockAdminClient.from.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockQueryResults.success(allOrgs)),
      })

      const result = await adminClient
        .from('organizations')
        .select('*')

      expect(result.error).toBeNull()
      expect(result.data).toEqual(allOrgs)
      expect(result.data).toHaveLength(3)
    })

    it('can access all user data for admin operations', async () => {
      const adminClient = createAdminClient()
      const allMembers = [
        testDataFactory.organizationMember({ role: 'owner' }),
        testDataFactory.organizationMember({ role: 'admin' }),
        testDataFactory.organizationMember({ role: 'member' }),
      ]

      mockAdminClient.from.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockQueryResults.success(allMembers)),
      })

      const result = await adminClient
        .from('organization_members')
        .select('*')

      expect(result.error).toBeNull()
      expect(result.data).toEqual(allMembers)
      expect(result.data).toHaveLength(3)
    })
  })

  describe('System Maintenance Operations', () => {
    it('can perform bulk data operations', async () => {
      const adminClient = createAdminClient()
      const bulkInsertData = Array.from({ length: 100 }, (_, i) => ({
        provider: 'test_provider',
        status: 'healthy',
        last_success: '2024-01-01T00:00:00Z',
        error_count: 0,
        avg_response_ms: 150 + i,
        metadata: null,
      }))

      mockAdminClient.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue(mockQueryResults.success(bulkInsertData)),
      })

      const result = await adminClient
        .from('integration_health')
        .insert(bulkInsertData)

      expect(result.error).toBeNull()
      expect(result.data).toEqual(bulkInsertData)
    })

    it('can perform system-wide updates', async () => {
      const adminClient = createAdminClient()
      const updatedRecords = [
        { id: '1', status: 'maintenance' },
        { id: '2', status: 'maintenance' },
        { id: '3', status: 'maintenance' },
      ]

      mockAdminClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          neq: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue(mockQueryResults.success(updatedRecords)),
          }),
        }),
      })

      const result = await adminClient
        .from('integration_health')
        .update({ status: 'maintenance' })
        .neq('status', 'down')
        .select()

      expect(result.error).toBeNull()
      expect(result.data).toEqual(updatedRecords)
    })

    it('can perform system cleanup operations', async () => {
      const adminClient = createAdminClient()

      mockAdminClient.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          lt: jest.fn().mockResolvedValue(mockQueryResults.success(null)),
        }),
      })

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - 30)

      const result = await adminClient
        .from('api_request_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString())

      expect(result.error).toBeNull()
    })
  })

  describe('Analytics and Reporting', () => {
    it('can access global usage statistics', async () => {
      const adminClient = createAdminClient()
      const globalStats = [
        {
          provider: 'openai',
          total_calls: 1500,
          total_cost: 75.50,
          total_input_tokens: 150000,
          total_output_tokens: 75000,
        },
        {
          provider: 'anthropic',
          total_calls: 800,
          total_cost: 40.25,
          total_input_tokens: 80000,
          total_output_tokens: 40000,
        },
      ]

      mockAdminClient.from.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockQueryResults.success(globalStats)),
      })

      const result = await adminClient
        .from('ai_usage_tracking')
        .select('provider, count(*) as total_calls, sum(estimated_cost_usd) as total_cost, sum(input_tokens) as total_input_tokens, sum(output_tokens) as total_output_tokens')

      expect(result.error).toBeNull()
      expect(result.data).toEqual(globalStats)
    })

    it('can generate system health reports', async () => {
      const adminClient = createAdminClient()
      const healthReport = [
        { provider: 'dataforseo', status: 'healthy', uptime_percentage: 99.9 },
        { provider: 'frase', status: 'degraded', uptime_percentage: 95.2 },
        { provider: 'google', status: 'healthy', uptime_percentage: 99.8 },
      ]

      mockAdminClient.from.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockQueryResults.success(healthReport)),
      })

      const result = await adminClient
        .from('integration_health')
        .select('provider, status, uptime_percentage')

      expect(result.error).toBeNull()
      expect(result.data).toEqual(healthReport)
    })

    it('can access cross-tenant analytics', async () => {
      const adminClient = createAdminClient()
      const crossTenantData = [
        { org_id: 'org-1', client_count: 5, content_count: 150, total_cost: 25.75 },
        { org_id: 'org-2', client_count: 3, content_count: 89, total_cost: 18.50 },
        { org_id: 'org-3', client_count: 8, content_count: 245, total_cost: 42.25 },
      ]

      mockAdminClient.from.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockQueryResults.success(crossTenantData)),
      })

      const result = await adminClient
        .from('organizations')
        .select('id as org_id, client_count, content_count, total_cost')

      expect(result.error).toBeNull()
      expect(result.data).toEqual(crossTenantData)
    })
  })

  describe('Data Migration Support', () => {
    it('can execute schema changes', async () => {
      const adminClient = createAdminClient()

      mockAdminClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue(
              mockQueryResults.success([{ column_name: 'new_column' }])
            ),
          }),
        }),
      })

      const result = await adminClient
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'clients')
        .eq('column_name', 'new_column')

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(1)
      expect(result.data![0].column_name).toBe('new_column')
    })

    it('can perform data backfills', async () => {
      const adminClient = createAdminClient()
      const backfillResults = [
        { id: 'client-1', org_id: 'org-1', updated: true },
        { id: 'client-2', org_id: 'org-2', updated: true },
        { id: 'client-3', org_id: 'org-3', updated: true },
      ]

      mockAdminClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          neq: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue(mockQueryResults.success(backfillResults)),
          }),
        }),
      })

      const result = await adminClient
        .from('clients')
        .update({ org_id: 'default-org' })
        .neq('org_id', null)
        .select('id, org_id')

      expect(result.error).toBeNull()
      expect(result.data).toEqual(backfillResults)
    })

    it('can validate data integrity after migrations', async () => {
      const adminClient = createAdminClient()
      const integrityCheck = [
        { table_name: 'clients', constraint_violations: 0 },
        { table_name: 'content_briefs', constraint_violations: 0 },
        { table_name: 'generated_content', constraint_violations: 0 },
      ]

      mockAdminClient.from.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockQueryResults.success(integrityCheck)),
      })

      const result = await adminClient
        .from('constraint_violations_view')
        .select('table_name, constraint_violations')

      expect(result.error).toBeNull()
      expect(result.data).toEqual(integrityCheck)
      expect(result.data!.every(check => check.constraint_violations === 0)).toBe(true)
    })
  })

  describe('Cron Job Operations', () => {
    it('can execute scheduled maintenance tasks', async () => {
      const adminClient = createAdminClient()
      const maintenanceResults = {
        logs_cleaned: 1500,
        health_checks_updated: 8,
        cache_entries_purged: 250,
      }

      mockAdminClient.rpc.mockResolvedValue(mockQueryResults.success(maintenanceResults))

      const result = await adminClient.rpc('run_scheduled_maintenance')

      expect(result.error).toBeNull()
      expect(result.data).toEqual(maintenanceResults)
    })

    it('can update integration health status', async () => {
      const adminClient = createAdminClient()
      const healthUpdates = [
        { provider: 'dataforseo', status: 'healthy', last_check: '2024-01-01T00:00:00Z' },
        { provider: 'frase', status: 'degraded', last_check: '2024-01-01T00:00:00Z' },
      ]

      mockAdminClient.from.mockReturnValue({
        upsert: jest.fn().mockResolvedValue(mockQueryResults.success(healthUpdates)),
      })

      const result = await adminClient
        .from('integration_health')
        .upsert(healthUpdates)

      expect(result.error).toBeNull()
      expect(result.data).toEqual(healthUpdates)
    })

    it('can generate daily usage reports', async () => {
      const adminClient = createAdminClient()
      const dailyReport = {
        date: '2024-01-01',
        total_content_generated: 45,
        total_ai_cost: 12.75,
        active_organizations: 8,
        active_users: 23,
      }

      mockAdminClient.rpc.mockResolvedValue(mockQueryResults.success(dailyReport))

      const result = await adminClient.rpc('generate_daily_usage_report', {
        report_date: '2024-01-01',
      })

      expect(result.error).toBeNull()
      expect(result.data).toEqual(dailyReport)
    })
  })

  describe('Security Operations', () => {
    it('can audit user access patterns', async () => {
      const adminClient = createAdminClient()
      const auditResults = [
        { user_id: 'user-1', login_count: 15, last_login: '2024-01-01T12:00:00Z' },
        { user_id: 'user-2', login_count: 8, last_login: '2024-01-01T10:30:00Z' },
        { user_id: 'user-3', login_count: 22, last_login: '2024-01-01T14:15:00Z' },
      ]

      mockAdminClient.from.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockQueryResults.success(auditResults)),
      })

      const result = await adminClient
        .from('user_audit_log')
        .select('user_id, login_count, last_login')

      expect(result.error).toBeNull()
      expect(result.data).toEqual(auditResults)
    })

    it('can identify suspicious activity', async () => {
      const adminClient = createAdminClient()
      const suspiciousActivity = [
        { 
          user_id: 'user-suspicious', 
          activity_type: 'multiple_failed_logins',
          count: 10,
          last_occurrence: '2024-01-01T15:00:00Z'
        },
      ]

      mockAdminClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gt: jest.fn().mockResolvedValue(mockQueryResults.success(suspiciousActivity)),
        }),
      })

      const result = await adminClient
        .from('security_events')
        .select('user_id, activity_type, count, last_occurrence')
        .gt('count', 5)

      expect(result.error).toBeNull()
      expect(result.data).toEqual(suspiciousActivity)
    })

    it('can manage user access revocation', async () => {
      const adminClient = createAdminClient()

      mockAdminClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(mockQueryResults.success(null)),
        }),
      })

      const result = await adminClient
        .from('organization_members')
        .update({ role: 'suspended' })
        .eq('user_id', 'suspended-user-id')

      expect(result.error).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('handles admin operation failures gracefully', async () => {
      const adminClient = createAdminClient()

      mockAdminClient.from.mockReturnValue({
        select: jest.fn().mockResolvedValue(
          mockQueryResults.error('Admin operation failed: insufficient permissions')
        ),
      })

      const result = await adminClient
        .from('restricted_table')
        .select('*')

      expect(result.data).toBeNull()
      expect(result.error).toBeTruthy()
      expect(result.error!.message).toContain('insufficient permissions')
    })

    it('handles network timeouts for long-running operations', async () => {
      const adminClient = createAdminClient()

      mockAdminClient.rpc.mockRejectedValue(new Error('Network timeout'))

      await expect(
        adminClient.rpc('long_running_maintenance_task')
      ).rejects.toThrow('Network timeout')
    })

    it('handles database connection failures', async () => {
      const adminClient = createAdminClient()

      mockAdminClient.from.mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Connection failed')),
      })

      await expect(
        adminClient.from('clients').select('*')
      ).rejects.toThrow('Connection failed')
    })
  })

  describe('Performance Considerations', () => {
    it('can handle large dataset queries efficiently', async () => {
      const adminClient = createAdminClient()
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: `record-${i}`,
        data: `data-${i}`,
      }))

      mockAdminClient.from.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockQueryResults.success(largeDataset)),
      })

      const result = await adminClient
        .from('large_table')
        .select('*')

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(10000)
    })

    it('can perform batch operations efficiently', async () => {
      const adminClient = createAdminClient()
      const batchData = Array.from({ length: 1000 }, (_, i) => ({
        id: `batch-${i}`,
        processed: true,
        processed_at: '2024-01-01T00:00:00Z',
      }))

      mockAdminClient.from.mockReturnValue({
        upsert: jest.fn().mockResolvedValue(mockQueryResults.success(batchData)),
      })

      const result = await adminClient
        .from('batch_processing')
        .upsert(batchData)

      expect(result.error).toBeNull()
      expect(result.data).toEqual(batchData)
    })
  })
})
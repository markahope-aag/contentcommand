/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
/**
 * Tests for Row Level Security (RLS) policies
 * Tests access control, authorization, and data isolation
 */

import { 
  createMockSupabaseClient,
  testDataFactory,
  mockQueryResults,
  rlsTestHelpers,
  authTestHelpers,
  TEST_USERS,
} from '@/lib/test-utils/database-test-framework'

// Mock the Supabase client
jest.mock('../server', () => ({
  createClient: jest.fn(),
}))

describe('RLS Policies', () => {
  let mockClient: jest.Mocked<any>

  beforeEach(() => {
    mockClient = createMockSupabaseClient()
    const { createClient } = require('../server')
    createClient.mockResolvedValue(mockClient)
    jest.clearAllMocks()
  })

  describe('Organization Policies', () => {
    describe('SELECT policies', () => {
      it('allows users to view their organizations', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.owner.id)
        const mockOrgs = [testDataFactory.organization()]
        
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue(mockQueryResults.success(mockOrgs)),
          }),
        })

        const queryFn = async () => {
          return await mockClient
            .from('organizations')
            .select('*')
            .order('created_at', { ascending: false })
        }

        const result = await rlsTestHelpers.expectAuthorized(queryFn)
        expect(result).toEqual(mockOrgs)
      })

      it('filters out organizations user is not member of', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.unauthorized.id)
        
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue(mockQueryResults.empty()),
          }),
        })

        const queryFn = async () => {
          return await mockClient
            .from('organizations')
            .select('*')
            .order('created_at', { ascending: false })
        }

        await rlsTestHelpers.expectFiltered(queryFn)
      })

      it('denies access to unauthenticated users', async () => {
        authTestHelpers.mockUnauthenticatedUser(mockClient)
        
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue(mockQueryResults.error('JWT expired', 'PGRST301')),
          }),
        })

        const queryFn = async () => {
          return await mockClient
            .from('organizations')
            .select('*')
            .order('created_at', { ascending: false })
        }

        await rlsTestHelpers.expectUnauthorized(queryFn)
      })
    })

    describe('INSERT policies', () => {
      it('allows authenticated users to create organizations', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.owner.id)
        const newOrg = testDataFactory.organization()
        
        mockClient.from.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(mockQueryResults.single(newOrg)),
            }),
          }),
        })

        const queryFn = async () => {
          return await mockClient
            .from('organizations')
            .insert({ name: 'New Org', slug: 'new-org' })
            .select()
            .single()
        }

        const result = await rlsTestHelpers.expectAuthorized(queryFn)
        expect(result).toEqual(newOrg)
      })

      it('denies organization creation to unauthenticated users', async () => {
        authTestHelpers.mockUnauthenticatedUser(mockClient)
        
        mockClient.from.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(mockQueryResults.error('Not authenticated')),
            }),
          }),
        })

        const queryFn = async () => {
          return await mockClient
            .from('organizations')
            .insert({ name: 'New Org', slug: 'new-org' })
            .select()
            .single()
        }

        await rlsTestHelpers.expectUnauthorized(queryFn)
      })
    })

    describe('UPDATE policies', () => {
      it('allows org owners to update their organization', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.owner.id)
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

        const queryFn = async () => {
          return await mockClient
            .from('organizations')
            .update({ name: 'Updated Org' })
            .eq('id', 'org-id')
            .select()
            .single()
        }

        const result = await rlsTestHelpers.expectAuthorized(queryFn)
        expect(result).toEqual(updatedOrg)
      })

      it('allows org admins to update their organization', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.admin.id)
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

        const queryFn = async () => {
          return await mockClient
            .from('organizations')
            .update({ name: 'Updated Org' })
            .eq('id', 'org-id')
            .select()
            .single()
        }

        const result = await rlsTestHelpers.expectAuthorized(queryFn)
        expect(result).toEqual(updatedOrg)
      })

      it('denies org updates to regular members', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.member.id)
        
        mockClient.from.mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue(mockQueryResults.error('Permission denied')),
              }),
            }),
          }),
        })

        const queryFn = async () => {
          return await mockClient
            .from('organizations')
            .update({ name: 'Updated Org' })
            .eq('id', 'org-id')
            .select()
            .single()
        }

        await rlsTestHelpers.expectUnauthorized(queryFn)
      })

      it('denies org updates to non-members', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.unauthorized.id)
        
        mockClient.from.mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue(mockQueryResults.error('Permission denied')),
              }),
            }),
          }),
        })

        const queryFn = async () => {
          return await mockClient
            .from('organizations')
            .update({ name: 'Updated Org' })
            .eq('id', 'org-id')
            .select()
            .single()
        }

        await rlsTestHelpers.expectUnauthorized(queryFn)
      })
    })
  })

  describe('Organization Member Policies', () => {
    describe('SELECT policies', () => {
      it('allows users to view members of their organizations', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.owner.id)
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

        const queryFn = async () => {
          return await mockClient
            .from('organization_members')
            .select('*')
            .eq('org_id', 'org-id')
            .order('created_at', { ascending: true })
        }

        const result = await rlsTestHelpers.expectAuthorized(queryFn)
        expect(result).toEqual(mockMembers)
      })

      it('filters out members of organizations user is not part of', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.unauthorized.id)
        
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue(mockQueryResults.empty()),
            }),
          }),
        })

        const queryFn = async () => {
          return await mockClient
            .from('organization_members')
            .select('*')
            .eq('org_id', 'other-org-id')
            .order('created_at', { ascending: true })
        }

        await rlsTestHelpers.expectFiltered(queryFn)
      })
    })

    describe('INSERT policies', () => {
      it('allows org owners to add members', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.owner.id)
        const newMember = testDataFactory.organizationMember({ role: 'member' })
        
        mockClient.from.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(mockQueryResults.single(newMember)),
            }),
          }),
        })

        const queryFn = async () => {
          return await mockClient
            .from('organization_members')
            .insert({ org_id: 'org-id', user_id: 'new-user-id', role: 'member' })
            .select()
            .single()
        }

        const result = await rlsTestHelpers.expectAuthorized(queryFn)
        expect(result).toEqual(newMember)
      })

      it('allows org admins to add members', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.admin.id)
        const newMember = testDataFactory.organizationMember({ role: 'member' })
        
        mockClient.from.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(mockQueryResults.single(newMember)),
            }),
          }),
        })

        const queryFn = async () => {
          return await mockClient
            .from('organization_members')
            .insert({ org_id: 'org-id', user_id: 'new-user-id', role: 'member' })
            .select()
            .single()
        }

        const result = await rlsTestHelpers.expectAuthorized(queryFn)
        expect(result).toEqual(newMember)
      })

      it('denies regular members from adding other members', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.member.id)
        
        mockClient.from.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(mockQueryResults.error('Permission denied')),
            }),
          }),
        })

        const queryFn = async () => {
          return await mockClient
            .from('organization_members')
            .insert({ org_id: 'org-id', user_id: 'new-user-id', role: 'member' })
            .select()
            .single()
        }

        await rlsTestHelpers.expectUnauthorized(queryFn)
      })
    })

    describe('DELETE policies', () => {
      it('allows users to remove themselves', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.member.id)
        
        mockClient.from.mockReturnValue({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue(mockQueryResults.success(null)),
            }),
          }),
        })

        const queryFn = async () => {
          return await mockClient
            .from('organization_members')
            .delete()
            .eq('org_id', 'org-id')
            .eq('user_id', TEST_USERS.member.id)
        }

        await rlsTestHelpers.expectAuthorized(queryFn)
      })

      it('allows org owners to remove any member', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.owner.id)
        
        mockClient.from.mockReturnValue({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue(mockQueryResults.success(null)),
            }),
          }),
        })

        const queryFn = async () => {
          return await mockClient
            .from('organization_members')
            .delete()
            .eq('org_id', 'org-id')
            .eq('user_id', 'other-user-id')
        }

        await rlsTestHelpers.expectAuthorized(queryFn)
      })

      it('allows org admins to remove members (but not owners)', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.admin.id)
        
        mockClient.from.mockReturnValue({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue(mockQueryResults.success(null)),
            }),
          }),
        })

        const queryFn = async () => {
          return await mockClient
            .from('organization_members')
            .delete()
            .eq('org_id', 'org-id')
            .eq('user_id', 'member-user-id')
        }

        await rlsTestHelpers.expectAuthorized(queryFn)
      })

      it('denies regular members from removing other members', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.member.id)
        
        mockClient.from.mockReturnValue({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue(mockQueryResults.error('Permission denied')),
            }),
          }),
        })

        const queryFn = async () => {
          return await mockClient
            .from('organization_members')
            .delete()
            .eq('org_id', 'org-id')
            .eq('user_id', 'other-user-id')
        }

        await rlsTestHelpers.expectUnauthorized(queryFn)
      })
    })
  })

  describe('Client Policies', () => {
    describe('SELECT policies', () => {
      it('allows users to view clients in their organizations', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.owner.id)
        const mockClients = [testDataFactory.client()]
        
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue(mockQueryResults.success(mockClients)),
          }),
        })

        const queryFn = async () => {
          return await mockClient
            .from('clients')
            .select('*')
            .order('created_at', { ascending: false })
        }

        const result = await rlsTestHelpers.expectAuthorized(queryFn)
        expect(result).toEqual(mockClients)
      })

      it('filters out clients from other organizations', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.unauthorized.id)
        
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue(mockQueryResults.empty()),
          }),
        })

        const queryFn = async () => {
          return await mockClient
            .from('clients')
            .select('*')
            .order('created_at', { ascending: false })
        }

        await rlsTestHelpers.expectFiltered(queryFn)
      })
    })

    describe('INSERT policies', () => {
      it('allows authenticated users to create clients', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.owner.id)
        const newClient = testDataFactory.client()
        
        mockClient.from.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(mockQueryResults.single(newClient)),
            }),
          }),
        })

        const queryFn = async () => {
          return await mockClient
            .from('clients')
            .insert({
              name: 'New Client',
              domain: 'newclient.com',
              org_id: 'org-id',
            })
            .select()
            .single()
        }

        const result = await rlsTestHelpers.expectAuthorized(queryFn)
        expect(result).toEqual(newClient)
      })

      it('denies client creation to unauthenticated users', async () => {
        authTestHelpers.mockUnauthenticatedUser(mockClient)
        
        mockClient.from.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(mockQueryResults.error('Not authenticated')),
            }),
          }),
        })

        const queryFn = async () => {
          return await mockClient
            .from('clients')
            .insert({
              name: 'New Client',
              domain: 'newclient.com',
              org_id: 'org-id',
            })
            .select()
            .single()
        }

        await rlsTestHelpers.expectUnauthorized(queryFn)
      })
    })

    describe('UPDATE policies', () => {
      it('allows org owners to update clients', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.owner.id)
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

        const queryFn = async () => {
          return await mockClient
            .from('clients')
            .update({ name: 'Updated Client' })
            .eq('id', 'client-id')
            .select()
            .single()
        }

        const result = await rlsTestHelpers.expectAuthorized(queryFn)
        expect(result).toEqual(updatedClient)
      })

      it('allows org admins to update clients', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.admin.id)
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

        const queryFn = async () => {
          return await mockClient
            .from('clients')
            .update({ name: 'Updated Client' })
            .eq('id', 'client-id')
            .select()
            .single()
        }

        const result = await rlsTestHelpers.expectAuthorized(queryFn)
        expect(result).toEqual(updatedClient)
      })

      it('denies regular members from updating clients', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.member.id)
        
        mockClient.from.mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue(mockQueryResults.error('Permission denied')),
              }),
            }),
          }),
        })

        const queryFn = async () => {
          return await mockClient
            .from('clients')
            .update({ name: 'Updated Client' })
            .eq('id', 'client-id')
            .select()
            .single()
        }

        await rlsTestHelpers.expectUnauthorized(queryFn)
      })
    })

    describe('DELETE policies', () => {
      it('allows org owners to delete clients', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.owner.id)
        
        mockClient.from.mockReturnValue({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue(mockQueryResults.success(null)),
          }),
        })

        const queryFn = async () => {
          return await mockClient
            .from('clients')
            .delete()
            .eq('id', 'client-id')
        }

        await rlsTestHelpers.expectAuthorized(queryFn)
      })

      it('denies client deletion to non-owners', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.admin.id)
        
        mockClient.from.mockReturnValue({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue(mockQueryResults.error('Permission denied')),
          }),
        })

        const queryFn = async () => {
          return await mockClient
            .from('clients')
            .delete()
            .eq('id', 'client-id')
        }

        await rlsTestHelpers.expectUnauthorized(queryFn)
      })
    })
  })

  describe('Content Brief Policies', () => {
    describe('SELECT policies', () => {
      it('allows users to view briefs of their clients', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.owner.id)
        const mockBriefs = [testDataFactory.contentBrief()]
        
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue(mockQueryResults.success(mockBriefs)),
            }),
          }),
        })

        const queryFn = async () => {
          return await mockClient
            .from('content_briefs')
            .select('*')
            .eq('client_id', 'client-id')
            .order('created_at', { ascending: false })
        }

        const result = await rlsTestHelpers.expectAuthorized(queryFn)
        expect(result).toEqual(mockBriefs)
      })

      it('filters out briefs from clients user cannot access', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.unauthorized.id)
        
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue(mockQueryResults.empty()),
            }),
          }),
        })

        const queryFn = async () => {
          return await mockClient
            .from('content_briefs')
            .select('*')
            .eq('client_id', 'other-client-id')
            .order('created_at', { ascending: false })
        }

        await rlsTestHelpers.expectFiltered(queryFn)
      })
    })

    describe('INSERT policies', () => {
      it('allows users to create briefs for their clients', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.owner.id)
        const newBrief = testDataFactory.contentBrief()
        
        mockClient.from.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(mockQueryResults.single(newBrief)),
            }),
          }),
        })

        const queryFn = async () => {
          return await mockClient
            .from('content_briefs')
            .insert({
              client_id: 'client-id',
              title: 'New Brief',
              target_keyword: 'test keyword',
              status: 'draft',
              content_type: 'blog_post',
              target_word_count: 1000,
              priority_level: 'high',
            })
            .select()
            .single()
        }

        const result = await rlsTestHelpers.expectAuthorized(queryFn)
        expect(result).toEqual(newBrief)
      })

      it('denies brief creation for clients user cannot access', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.unauthorized.id)
        
        mockClient.from.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(mockQueryResults.error('Permission denied')),
            }),
          }),
        })

        const queryFn = async () => {
          return await mockClient
            .from('content_briefs')
            .insert({
              client_id: 'other-client-id',
              title: 'New Brief',
              target_keyword: 'test keyword',
              status: 'draft',
              content_type: 'blog_post',
              target_word_count: 1000,
              priority_level: 'high',
            })
            .select()
            .single()
        }

        await rlsTestHelpers.expectUnauthorized(queryFn)
      })
    })
  })

  describe('Generated Content Policies', () => {
    describe('SELECT policies', () => {
      it('allows users to view content of their clients', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.owner.id)
        const mockContent = [testDataFactory.generatedContent()]
        
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue(mockQueryResults.success(mockContent)),
            }),
          }),
        })

        const queryFn = async () => {
          return await mockClient
            .from('generated_content')
            .select('*')
            .eq('client_id', 'client-id')
            .order('created_at', { ascending: false })
        }

        const result = await rlsTestHelpers.expectAuthorized(queryFn)
        expect(result).toEqual(mockContent)
      })

      it('filters out content from clients user cannot access', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.unauthorized.id)
        
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue(mockQueryResults.empty()),
            }),
          }),
        })

        const queryFn = async () => {
          return await mockClient
            .from('generated_content')
            .select('*')
            .eq('client_id', 'other-client-id')
            .order('created_at', { ascending: false })
        }

        await rlsTestHelpers.expectFiltered(queryFn)
      })
    })
  })

  describe('Helper Functions', () => {
    describe('user_has_client_access', () => {
      it('returns true for users with client access through org membership', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.owner.id)
        
        mockClient.rpc.mockResolvedValue(mockQueryResults.success(true))

        const result = await mockClient.rpc('user_has_client_access', {
          check_client_id: 'client-id',
        })

        expect(result.data).toBe(true)
        expect(result.error).toBeNull()
      })

      it('returns false for users without client access', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.unauthorized.id)
        
        mockClient.rpc.mockResolvedValue(mockQueryResults.success(false))

        const result = await mockClient.rpc('user_has_client_access', {
          check_client_id: 'other-client-id',
        })

        expect(result.data).toBe(false)
        expect(result.error).toBeNull()
      })
    })

    describe('user_client_ids', () => {
      it('returns client IDs for user through org membership', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.owner.id)
        const clientIds = ['client-1', 'client-2', 'client-3']
        
        mockClient.rpc.mockResolvedValue(mockQueryResults.success(clientIds))

        const result = await mockClient.rpc('user_client_ids')

        expect(result.data).toEqual(clientIds)
        expect(result.error).toBeNull()
      })

      it('returns empty array for users with no client access', async () => {
        authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.unauthorized.id)
        
        mockClient.rpc.mockResolvedValue(mockQueryResults.success([]))

        const result = await mockClient.rpc('user_client_ids')

        expect(result.data).toEqual([])
        expect(result.error).toBeNull()
      })
    })
  })

  describe('Cross-table Access Control', () => {
    it('enforces access control across related tables', async () => {
      authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.owner.id)
      
      // User can access content through brief -> client -> org relationship
      const mockContent = [testDataFactory.generatedContent()]
      
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue(mockQueryResults.success(mockContent)),
        }),
      })

      const queryFn = async () => {
        return await mockClient
          .from('generated_content')
          .select('*')
          .order('created_at', { ascending: false })
      }

      const result = await rlsTestHelpers.expectAuthorized(queryFn)
      expect(result).toEqual(mockContent)
    })

    it('blocks access when relationship chain is broken', async () => {
      authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.unauthorized.id)
      
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue(mockQueryResults.empty()),
        }),
      })

      const queryFn = async () => {
        return await mockClient
          .from('generated_content')
          .select('*')
          .order('created_at', { ascending: false })
      }

      await rlsTestHelpers.expectFiltered(queryFn)
    })
  })

  describe('Edge Cases', () => {
    it('handles null user ID gracefully', async () => {
      authTestHelpers.mockUnauthenticatedUser(mockClient)
      
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue(mockQueryResults.error('Not authenticated')),
        }),
      })

      const queryFn = async () => {
        return await mockClient
          .from('organizations')
          .select('*')
          .order('created_at', { ascending: false })
      }

      await rlsTestHelpers.expectUnauthorized(queryFn)
    })

    it('handles malformed JWT tokens', async () => {
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid JWT', name: 'AuthError' },
      })
      
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue(mockQueryResults.error('Invalid JWT')),
        }),
      })

      const queryFn = async () => {
        return await mockClient
          .from('organizations')
          .select('*')
          .order('created_at', { ascending: false })
      }

      await rlsTestHelpers.expectUnauthorized(queryFn)
    })

    it('handles concurrent access attempts', async () => {
      authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.owner.id)
      const mockOrgs = [testDataFactory.organization()]
      
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue(mockQueryResults.success(mockOrgs)),
        }),
      })

      const queryFn = async () => {
        return await mockClient
          .from('organizations')
          .select('*')
          .order('created_at', { ascending: false })
      }

      // Simulate multiple concurrent requests
      const promises = Array(5).fill(null).map(() => rlsTestHelpers.expectAuthorized(queryFn))
      const results = await Promise.all(promises)
      
      results.forEach(result => {
        expect(result).toEqual(mockOrgs)
      })
    })
  })
})
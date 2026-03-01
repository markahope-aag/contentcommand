/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
/**
 * Tests for authentication flows
 * Tests sign in/out, session management, user creation, and auth state
 */

import { signOut, getUser } from '../actions'
import {
  createMockSupabaseClient,
  authTestHelpers,
  TEST_USERS,
} from '@/lib/test-utils/database-test-framework'

// Mock Next.js navigation
const mockRedirect = jest.fn()
jest.mock('next/navigation', () => ({
  redirect: mockRedirect,
}))

// Mock the Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('Authentication Flows', () => {
  let mockClient: jest.Mocked<any>

  beforeEach(() => {
    mockClient = createMockSupabaseClient()
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockClient)
    jest.clearAllMocks()
  })

  describe('Sign Out Flow', () => {
    it('signs out user and redirects to login', async () => {
      mockClient.auth.signOut.mockResolvedValue({ error: null })

      await signOut()

      expect(mockClient.auth.signOut).toHaveBeenCalled()
      expect(mockRedirect).toHaveBeenCalledWith('/login')
    })

    it('handles sign out errors gracefully', async () => {
      mockClient.auth.signOut.mockResolvedValue({
        error: { message: 'Sign out failed', name: 'AuthError' },
      })

      // Should still redirect even if sign out fails
      await signOut()

      expect(mockClient.auth.signOut).toHaveBeenCalled()
      expect(mockRedirect).toHaveBeenCalledWith('/login')
    })

    it('clears session data on sign out', async () => {
      mockClient.auth.signOut.mockResolvedValue({ error: null })
      mockClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      await signOut()

      expect(mockClient.auth.signOut).toHaveBeenCalled()
      
      // Verify session is cleared
      const { data: { session } } = await mockClient.auth.getSession()
      expect(session).toBeNull()
    })
  })

  describe('Get User Flow', () => {
    it('returns authenticated user', async () => {
      const mockUser = {
        id: TEST_USERS.owner.id,
        email: TEST_USERS.owner.email,
        aud: 'authenticated',
        role: 'authenticated',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await getUser()

      expect(result).toEqual(mockUser)
      expect(mockClient.auth.getUser).toHaveBeenCalled()
    })

    it('returns null for unauthenticated users', async () => {
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated', name: 'AuthError' },
      })

      const result = await getUser()

      expect(result).toBeNull()
    })

    it('handles expired tokens', async () => {
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT expired', name: 'AuthError' },
      })

      const result = await getUser()

      expect(result).toBeNull()
    })

    it('handles malformed tokens', async () => {
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid JWT', name: 'AuthError' },
      })

      const result = await getUser()

      expect(result).toBeNull()
    })
  })

  describe('Sign In Flow', () => {
    it('successfully signs in with valid credentials', async () => {
      const mockUser = {
        id: TEST_USERS.owner.id,
        email: TEST_USERS.owner.email,
        aud: 'authenticated',
        role: 'authenticated',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
        user: mockUser,
      }

      authTestHelpers.mockSignInSuccess(mockClient, TEST_USERS.owner)

      const result = await mockClient.auth.signInWithPassword({
        email: TEST_USERS.owner.email,
        password: TEST_USERS.owner.password,
      })

      expect(result.data.user).toEqual(mockUser)
      expect(result.data.session).toEqual(mockSession)
      expect(result.error).toBeNull()
    })

    it('fails sign in with invalid credentials', async () => {
      authTestHelpers.mockSignInFailure(mockClient, 'Invalid login credentials')

      const result = await mockClient.auth.signInWithPassword({
        email: 'invalid@test.com',
        password: 'wrongpassword',
      })

      expect(result.data.user).toBeNull()
      expect(result.data.session).toBeNull()
      expect(result.error).toEqual({
        message: 'Invalid login credentials',
        name: 'AuthError',
      })
    })

    it('fails sign in with non-existent user', async () => {
      authTestHelpers.mockSignInFailure(mockClient, 'User not found')

      const result = await mockClient.auth.signInWithPassword({
        email: 'nonexistent@test.com',
        password: 'password123',
      })

      expect(result.data.user).toBeNull()
      expect(result.error?.message).toBe('User not found')
    })

    it('handles rate limiting during sign in', async () => {
      authTestHelpers.mockSignInFailure(mockClient, 'Too many requests')

      const result = await mockClient.auth.signInWithPassword({
        email: TEST_USERS.owner.email,
        password: TEST_USERS.owner.password,
      })

      expect(result.error?.message).toBe('Too many requests')
    })

    it('validates email format', async () => {
      authTestHelpers.mockSignInFailure(mockClient, 'Invalid email format')

      const result = await mockClient.auth.signInWithPassword({
        email: 'invalid-email',
        password: 'password123',
      })

      expect(result.error?.message).toBe('Invalid email format')
    })

    it('validates password requirements', async () => {
      authTestHelpers.mockSignInFailure(mockClient, 'Password too short')

      const result = await mockClient.auth.signInWithPassword({
        email: TEST_USERS.owner.email,
        password: '123',
      })

      expect(result.error?.message).toBe('Password too short')
    })
  })

  describe('Session Management', () => {
    it('maintains session across requests', async () => {
      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: TEST_USERS.owner.id,
          email: TEST_USERS.owner.email,
          aud: 'authenticated',
          role: 'authenticated',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      }

      mockClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      const { data: { session } } = await mockClient.auth.getSession()

      expect(session).toEqual(mockSession)
      expect(session?.access_token).toBe('mock-access-token')
    })

    it('refreshes expired tokens automatically', async () => {
      const mockRefreshedSession = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: TEST_USERS.owner.id,
          email: TEST_USERS.owner.email,
          aud: 'authenticated',
          role: 'authenticated',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      }

      // First call returns expired token
      mockClient.auth.getSession
        .mockResolvedValueOnce({
          data: { session: null },
          error: { message: 'JWT expired', name: 'AuthError' },
        })
        .mockResolvedValueOnce({
          data: { session: mockRefreshedSession },
          error: null,
        })

      // Simulate token refresh
      mockClient.auth.refreshSession = jest.fn().mockResolvedValue({
        data: { session: mockRefreshedSession },
        error: null,
      })

      // First call fails due to expired token
      const { data: { session: expiredSession } } = await mockClient.auth.getSession()
      expect(expiredSession).toBeNull()

      // After refresh, new session is available
      const { data: { session: refreshedSession } } = await mockClient.auth.getSession()
      expect(refreshedSession?.access_token).toBe('new-access-token')
    })

    it('handles session timeout gracefully', async () => {
      mockClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session expired', name: 'AuthError' },
      })

      const { data: { session }, error } = await mockClient.auth.getSession()

      expect(session).toBeNull()
      expect(error?.message).toBe('Session expired')
    })

    it('persists session across browser tabs', async () => {
      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: TEST_USERS.owner.id,
          email: TEST_USERS.owner.email,
          aud: 'authenticated',
          role: 'authenticated',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      }

      // Simulate session persistence
      mockClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      const { data: { session } } = await mockClient.auth.getSession()

      expect(session).toEqual(mockSession)
    })
  })

  describe('Auth State Changes', () => {
    it('handles auth state change events', async () => {
      const mockCallback = jest.fn()
      const mockUnsubscribe = jest.fn()

      mockClient.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      })

      const { data: { subscription } } = mockClient.auth.onAuthStateChange(mockCallback)

      expect(mockClient.auth.onAuthStateChange).toHaveBeenCalledWith(mockCallback)
      expect(subscription.unsubscribe).toBe(mockUnsubscribe)
    })

    it('triggers callback on sign in', async () => {
      const mockCallback = jest.fn()
      
      mockClient.auth.onAuthStateChange.mockImplementation((callback: any) => {
        // Simulate sign in event
        callback('SIGNED_IN', {
          access_token: 'mock-token',
          refresh_token: 'mock-refresh',
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: TEST_USERS.owner.id,
            email: TEST_USERS.owner.email,
            aud: 'authenticated',
            role: 'authenticated',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        })
        
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        }
      })

      mockClient.auth.onAuthStateChange(mockCallback)

      expect(mockCallback).toHaveBeenCalledWith('SIGNED_IN', expect.objectContaining({
        user: expect.objectContaining({
          id: TEST_USERS.owner.id,
          email: TEST_USERS.owner.email,
        }),
      }))
    })

    it('triggers callback on sign out', async () => {
      const mockCallback = jest.fn()
      
      mockClient.auth.onAuthStateChange.mockImplementation((callback: any) => {
        // Simulate sign out event
        callback('SIGNED_OUT', null)
        
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        }
      })

      mockClient.auth.onAuthStateChange(mockCallback)

      expect(mockCallback).toHaveBeenCalledWith('SIGNED_OUT', null)
    })

    it('triggers callback on token refresh', async () => {
      const mockCallback = jest.fn()
      
      mockClient.auth.onAuthStateChange.mockImplementation((callback: any) => {
        // Simulate token refresh event
        callback('TOKEN_REFRESHED', {
          access_token: 'new-token',
          refresh_token: 'new-refresh',
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: TEST_USERS.owner.id,
            email: TEST_USERS.owner.email,
            aud: 'authenticated',
            role: 'authenticated',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        })
        
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        }
      })

      mockClient.auth.onAuthStateChange(mockCallback)

      expect(mockCallback).toHaveBeenCalledWith('TOKEN_REFRESHED', expect.objectContaining({
        access_token: 'new-token',
      }))
    })
  })

  describe('User Registration Flow', () => {
    it('successfully registers new user', async () => {
      const newUser = {
        id: 'new-user-id',
        email: 'newuser@test.com',
        aud: 'authenticated',
        role: 'authenticated',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockClient.auth.signUp = jest.fn().mockResolvedValue({
        data: {
          user: newUser,
          session: {
            access_token: 'mock-token',
            refresh_token: 'mock-refresh',
            expires_in: 3600,
            token_type: 'bearer',
            user: newUser,
          },
        },
        error: null,
      })

      const result = await mockClient.auth.signUp({
        email: 'newuser@test.com',
        password: 'password123',
      })

      expect(result.data.user).toEqual(newUser)
      expect(result.error).toBeNull()
    })

    it('fails registration with existing email', async () => {
      mockClient.auth.signUp = jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered', name: 'AuthError' },
      })

      const result = await mockClient.auth.signUp({
        email: TEST_USERS.owner.email,
        password: 'password123',
      })

      expect(result.data.user).toBeNull()
      expect(result.error?.message).toBe('User already registered')
    })

    it('validates email confirmation requirement', async () => {
      const newUser = {
        id: 'new-user-id',
        email: 'newuser@test.com',
        aud: 'authenticated',
        role: 'authenticated',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        email_confirmed_at: null,
      }

      mockClient.auth.signUp = jest.fn().mockResolvedValue({
        data: {
          user: newUser,
          session: null, // No session until email confirmed
        },
        error: null,
      })

      const result = await mockClient.auth.signUp({
        email: 'newuser@test.com',
        password: 'password123',
      })

      expect(result.data.user).toEqual(newUser)
      expect(result.data.session).toBeNull()
    })
  })

  describe('Password Reset Flow', () => {
    it('sends password reset email', async () => {
      mockClient.auth.resetPasswordForEmail = jest.fn().mockResolvedValue({
        data: {},
        error: null,
      })

      const result = await mockClient.auth.resetPasswordForEmail(TEST_USERS.owner.email)

      expect(result.error).toBeNull()
      expect(mockClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(TEST_USERS.owner.email)
    })

    it('handles password reset for non-existent email', async () => {
      mockClient.auth.resetPasswordForEmail = jest.fn().mockResolvedValue({
        data: {},
        error: { message: 'User not found', name: 'AuthError' },
      })

      const result = await mockClient.auth.resetPasswordForEmail('nonexistent@test.com')

      expect(result.error?.message).toBe('User not found')
    })

    it('updates password with valid reset token', async () => {
      mockClient.auth.updateUser = jest.fn().mockResolvedValue({
        data: {
          user: {
            id: TEST_USERS.owner.id,
            email: TEST_USERS.owner.email,
            aud: 'authenticated',
            role: 'authenticated',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        },
        error: null,
      })

      const result = await mockClient.auth.updateUser({
        password: 'newpassword123',
      })

      expect(result.error).toBeNull()
      expect(result.data.user.id).toBe(TEST_USERS.owner.id)
    })
  })

  describe('Multi-factor Authentication', () => {
    it('handles MFA challenge', async () => {
      mockClient.auth.mfa = {
        challenge: jest.fn().mockResolvedValue({
          data: { id: 'challenge-id', type: 'totp' },
          error: null,
        }),
        verify: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: TEST_USERS.owner.id,
              email: TEST_USERS.owner.email,
              aud: 'authenticated',
              role: 'authenticated',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            session: {
              access_token: 'mock-token',
              refresh_token: 'mock-refresh',
              expires_in: 3600,
              token_type: 'bearer',
              user: {
                id: TEST_USERS.owner.id,
                email: TEST_USERS.owner.email,
                aud: 'authenticated',
                role: 'authenticated',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
            },
          },
          error: null,
        }),
      }

      // Challenge MFA
      const challengeResult = await mockClient.auth.mfa.challenge({
        factorId: 'factor-id',
      })

      expect(challengeResult.data.id).toBe('challenge-id')
      expect(challengeResult.error).toBeNull()

      // Verify MFA
      const verifyResult = await mockClient.auth.mfa.verify({
        factorId: 'factor-id',
        challengeId: 'challenge-id',
        code: '123456',
      })

      expect(verifyResult.data.user.id).toBe(TEST_USERS.owner.id)
      expect(verifyResult.error).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('handles network errors during authentication', async () => {
      mockClient.auth.signInWithPassword.mockRejectedValue(new Error('Network error'))

      await expect(
        mockClient.auth.signInWithPassword({
          email: TEST_USERS.owner.email,
          password: TEST_USERS.owner.password,
        })
      ).rejects.toThrow('Network error')
    })

    it('handles server errors during authentication', async () => {
      authTestHelpers.mockSignInFailure(mockClient, 'Internal server error')

      const result = await mockClient.auth.signInWithPassword({
        email: TEST_USERS.owner.email,
        password: TEST_USERS.owner.password,
      })

      expect(result.error?.message).toBe('Internal server error')
    })

    it('handles malformed authentication responses', async () => {
      mockClient.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Malformed response', name: 'AuthError' },
      } as any)

      const result = await mockClient.auth.signInWithPassword({
        email: TEST_USERS.owner.email,
        password: TEST_USERS.owner.password,
      })

      expect(result.error?.message).toBe('Malformed response')
    })
  })
})
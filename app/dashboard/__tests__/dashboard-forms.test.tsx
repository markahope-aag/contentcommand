// @ts-nocheck
/**
 * @jest-environment jsdom
 */

// Polyfill for Radix UI (missing in jsdom)
beforeAll(() => {
  Element.prototype.hasPointerCapture = jest.fn().mockReturnValue(false)
  Element.prototype.setPointerCapture = jest.fn()
  Element.prototype.releasePointerCapture = jest.fn()
  Element.prototype.scrollIntoView = jest.fn()
  window.HTMLElement.prototype.scrollIntoView = jest.fn()
})

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import NewClientPage from '../clients/new/page'
import { createMockSupabaseClient, testDataFactory } from '@/lib/test-utils/database-test-framework'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

// Mock toast hook
const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: mockToast,
  })),
}))

// Mock sanitization functions
jest.mock('@/lib/sanitize', () => ({
  sanitizeString: jest.fn((str) => str?.trim()),
  sanitizeDomain: jest.fn((str) => str?.trim().toLowerCase()),
  sanitizeStringArray: jest.fn((arr) => arr?.filter(Boolean)),
}))

describe('Dashboard Forms', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    refresh: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    mockToast.mockClear()

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'org-123'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    })
  })

  describe('New Client Form', () => {
    beforeEach(() => {
      const mockClient = createMockSupabaseClient()
      require('@/lib/supabase/client').createClient.mockReturnValue(mockClient)
    })

    it('renders all form fields correctly', () => {
      render(<NewClientPage />)

      expect(screen.getByRole('heading', { name: /add new client/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/client name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/domain/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/industry/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/target keywords/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create client/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('validates required fields on empty submission', async () => {
      const mockClient = createMockSupabaseClient()
      mockClient.rpc.mockResolvedValue({ data: null, error: null })
      require('@/lib/supabase/client').createClient.mockReturnValue(mockClient)

      render(<NewClientPage />)

      // Enter whitespace-only values that sanitize to empty
      const user = userEvent.setup()
      await user.type(screen.getByLabelText(/client name/i), '   ')
      await user.type(screen.getByLabelText(/domain/i), '   ')

      // Use fireEvent.submit to bypass HTML5 required validation
      const form = screen.getByRole('button', { name: /create client/i }).closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Validation error',
          description: 'Name and domain are required.',
          variant: 'destructive',
        })
      })
    })

    it('handles form submission successfully', async () => {
      const user = userEvent.setup()
      const mockClient = createMockSupabaseClient()

      mockClient.rpc.mockResolvedValue({ data: null, error: null })
      require('@/lib/supabase/client').createClient.mockReturnValue(mockClient)

      render(<NewClientPage />)

      await user.type(screen.getByLabelText(/client name/i), 'Test Client')
      await user.type(screen.getByLabelText(/domain/i), 'testclient.com')
      await user.type(screen.getByLabelText(/industry/i), 'Technology')
      await user.type(screen.getByLabelText(/target keywords/i), 'saas, software, tech')

      await user.click(screen.getByRole('button', { name: /create client/i }))

      await waitFor(() => {
        expect(mockClient.rpc).toHaveBeenCalledWith('create_client_with_owner', {
          client_name: 'Test Client',
          client_domain: 'testclient.com',
          client_industry: 'Technology',
          client_target_keywords: ['saas', 'software', 'tech'],
          client_brand_voice: null,
          p_org_id: 'org-123',
        })
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Client created',
        description: 'Test Client has been added.',
      })

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/clients')
      expect(mockRouter.refresh).toHaveBeenCalled()
    })

    it('handles form submission errors', async () => {
      const user = userEvent.setup()
      const mockClient = createMockSupabaseClient()

      mockClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      })
      require('@/lib/supabase/client').createClient.mockReturnValue(mockClient)

      render(<NewClientPage />)

      await user.type(screen.getByLabelText(/client name/i), 'Test Client')
      await user.type(screen.getByLabelText(/domain/i), 'testclient.com')
      await user.click(screen.getByRole('button', { name: /create client/i }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Failed to create client',
          description: 'Database connection failed',
          variant: 'destructive',
        })
      })
    })

    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      const mockClient = createMockSupabaseClient()

      mockClient.rpc.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ data: null, error: null }), 100))
      )
      require('@/lib/supabase/client').createClient.mockReturnValue(mockClient)

      render(<NewClientPage />)

      await user.type(screen.getByLabelText(/client name/i), 'Test Client')
      await user.type(screen.getByLabelText(/domain/i), 'testclient.com')

      await user.click(screen.getByRole('button', { name: /create client/i }))

      // Button text changes to "Creating..." during loading
      expect(screen.getByText(/creating.../i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /creating.../i })).toBeDisabled()

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalled()
      })
    })

    it('handles cancel button correctly', async () => {
      const user = userEvent.setup()
      render(<NewClientPage />)

      await user.click(screen.getByRole('button', { name: /cancel/i }))
      expect(mockRouter.back).toHaveBeenCalled()
    })

    it('enforces field length limits', () => {
      render(<NewClientPage />)

      expect(screen.getByLabelText(/client name/i)).toHaveAttribute('maxLength', '200')
      expect(screen.getByLabelText(/domain/i)).toHaveAttribute('maxLength', '200')
      expect(screen.getByLabelText(/industry/i)).toHaveAttribute('maxLength', '100')
      expect(screen.getByLabelText(/target keywords/i)).toHaveAttribute('maxLength', '1000')
    })

    it('processes keywords correctly', async () => {
      const user = userEvent.setup()
      const mockClient = createMockSupabaseClient()

      mockClient.rpc.mockResolvedValue({ data: null, error: null })
      require('@/lib/supabase/client').createClient.mockReturnValue(mockClient)

      render(<NewClientPage />)

      await user.type(screen.getByLabelText(/client name/i), 'Test Client')
      await user.type(screen.getByLabelText(/domain/i), 'testclient.com')
      await user.type(screen.getByLabelText(/target keywords/i), 'keyword1, keyword2,  , keyword3,')

      await user.click(screen.getByRole('button', { name: /create client/i }))

      await waitFor(() => {
        expect(mockClient.rpc).toHaveBeenCalledWith('create_client_with_owner',
          expect.objectContaining({
            client_target_keywords: ['keyword1', 'keyword2', 'keyword3'],
          })
        )
      })
    })
  })

  describe('New Content Brief Form', () => {
    // NewBriefPage uses dynamic import for Supabase client and Radix UI Select.
    // We use jest.isolateModules and lazy-load to test it properly.
    let NewBriefPage: React.ComponentType

    const mockClients = [
      testDataFactory.client({ id: 'client-1', name: 'Client 1' }),
      testDataFactory.client({ id: 'client-2', name: 'Client 2' }),
    ]

    beforeEach(() => {
      // Re-import fresh module for each test
      NewBriefPage = require('../content/briefs/new/page').default

      const mockClient = createMockSupabaseClient()

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'clients') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockClients,
                error: null,
              }),
            }),
          }
        }

        if (table === 'content_briefs') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: testDataFactory.contentBrief({ id: 'brief-123' }),
                  error: null,
                }),
              }),
            }),
          }
        }

        return mockClient.from(table)
      })

      require('@/lib/supabase/client').createClient.mockReturnValue(mockClient)

      global.fetch = jest.fn()
    })

    it('renders form with heading and tabs', async () => {
      render(<NewBriefPage />)

      expect(screen.getByRole('heading', { name: /new content brief/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /ai generate/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /manual/i })).toBeInTheDocument()
    })

    it('loads clients from Supabase', async () => {
      render(<NewBriefPage />)

      // The component fetches clients on mount via dynamic import
      await waitFor(() => {
        expect(screen.getByText('Select a client')).toBeInTheDocument()
      })
    })

    it('displays client options when select is opened', async () => {
      const user = userEvent.setup()
      render(<NewBriefPage />)

      await waitFor(() => {
        expect(screen.getByText('Select a client')).toBeInTheDocument()
      })

      // Click the select trigger to open dropdown
      const comboboxes = screen.getAllByRole('combobox')
      await user.click(comboboxes[0])

      await waitFor(() => {
        expect(screen.getByText('Client 1')).toBeInTheDocument()
        expect(screen.getByText('Client 2')).toBeInTheDocument()
      })
    })

    it('handles AI generation successfully', async () => {
      const user = userEvent.setup()

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: { id: 'brief-ai-123' }
        }),
      })

      render(<NewBriefPage />)

      await waitFor(() => {
        expect(screen.getByText('Select a client')).toBeInTheDocument()
      })

      // Select client via the combobox
      const comboboxes = screen.getAllByRole('combobox')
      await user.click(comboboxes[0])
      await user.click(screen.getByText('Client 1'))

      // Enter target keyword
      await user.type(screen.getByLabelText(/target keyword/i), 'best project management')

      // Click generate
      await user.click(screen.getByRole('button', { name: /generate brief with ai/i }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/content/briefs/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: 'client-1',
            targetKeyword: 'best project management',
            contentType: 'blog_post',
          }),
        })
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Brief generated',
        description: 'Your AI-powered brief is ready.',
      })

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/content/briefs/brief-ai-123')
    })

    it('handles AI generation errors', async () => {
      const user = userEvent.setup()

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({
          error: 'Rate limit exceeded'
        }),
      })

      render(<NewBriefPage />)

      await waitFor(() => {
        expect(screen.getByText('Select a client')).toBeInTheDocument()
      })

      const comboboxes = screen.getAllByRole('combobox')
      await user.click(comboboxes[0])
      await user.click(screen.getByText('Client 1'))
      await user.type(screen.getByLabelText(/target keyword/i), 'test keyword')
      await user.click(screen.getByRole('button', { name: /generate brief with ai/i }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Generation failed',
          description: 'Rate limit exceeded',
          variant: 'destructive',
        })
      })
    })

    it('validates AI generation form', async () => {
      const user = userEvent.setup()
      render(<NewBriefPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /generate brief with ai/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /generate brief with ai/i }))

      await waitFor(() => {
        expect(screen.getByText('Please select a client and enter a target keyword')).toBeInTheDocument()
      })
    })

    it('handles manual brief creation successfully', async () => {
      const user = userEvent.setup()
      render(<NewBriefPage />)

      // Switch to manual tab
      await user.click(screen.getByRole('tab', { name: /manual/i }))

      await waitFor(() => {
        expect(screen.getByText('Select a client')).toBeInTheDocument()
      })

      // Select client
      const comboboxes = screen.getAllByRole('combobox')
      await user.click(comboboxes[0])
      await user.click(screen.getByText('Client 1'))

      // Fill out manual form
      await user.type(screen.getByLabelText(/title/i), 'Manual Brief Title')
      await user.type(screen.getByLabelText(/target keyword/i), 'manual keyword')
      await user.type(screen.getByLabelText(/target audience/i), 'Marketing professionals')
      await user.type(screen.getByLabelText(/unique angle/i), 'Comprehensive guide with examples')
      await user.clear(screen.getByLabelText(/target word count/i))
      await user.type(screen.getByLabelText(/target word count/i), '2000')

      // Submit manual form
      await user.click(screen.getByRole('button', { name: /create brief/i }))

      await waitFor(() => {
        const mockClient = require('@/lib/supabase/client').createClient()
        expect(mockClient.from).toHaveBeenCalledWith('content_briefs')
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Brief created',
        description: 'Your content brief has been saved.',
      })

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/content/briefs/brief-123')
    })

    it('validates manual form fields', async () => {
      const user = userEvent.setup()
      render(<NewBriefPage />)

      await user.click(screen.getByRole('tab', { name: /manual/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create brief/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /create brief/i }))

      await waitFor(() => {
        expect(screen.getByText('Please fill in required fields')).toBeInTheDocument()
      })
    })

    it('shows loading states correctly', async () => {
      const user = userEvent.setup()

      ;(global.fetch as jest.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ data: { id: 'brief-123' } })
        }), 100))
      )

      render(<NewBriefPage />)

      await waitFor(() => {
        expect(screen.getByText('Select a client')).toBeInTheDocument()
      })

      const comboboxes = screen.getAllByRole('combobox')
      await user.click(comboboxes[0])
      await user.click(screen.getByText('Client 1'))
      await user.type(screen.getByLabelText(/target keyword/i), 'test keyword')

      await user.click(screen.getByRole('button', { name: /generate brief with ai/i }))

      // Check loading state
      expect(screen.getByText(/generating brief.../i)).toBeInTheDocument()

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalled()
      })
    })

    it('renders content type select with default value', async () => {
      render(<NewBriefPage />)

      await waitFor(() => {
        expect(screen.getByText('Select a client')).toBeInTheDocument()
      })

      // Content type select should show default value "Blog Post"
      expect(screen.getByText('Blog Post')).toBeInTheDocument()

      // Should have two comboboxes: Client and Content Type
      const comboboxes = screen.getAllByRole('combobox')
      expect(comboboxes).toHaveLength(2)
    })
  })

  describe('Form Accessibility', () => {
    it('has proper form labels and associations', () => {
      render(<NewClientPage />)

      expect(screen.getByLabelText(/client name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/domain/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/industry/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/target keywords/i)).toBeInTheDocument()
    })

    it('has proper form validation attributes', () => {
      render(<NewClientPage />)

      const nameInput = screen.getByLabelText(/client name/i)
      const domainInput = screen.getByLabelText(/domain/i)

      expect(nameInput).toHaveAttribute('required')
      expect(domainInput).toHaveAttribute('required')
    })

    it('provides helpful placeholder text', () => {
      render(<NewClientPage />)

      expect(screen.getByPlaceholderText('Acme Corp')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('acme.com')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Technology, Healthcare, etc.')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('keyword1, keyword2, keyword3')).toBeInTheDocument()
    })

    it('has proper button roles and states', () => {
      render(<NewClientPage />)

      const submitButton = screen.getByRole('button', { name: /create client/i })
      const cancelButton = screen.getByRole('button', { name: /cancel/i })

      expect(submitButton).toHaveAttribute('type', 'submit')
      expect(cancelButton).toHaveAttribute('type', 'button')
      expect(submitButton).toBeEnabled()
      expect(cancelButton).toBeEnabled()
    })
  })

  describe('Form Responsive Behavior', () => {
    it('has responsive layout classes', () => {
      const { container } = render(<NewClientPage />)

      expect(container.querySelector('.mx-auto.max-w-2xl')).toBeInTheDocument()
      expect(container.querySelector('.space-y-6')).toBeInTheDocument()
      expect(container.querySelector('.space-y-4')).toBeInTheDocument()
    })

    it('handles mobile-friendly form layout', () => {
      const NewBriefPage = require('../content/briefs/new/page').default
      const { container } = render(<NewBriefPage />)

      expect(container.querySelector('.max-w-2xl')).toBeInTheDocument()
      expect(container.querySelector('.space-y-6')).toBeInTheDocument()
    })
  })
})

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

import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter, usePathname } from 'next/navigation'
import { createMockSupabaseClient, testDataFactory } from '@/lib/test-utils/database-test-framework'

// Import pages for integration testing
import DashboardPage from '../page'
import ClientsPage from '../clients/page'
import NewClientPage from '../clients/new/page'
import ContentPage from '../content/page'
import { AppSidebar } from '@/components/dashboard/app-sidebar'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  redirect: jest.fn(),
}))

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

// Mock queries
jest.mock('@/lib/supabase/queries', () => ({
  getContentPipelineStats: jest.fn(),
  getContentQueue: jest.fn(),
  getAiUsageSummary: jest.fn(),
  getClients: jest.fn(),
  getAllContentBriefs: jest.fn(),
}))

// Mock auth actions
jest.mock('@/lib/auth/actions', () => ({
  getUser: jest.fn(),
  signOut: jest.fn(),
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

// Mock components with simpler implementations for integration testing
jest.mock('@/components/content/pipeline-status', () => ({
  PipelineStatus: ({ stats }: { stats: any }) => (
    <div data-testid="pipeline-status">
      <div data-testid="pipeline-total">{stats.total}</div>
      <div data-testid="pipeline-draft">{stats.draft}</div>
      <div data-testid="pipeline-approved">{stats.approved}</div>
    </div>
  ),
}))

jest.mock('@/components/dashboard/org-switcher', () => ({
  OrgSwitcher: () => <div data-testid="org-switcher">Current Org</div>,
}))

jest.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-provider">{children}</div>
  ),
  SidebarTrigger: () => <button data-testid="sidebar-trigger">Toggle</button>,
  Sidebar: ({ children }: { children: React.ReactNode }) => (
    <nav data-testid="sidebar" role="navigation">{children}</nav>
  ),
  SidebarContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-content">{children}</div>
  ),
  SidebarHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="sidebar-header" className={className}>{children}</div>
  ),
  SidebarFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="sidebar-footer" className={className}>{children}</div>
  ),
  SidebarGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-group">{children}</div>
  ),
  SidebarGroupLabel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-group-label">{children}</div>
  ),
  SidebarGroupContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-group-content">{children}</div>
  ),
  SidebarMenu: ({ children }: { children: React.ReactNode }) => (
    <ul data-testid="sidebar-menu">{children}</ul>
  ),
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => (
    <li data-testid="sidebar-menu-item">{children}</li>
  ),
  SidebarMenuButton: ({ children, asChild, isActive }: any) => {
    if (asChild) return <div data-active={isActive}>{children}</div>
    return <button data-testid="sidebar-menu-button" data-active={isActive}>{children}</button>
  },
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, width, height }: any) => (
    <img src={src} alt={alt} width={width} height={height} />
  ),
}))

describe('Dashboard Integration Workflows', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    refresh: jest.fn(),
  }

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockToast.mockClear()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(usePathname as jest.Mock).mockReturnValue('/dashboard')

    // Mock auth
    require('@/lib/auth/actions').getUser.mockResolvedValue(mockUser)

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'org-123'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    })

    // Mock fetch for API calls
    global.fetch = jest.fn()
  })

  afterEach(() => {
    cleanup()
  })

  describe('Complete Client Creation Workflow', () => {
    it('navigates from dashboard to client creation and back', async () => {
      const user = userEvent.setup()

      // Step 1: Render dashboard showing empty state
      require('@/lib/supabase/queries').getContentPipelineStats.mockResolvedValue({
        total: 0, draft: 0, approved: 0, generating: 0, generated: 0,
      })
      require('@/lib/supabase/queries').getContentQueue.mockResolvedValue({ data: [] })
      require('@/lib/supabase/queries').getAiUsageSummary.mockResolvedValue({
        totalCost: 0, totalInputTokens: 0, totalOutputTokens: 0,
      })

      const mockClient = createMockSupabaseClient()
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({ count: 0 }),
      })
      require('@/lib/supabase/server').createClient.mockResolvedValue(mockClient)

      const { unmount } = render(await DashboardPage())
      expect(screen.getByText('No content yet')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /create brief/i })).toBeInTheDocument()
      unmount()

      // Step 2: Render clients page showing empty state
      require('@/lib/supabase/queries').getClients.mockResolvedValue({ data: [] })
      const { unmount: unmount2 } = render(await ClientsPage())

      expect(screen.getByRole('heading', { level: 1, name: /clients/i })).toBeInTheDocument()
      expect(screen.getByText('No clients yet')).toBeInTheDocument()
      // "Add Client" appears twice: header button + empty state action
      const addClientButtons = screen.getAllByRole('link', { name: /add client/i })
      expect(addClientButtons.length).toBeGreaterThanOrEqual(1)
      expect(addClientButtons[0]).toHaveAttribute('href', '/dashboard/clients/new')
      unmount2()

      // Step 3: Render new client form and submit
      const mockClientForCreation = createMockSupabaseClient()
      mockClientForCreation.rpc.mockResolvedValue({ data: null, error: null })
      require('@/lib/supabase/client').createClient.mockReturnValue(mockClientForCreation)

      render(<NewClientPage />)
      expect(screen.getByRole('heading', { name: /add new client/i })).toBeInTheDocument()

      await user.type(screen.getByLabelText(/client name/i), 'Test Client')
      await user.type(screen.getByLabelText(/domain/i), 'testclient.com')
      await user.type(screen.getByLabelText(/industry/i), 'Technology')

      await user.click(screen.getByRole('button', { name: /create client/i }))

      await waitFor(() => {
        expect(mockClientForCreation.rpc).toHaveBeenCalledWith('create_client_with_owner', {
          client_name: 'Test Client',
          client_domain: 'testclient.com',
          client_industry: 'Technology',
          client_target_keywords: null,
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

    it('handles client creation errors gracefully', async () => {
      const user = userEvent.setup()

      const mockClient = createMockSupabaseClient()
      mockClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Client with this domain already exists' }
      })
      require('@/lib/supabase/client').createClient.mockReturnValue(mockClient)

      render(<NewClientPage />)

      await user.type(screen.getByLabelText(/client name/i), 'Duplicate Client')
      await user.type(screen.getByLabelText(/domain/i), 'existing.com')
      await user.click(screen.getByRole('button', { name: /create client/i }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Failed to create client',
          description: 'Client with this domain already exists',
          variant: 'destructive',
        })
      })

      // Should stay on form page
      expect(screen.getByRole('heading', { name: /add new client/i })).toBeInTheDocument()
    })
  })

  describe('Content Brief Creation Workflow', () => {
    const mockClients = [
      testDataFactory.client({ id: 'client-1', name: 'Test Client 1' }),
      testDataFactory.client({ id: 'client-2', name: 'Test Client 2' }),
    ]

    let NewBriefPage: React.ComponentType

    beforeEach(() => {
      NewBriefPage = require('../content/briefs/new/page').default

      // Mock clients for brief creation
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
    })

    it('completes AI-powered brief generation workflow', async () => {
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

      // Select client via combobox (first one)
      const comboboxes = screen.getAllByRole('combobox')
      await user.click(comboboxes[0])
      await user.click(screen.getByText('Test Client 1'))

      // Enter target keyword
      await user.type(screen.getByLabelText(/target keyword/i), 'project management software')

      // Generate brief with AI
      await user.click(screen.getByRole('button', { name: /generate brief with ai/i }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/content/briefs/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: 'client-1',
            targetKeyword: 'project management software',
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

    it('completes manual brief creation workflow', async () => {
      const user = userEvent.setup()

      render(<NewBriefPage />)

      await waitFor(() => {
        expect(screen.getByText('Select a client')).toBeInTheDocument()
      })

      // Switch to manual tab
      await user.click(screen.getByRole('tab', { name: /manual/i }))

      // Select client
      const comboboxes = screen.getAllByRole('combobox')
      await user.click(comboboxes[0])
      await user.click(screen.getByText('Test Client 1'))

      // Fill out manual form
      await user.type(screen.getByLabelText(/title/i), 'Complete Guide to Project Management')
      await user.type(screen.getByLabelText(/target keyword/i), 'project management guide')
      await user.type(screen.getByLabelText(/target audience/i), 'Project managers and team leads')
      await user.type(screen.getByLabelText(/unique angle/i), 'Focus on remote team management')

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

    it('handles brief creation validation errors', async () => {
      const user = userEvent.setup()

      render(<NewBriefPage />)

      // Try to generate AI brief without required fields
      await user.click(screen.getByRole('button', { name: /generate brief with ai/i }))

      await waitFor(() => {
        expect(screen.getByText('Please select a client and enter a target keyword')).toBeInTheDocument()
      })

      // Switch to manual and try without required fields
      await user.click(screen.getByRole('tab', { name: /manual/i }))
      await user.click(screen.getByRole('button', { name: /create brief/i }))

      await waitFor(() => {
        expect(screen.getByText('Please fill in required fields')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation Flow Between Pages', () => {
    it('maintains navigation state across page transitions', () => {
      // Start with dashboard navigation
      ;(usePathname as jest.Mock).mockReturnValue('/dashboard')
      const { unmount } = render(<AppSidebar />)

      const dashboardLink = screen.getByRole('link', { name: /^dashboard$/i })
      expect(dashboardLink.closest('[data-active="true"]')).toBeInTheDocument()
      unmount()

      // Navigate to clients
      ;(usePathname as jest.Mock).mockReturnValue('/dashboard/clients')
      const { unmount: unmount2 } = render(<AppSidebar />)

      const clientsLink = screen.getByRole('link', { name: /clients/i })
      expect(clientsLink.closest('[data-active="true"]')).toBeInTheDocument()
      unmount2()

      // Navigate to nested client page
      ;(usePathname as jest.Mock).mockReturnValue('/dashboard/clients/new')
      render(<AppSidebar />)

      // Clients should still be active for nested route
      const clientsLinkNested = screen.getByRole('link', { name: /clients/i })
      expect(clientsLinkNested.closest('[data-active="true"]')).toBeInTheDocument()
    })

    it('handles breadcrumb-like navigation patterns', async () => {
      const user = userEvent.setup()

      render(<NewClientPage />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockRouter.back).toHaveBeenCalled()
    })
  })

  describe('Data Flow Between Pages', () => {
    it('shows updated data after client creation', async () => {
      // Step 1: Start with empty clients list
      require('@/lib/supabase/queries').getClients.mockResolvedValue({ data: [] })

      const { unmount } = render(await ClientsPage())
      expect(screen.getByText('No clients yet')).toBeInTheDocument()
      unmount()

      // Step 2: After client creation, should show updated list
      const newClient = testDataFactory.client({ name: 'Newly Created Client' })
      require('@/lib/supabase/queries').getClients.mockResolvedValue({
        data: [newClient]
      })

      render(await ClientsPage())
      expect(screen.getByText('Newly Created Client')).toBeInTheDocument()
    })

    it('reflects content brief creation in content page', async () => {
      // Step 1: Start with empty briefs
      require('@/lib/supabase/queries').getAllContentBriefs.mockResolvedValue({ data: [] })
      require('@/lib/supabase/queries').getContentPipelineStats.mockResolvedValue({
        total: 0, draft: 0, approved: 0, generating: 0, generated: 0,
      })

      const { unmount } = render(await ContentPage())
      expect(screen.getByText('No briefs yet')).toBeInTheDocument()
      unmount()

      // Step 2: After brief creation, should show updated content
      const newBrief = testDataFactory.contentBrief({ title: 'New Content Brief' })
      require('@/lib/supabase/queries').getAllContentBriefs.mockResolvedValue({
        data: [newBrief]
      })
      require('@/lib/supabase/queries').getContentPipelineStats.mockResolvedValue({
        total: 1, draft: 1, approved: 0, generating: 0, generated: 0,
      })

      render(await ContentPage())
      expect(screen.getByText('New Content Brief')).toBeInTheDocument()
    })
  })

  describe('Error Handling Across Workflows', () => {
    it('handles network errors gracefully during workflows', async () => {
      const user = userEvent.setup()

      // Mock network error
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const mockClient = createMockSupabaseClient()
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'clients') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [testDataFactory.client({ id: 'client-1', name: 'Test Client' })],
                error: null,
              }),
            }),
          }
        }
        return mockClient.from(table)
      })
      require('@/lib/supabase/client').createClient.mockReturnValue(mockClient)

      const NewBriefPage = require('../content/briefs/new/page').default
      render(<NewBriefPage />)

      await waitFor(() => {
        expect(screen.getByText('Select a client')).toBeInTheDocument()
      })

      // Select a client via combobox
      const comboboxes = screen.getAllByRole('combobox')
      await user.click(comboboxes[0])
      await user.click(screen.getByText('Test Client'))

      await user.type(screen.getByLabelText(/target keyword/i), 'test keyword')
      await user.click(screen.getByRole('button', { name: /generate brief with ai/i }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Generation failed',
          description: 'Network error',
          variant: 'destructive',
        })
      })

      // Form should remain usable
      expect(screen.getByRole('button', { name: /generate brief with ai/i })).toBeEnabled()
    })

    it('handles authentication errors during workflows', async () => {
      const user = userEvent.setup()

      // Mock authentication error
      const mockClient = createMockSupabaseClient()
      mockClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Authentication failed', code: 'PGRST301' }
      })
      require('@/lib/supabase/client').createClient.mockReturnValue(mockClient)

      render(<NewClientPage />)

      await user.type(screen.getByLabelText(/client name/i), 'Test Client')
      await user.type(screen.getByLabelText(/domain/i), 'test.com')
      await user.click(screen.getByRole('button', { name: /create client/i }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Failed to create client',
          description: 'Authentication failed',
          variant: 'destructive',
        })
      })
    })
  })

  describe('User Experience Flow', () => {
    it('provides consistent loading states across workflows', async () => {
      const user = userEvent.setup()

      // Mock delayed response
      const mockClient = createMockSupabaseClient()
      mockClient.rpc.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ data: null, error: null }), 100))
      )
      require('@/lib/supabase/client').createClient.mockReturnValue(mockClient)

      render(<NewClientPage />)

      await user.type(screen.getByLabelText(/client name/i), 'Test Client')
      await user.type(screen.getByLabelText(/domain/i), 'test.com')

      await user.click(screen.getByRole('button', { name: /create client/i }))

      // Should show loading state
      expect(screen.getByText(/creating.../i)).toBeInTheDocument()

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalled()
      })
    })

    it('provides helpful feedback throughout workflows', async () => {
      const user = userEvent.setup()
      const NewBriefPage = require('../content/briefs/new/page').default

      render(<NewBriefPage />)

      // Should show helpful placeholder text
      expect(screen.getByPlaceholderText('e.g., best project management software')).toBeInTheDocument()

      // Should show validation messages
      await user.click(screen.getByRole('button', { name: /generate brief with ai/i }))

      await waitFor(() => {
        expect(screen.getByText('Please select a client and enter a target keyword')).toBeInTheDocument()
      })
    })
  })

  describe('Multi-Step Workflow Completion', () => {
    it('completes full content creation workflow', async () => {
      const user = userEvent.setup()

      // Step 1: Create client first
      const mockClient = createMockSupabaseClient()
      mockClient.rpc.mockResolvedValue({ data: null, error: null })
      require('@/lib/supabase/client').createClient.mockReturnValue(mockClient)

      const { unmount } = render(<NewClientPage />)

      await user.type(screen.getByLabelText(/client name/i), 'Content Client')
      await user.type(screen.getByLabelText(/domain/i), 'contentclient.com')
      await user.click(screen.getByRole('button', { name: /create client/i }))

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/clients')
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Client created',
        description: 'Content Client has been added.',
      })
      unmount()

      // Step 2: Create content brief
      const createdClient = testDataFactory.client({
        id: 'content-client-1',
        name: 'Content Client'
      })

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'clients') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [createdClient],
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
                  data: testDataFactory.contentBrief({ id: 'brief-final' }),
                  error: null,
                }),
              }),
            }),
          }
        }

        return mockClient.from(table)
      })

      const NewBriefPage = require('../content/briefs/new/page').default
      render(<NewBriefPage />)

      // Wait for client to load
      await waitFor(() => {
        expect(screen.getByText('Select a client')).toBeInTheDocument()
      })

      // Switch to manual tab, select client, fill form
      await user.click(screen.getByRole('tab', { name: /manual/i }))

      const comboboxes = screen.getAllByRole('combobox')
      await user.click(comboboxes[0])
      await user.click(screen.getByText('Content Client'))

      await user.type(screen.getByLabelText(/title/i), 'First Content Brief')
      await user.type(screen.getByLabelText(/target keyword/i), 'content marketing')
      await user.click(screen.getByRole('button', { name: /create brief/i }))

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/content/briefs/brief-final')
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Brief created',
        description: 'Your content brief has been saved.',
      })
    })
  })

  describe('Accessibility in Workflows', () => {
    it('maintains focus management throughout workflows', async () => {
      const user = userEvent.setup()

      render(<NewClientPage />)

      // Focus should be manageable throughout form
      const nameInput = screen.getByLabelText(/client name/i)
      nameInput.focus()
      expect(nameInput).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText(/domain/i)).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText(/industry/i)).toHaveFocus()
    })

    it('provides proper error announcements', async () => {
      const user = userEvent.setup()
      const NewBriefPage = require('../content/briefs/new/page').default

      render(<NewBriefPage />)

      await user.click(screen.getByRole('button', { name: /generate brief with ai/i }))

      await waitFor(() => {
        const errorMessage = screen.getByText('Please select a client and enter a target keyword')
        expect(errorMessage).toBeInTheDocument()
        // Error should be visible and accessible
        expect(errorMessage).toHaveClass('text-destructive')
      })
    })
  })
})

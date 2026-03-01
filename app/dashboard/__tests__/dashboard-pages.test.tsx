/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import DashboardPage from '../page'
import ClientsPage from '../clients/page'
import ContentPage from '../content/page'
import { createMockSupabaseClient, testDataFactory } from '@/lib/test-utils/database-test-framework'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
  redirect: jest.fn(),
}))

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

// Mock queries
jest.mock('@/lib/supabase/queries', () => ({
  getContentPipelineStats: jest.fn(),
  getContentQueue: jest.fn(),
  getAiUsageSummary: jest.fn(),
  getClients: jest.fn(),
  getAllContentBriefs: jest.fn(),
  getIntegrationHealth: jest.fn(),
  getGoogleOAuthStatus: jest.fn(),
}))

// Mock auth actions
jest.mock('@/lib/auth/actions', () => ({
  getUser: jest.fn(),
  signOut: jest.fn(),
}))

// Mock components that have complex dependencies
jest.mock('@/components/content/pipeline-status', () => ({
  PipelineStatus: ({ stats }: { stats: any }) => (
    <div data-testid="pipeline-status">
      Pipeline Status: {stats.total} total
    </div>
  ),
}))

jest.mock('@/components/dashboard/org-switcher', () => ({
  OrgSwitcher: () => <div data-testid="org-switcher">Org Switcher</div>,
}))

jest.mock('@/components/integrations/health-status', () => ({
  HealthStatus: () => <div data-testid="health-status">Health Status</div>,
}))

describe('Dashboard Pages', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }

  const mockSearchParams = {
    get: jest.fn(),
    getAll: jest.fn(),
    has: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    entries: jest.fn(),
    forEach: jest.fn(),
    toString: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(usePathname as jest.Mock).mockReturnValue('/dashboard')
    ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)

    // Mock Supabase client
    const mockClient = createMockSupabaseClient()
    require('@/lib/supabase/server').createClient.mockResolvedValue(mockClient)

    // Mock auth
    require('@/lib/auth/actions').getUser.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
    })
  })

  describe('Dashboard Main Page', () => {
    beforeEach(() => {
      // Mock query responses
      require('@/lib/supabase/queries').getContentPipelineStats.mockResolvedValue({
        total: 10,
        draft: 3,
        approved: 2,
        generating: 1,
        generated: 4,
      })

      require('@/lib/supabase/queries').getContentQueue.mockResolvedValue({
        data: [
          testDataFactory.generatedContent({
            id: 'content-1',
            title: 'Test Content 1',
            status: 'generated',
            quality_score: 85,
          }),
          testDataFactory.generatedContent({
            id: 'content-2',
            title: 'Test Content 2',
            status: 'reviewing',
            quality_score: 92,
          }),
        ],
      })

      require('@/lib/supabase/queries').getAiUsageSummary.mockResolvedValue({
        totalCost: 45.67,
        totalInputTokens: 12500,
        totalOutputTokens: 8300,
      })
    })

    it('renders dashboard with all key metrics', async () => {
      // Mock count queries
      const mockClient = createMockSupabaseClient()
      mockClient.from.mockImplementation((table: string) => {
        const counts: Record<string, number> = {
          clients: 5,
          content_briefs: 12,
          generated_content: 8,
          ai_citations: 23,
        }

        return {
          select: jest.fn().mockReturnValue({
            count: counts[table] || 0,
          }),
        }
      })

      require('@/lib/supabase/server').createClient.mockResolvedValue(mockClient)

      render(await DashboardPage())

      // Check main heading
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument()

      // Check metric cards
      expect(screen.getByText('Total Clients')).toBeInTheDocument()
      expect(screen.getByText('Content Briefs')).toBeInTheDocument()
      expect(screen.getByText('Generated Content')).toBeInTheDocument()
      expect(screen.getByText('AI Citations')).toBeInTheDocument()

      // Check AI spend section
      expect(screen.getByText('AI Spend')).toBeInTheDocument()
      expect(screen.getByText('$45.67')).toBeInTheDocument()
      expect(screen.getByText('20.8k tokens used')).toBeInTheDocument()

      // Check pipeline status
      expect(screen.getByTestId('pipeline-status')).toBeInTheDocument()

      // Check recent content section
      expect(screen.getByText('Recent Content')).toBeInTheDocument()
    })

    it('shows empty state when no content exists', async () => {
      require('@/lib/supabase/queries').getContentQueue.mockResolvedValue({
        data: [],
      })

      const mockClient = createMockSupabaseClient()
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({ count: 0 }),
      })
      require('@/lib/supabase/server').createClient.mockResolvedValue(mockClient)

      render(await DashboardPage())

      expect(screen.getByText('No content yet')).toBeInTheDocument()
      expect(screen.getByText('Create your first content brief to start generating AI-powered content.')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /create brief/i })).toHaveAttribute('href', '/dashboard/content/briefs/new')
    })

    it('displays recent content items with quality scores', async () => {
      const mockClient = createMockSupabaseClient()
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({ count: 5 }),
      })
      require('@/lib/supabase/server').createClient.mockResolvedValue(mockClient)

      render(await DashboardPage())

      expect(screen.getByText('Test Content 1')).toBeInTheDocument()
      expect(screen.getByText('Test Content 2')).toBeInTheDocument()
      expect(screen.getByText('85/100')).toBeInTheDocument()
      expect(screen.getByText('92/100')).toBeInTheDocument()
      expect(screen.getByText('generated')).toBeInTheDocument()
      expect(screen.getByText('reviewing')).toBeInTheDocument()
    })

    it('has proper responsive grid layout', async () => {
      const mockClient = createMockSupabaseClient()
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({ count: 0 }),
      })
      require('@/lib/supabase/server').createClient.mockResolvedValue(mockClient)

      const { container } = render(await DashboardPage())

      // Check for responsive grid classes
      const metricsGrid = container.querySelector('.grid.gap-4.md\\:grid-cols-2.lg\\:grid-cols-4')
      expect(metricsGrid).toBeInTheDocument()

      const mainGrid = container.querySelector('.grid.gap-6.lg\\:grid-cols-2')
      expect(mainGrid).toBeInTheDocument()
    })
  })

  describe('Clients Page', () => {
    it('renders clients list when clients exist', async () => {
      const mockClients = [
        testDataFactory.client({ id: 'c1', name: 'Client 1', domain: 'client1.com', industry: 'Tech' }),
        testDataFactory.client({ id: 'c2', name: 'Client 2', domain: 'client2.com', industry: 'Finance' }),
      ]

      require('@/lib/supabase/queries').getClients.mockResolvedValue({
        data: mockClients,
      })

      render(await ClientsPage())

      expect(screen.getByRole('heading', { level: 1, name: /clients/i })).toBeInTheDocument()

      expect(screen.getByText('Client 1')).toBeInTheDocument()
      expect(screen.getByText('client1.com')).toBeInTheDocument()
      expect(screen.getByText('Tech')).toBeInTheDocument()

      expect(screen.getByText('Client 2')).toBeInTheDocument()
      expect(screen.getByText('client2.com')).toBeInTheDocument()
      expect(screen.getByText('Finance')).toBeInTheDocument()
    })

    it('shows empty state when no clients exist', async () => {
      require('@/lib/supabase/queries').getClients.mockResolvedValue({
        data: [],
      })

      render(await ClientsPage())

      expect(screen.getByText('No clients yet')).toBeInTheDocument()
      expect(screen.getByText('Add your first client to start tracking their content strategy and SEO performance.')).toBeInTheDocument()
    })

    it('has responsive grid layout for client cards', async () => {
      const mockClients = [
        testDataFactory.client({ id: 'c1', name: 'Client 1' }),
        testDataFactory.client({ id: 'c2', name: 'Client 2' }),
        testDataFactory.client({ id: 'c3', name: 'Client 3' }),
      ]

      require('@/lib/supabase/queries').getClients.mockResolvedValue({
        data: mockClients,
      })

      const { container } = render(await ClientsPage())

      const grid = container.querySelector('.grid.gap-4.md\\:grid-cols-2.lg\\:grid-cols-3')
      expect(grid).toBeInTheDocument()
    })

    it('client cards have hover effects and proper links', async () => {
      const mockClients = [
        testDataFactory.client({ id: 'client-1', name: 'Test Client' }),
      ]

      require('@/lib/supabase/queries').getClients.mockResolvedValue({
        data: mockClients,
      })

      render(await ClientsPage())

      const clientLink = screen.getByRole('link', { name: /test client/i })
      expect(clientLink).toHaveAttribute('href', '/dashboard/clients/client-1')

      // Check for hover effect class
      expect(clientLink.firstChild).toHaveClass('transition-shadow', 'hover:shadow-md')
    })

    it('has add client button linking to new page', async () => {
      require('@/lib/supabase/queries').getClients.mockResolvedValue({
        data: [],
      })

      render(await ClientsPage())

      // There may be multiple "Add Client" links (header + empty state)
      const addLinks = screen.getAllByRole('link', { name: /add client/i })
      expect(addLinks.length).toBeGreaterThanOrEqual(1)
      expect(addLinks[0]).toHaveAttribute('href', '/dashboard/clients/new')
    })
  })

  describe('Content Page', () => {
    beforeEach(() => {
      require('@/lib/supabase/queries').getContentPipelineStats.mockResolvedValue({
        total: 15,
        draft: 5,
        approved: 3,
        generating: 2,
        generated: 5,
      })
    })

    it('renders content page with pipeline status', async () => {
      const mockBriefs = [
        testDataFactory.contentBrief({
          id: 'b1',
          title: 'SEO Guide 2024',
          target_keyword: 'seo best practices',
          status: 'approved',
        }),
        testDataFactory.contentBrief({
          id: 'b2',
          title: 'Content Marketing Tips',
          target_keyword: 'content marketing',
          status: 'draft',
        }),
      ]

      require('@/lib/supabase/queries').getAllContentBriefs.mockResolvedValue({
        data: mockBriefs,
      })

      render(await ContentPage())

      expect(screen.getByRole('heading', { level: 1, name: /content/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /new brief/i })).toHaveAttribute('href', '/dashboard/content/briefs/new')
      expect(screen.getByRole('link', { name: /review queue/i })).toHaveAttribute('href', '/dashboard/content/review')

      expect(screen.getByTestId('pipeline-status')).toBeInTheDocument()
      expect(screen.getByText('Recent Briefs')).toBeInTheDocument()
      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    })

    it('displays recent briefs with proper formatting', async () => {
      const mockBriefs = [
        testDataFactory.contentBrief({
          id: 'brief-1',
          title: 'SEO Guide 2024',
          target_keyword: 'seo best practices',
          status: 'approved',
        }),
      ]

      require('@/lib/supabase/queries').getAllContentBriefs.mockResolvedValue({
        data: mockBriefs,
      })

      render(await ContentPage())

      const briefLink = screen.getByRole('link', { name: /seo guide 2024/i })
      expect(briefLink).toHaveAttribute('href', '/dashboard/content/briefs/brief-1')
      expect(screen.getByText('seo best practices')).toBeInTheDocument()
      expect(screen.getByText('approved')).toBeInTheDocument()
    })

    it('shows empty state when no briefs exist', async () => {
      require('@/lib/supabase/queries').getAllContentBriefs.mockResolvedValue({
        data: [],
      })

      render(await ContentPage())

      expect(screen.getByText('No briefs yet')).toBeInTheDocument()
      expect(screen.getByText('Create your first content brief to start generating AI-powered content.')).toBeInTheDocument()
    })

    it('shows "View all briefs" link when more than 5 briefs exist', async () => {
      const mockBriefs = Array.from({ length: 7 }, (_, i) =>
        testDataFactory.contentBrief({ id: `brief-${i}`, title: `Brief ${i + 1}` })
      )

      require('@/lib/supabase/queries').getAllContentBriefs.mockResolvedValue({
        data: mockBriefs,
      })

      render(await ContentPage())

      expect(screen.getByRole('link', { name: /view all briefs/i })).toHaveAttribute('href', '/dashboard/content/briefs')
    })

    it('has proper responsive layout', async () => {
      require('@/lib/supabase/queries').getAllContentBriefs.mockResolvedValue({
        data: [],
      })

      const { container } = render(await ContentPage())

      const grid = container.querySelector('.grid.gap-4.md\\:grid-cols-2')
      expect(grid).toBeInTheDocument()
    })
  })

  describe('Analytics Page', () => {
    it('renders analytics page structure', async () => {
      // AnalyticsPage has heavy import chain. Mock all required queries.
      require('@/lib/supabase/queries').getClients.mockResolvedValue({ data: [] })
      require('@/lib/supabase/queries').getContentPipelineStats.mockResolvedValue({
        total: 0, draft: 0, approved: 0, generating: 0, generated: 0,
      })
      require('@/lib/supabase/queries').getAiUsageSummary.mockResolvedValue({
        totalCost: 0, totalInputTokens: 0, totalOutputTokens: 0,
      })
      require('@/lib/supabase/queries').getAllContentBriefs.mockResolvedValue({
        data: [], count: 0,
      })
      require('@/lib/supabase/queries').getContentQueue.mockResolvedValue({ data: [] })
      require('@/lib/supabase/queries').getIntegrationHealth.mockResolvedValue([])

      // Lazy import to avoid heavy module loading up front
      const AnalyticsPage = require('../analytics/page').default
      render(await AnalyticsPage())

      expect(screen.getByRole('heading', { name: /analytics/i })).toBeInTheDocument()
    })
  })

  describe('Integrations Page', () => {
    beforeEach(() => {
      require('@/lib/supabase/queries').getIntegrationHealth.mockResolvedValue([])
      require('@/lib/supabase/queries').getClients.mockResolvedValue({ data: [] })

      // Need to mock getGoogleOAuthStatus
      require('@/lib/supabase/queries').getGoogleOAuthStatus.mockResolvedValue([])

      // Need auth user for this page
      const mockClient = createMockSupabaseClient()
      mockClient.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null,
      }) as any
      require('@/lib/supabase/server').createClient.mockResolvedValue(mockClient)
    })

    it('renders integrations page with health status', async () => {
      // Mock the IntegrationsClient component to avoid complex import chains
      jest.mock('../integrations/integrations-client', () => ({
        IntegrationsClient: () => <div data-testid="integrations-client">Integrations Client</div>,
      }))

      const IntegrationsPage = require('../integrations/page').default
      render(await IntegrationsPage())

      expect(screen.getByRole('heading', { name: /integrations/i })).toBeInTheDocument()
      expect(screen.getByTestId('health-status')).toBeInTheDocument()
    })
  })

  describe('Settings Page', () => {
    it('redirects to organization settings', async () => {
      const { redirect } = require('next/navigation')

      const SettingsPage = require('../settings/page').default

      try {
        render(await SettingsPage())
      } catch {
        // redirect may throw in test environment
      }

      expect(redirect).toHaveBeenCalledWith('/dashboard/settings/organization')
    })
  })

  describe('Page Loading States', () => {
    it('handles loading states gracefully', async () => {
      // Mock slow query (but it resolves)
      require('@/lib/supabase/queries').getClients.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: [] }), 100))
      )

      render(await ClientsPage())

      // Page should still render with loading handled by Suspense boundaries
      expect(screen.getByRole('heading', { level: 1, name: /clients/i })).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('propagates query errors as expected', async () => {
      require('@/lib/supabase/queries').getClients.mockRejectedValue(
        new Error('Database connection failed')
      )

      // Server components propagate errors to error boundaries
      await expect(ClientsPage()).rejects.toThrow('Database connection failed')
    })
  })

  describe('Accessibility', () => {
    it('has proper heading hierarchy', async () => {
      require('@/lib/supabase/queries').getClients.mockResolvedValue({ data: [] })

      render(await ClientsPage())

      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toHaveTextContent('Clients')
    })

    it('has proper link accessibility', async () => {
      const mockClients = [
        testDataFactory.client({ id: 'client-1', name: 'Test Client' }),
      ]

      require('@/lib/supabase/queries').getClients.mockResolvedValue({
        data: mockClients,
      })

      render(await ClientsPage())

      const clientLink = screen.getByRole('link', { name: /test client/i })
      expect(clientLink).toBeInTheDocument()
      expect(clientLink).toHaveAttribute('href', '/dashboard/clients/client-1')
    })

    it('has proper button accessibility', async () => {
      require('@/lib/supabase/queries').getClients.mockResolvedValue({ data: [] })

      render(await ClientsPage())

      // "Add Client" links are present
      const addLinks = screen.getAllByRole('link', { name: /add client/i })
      expect(addLinks.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Responsive Behavior', () => {
    it('applies responsive classes correctly', async () => {
      require('@/lib/supabase/queries').getClients.mockResolvedValue({ data: [] })

      const { container } = render(await ClientsPage())

      // Check for responsive utility classes
      expect(container.querySelector('.space-y-6')).toBeInTheDocument()
      expect(container.querySelector('.flex.items-center.justify-between')).toBeInTheDocument()
    })

    it('handles mobile layout classes', async () => {
      const mockClients = [testDataFactory.client({ id: 'c1' })]

      require('@/lib/supabase/queries').getClients.mockResolvedValue({
        data: mockClients,
      })

      const { container } = render(await ClientsPage())

      const grid = container.querySelector('.grid.gap-4.md\\:grid-cols-2.lg\\:grid-cols-3')
      expect(grid).toBeInTheDocument()
    })
  })
})

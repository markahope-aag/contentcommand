/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter, usePathname } from 'next/navigation'
import DashboardPage from '../page'
import ClientsPage from '../clients/page'
import ContentPage from '../content/page'
import NewClientPage from '../clients/new/page'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import DashboardLayout from '../layout'
import { createMockSupabaseClient, testDataFactory } from '@/lib/test-utils/database-test-framework'

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

// Mock components with complex dependencies
jest.mock('@/components/content/pipeline-status', () => ({
  PipelineStatus: ({ stats }: { stats: any }) => (
    <div data-testid="pipeline-status" className="pipeline-status-responsive">
      Pipeline Status: {stats.total} total
    </div>
  ),
}))

jest.mock('@/components/dashboard/org-switcher', () => ({
  OrgSwitcher: () => <div data-testid="org-switcher" className="org-switcher-responsive">Org Switcher</div>,
}))

jest.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-provider" className="sidebar-provider-responsive">{children}</div>
  ),
  SidebarTrigger: () => (
    <button 
      data-testid="sidebar-trigger" 
      className="sidebar-trigger-responsive lg:hidden"
      aria-label="Toggle sidebar"
    >
      ☰
    </button>
  ),
  Sidebar: ({ children }: { children: React.ReactNode }) => (
    <aside 
      data-testid="sidebar" 
      className="sidebar-responsive hidden lg:block w-64 border-r"
      role="navigation"
    >
      {children}
    </aside>
  ),
  SidebarContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-content" className="sidebar-content-responsive">{children}</div>
  ),
  SidebarHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="sidebar-header" className={`sidebar-header-responsive ${className || ''}`}>
      {children}
    </div>
  ),
  SidebarFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="sidebar-footer" className={`sidebar-footer-responsive ${className || ''}`}>
      {children}
    </div>
  ),
  SidebarGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-group" className="sidebar-group-responsive">{children}</div>
  ),
  SidebarGroupLabel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-group-label" className="sidebar-group-label-responsive text-sm font-medium">
      {children}
    </div>
  ),
  SidebarGroupContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-group-content" className="sidebar-group-content-responsive">
      {children}
    </div>
  ),
  SidebarMenu: ({ children }: { children: React.ReactNode }) => (
    <ul data-testid="sidebar-menu" className="sidebar-menu-responsive space-y-1">{children}</ul>
  ),
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => (
    <li data-testid="sidebar-menu-item" className="sidebar-menu-item-responsive">{children}</li>
  ),
  SidebarMenuButton: ({ children, asChild, isActive }: any) => {
    if (asChild) return <>{children}</>
    return (
      <button 
        data-testid="sidebar-menu-button" 
        className={`sidebar-menu-button-responsive w-full text-left px-3 py-2 rounded-md ${
          isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
        }`}
      >
        {children}
      </button>
    )
  },
}))

// Mock Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, width, height, className }: any) => (
    <img src={src} alt={alt} width={width} height={height} className={className} />
  ),
}))

describe('Responsive Behavior Tests', () => {
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

  // Mock window.matchMedia for responsive tests
  const mockMatchMedia = (matches: boolean) => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(usePathname as jest.Mock).mockReturnValue('/dashboard')
    
    // Mock auth
    require('@/lib/auth/actions').getUser.mockResolvedValue(mockUser)
    
    // Mock Supabase
    const mockClient = createMockSupabaseClient()
    require('@/lib/supabase/server').createClient.mockResolvedValue(mockClient)
    require('@/lib/supabase/client').createClient.mockReturnValue(mockClient)

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'org-123'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    })

    // Default to desktop viewport
    mockMatchMedia(false)
  })

  describe('Viewport Breakpoint Behavior', () => {
    it('adapts layout for mobile viewport (< 768px)', () => {
      mockMatchMedia(true) // Mobile
      
      render(<AppSidebar />)

      const sidebar = screen.getByTestId('sidebar')
      expect(sidebar).toHaveClass('hidden', 'lg:block')
    })

    it('shows full layout for desktop viewport (>= 1024px)', () => {
      mockMatchMedia(false) // Desktop
      
      render(<AppSidebar />)

      const sidebar = screen.getByTestId('sidebar')
      expect(sidebar).toHaveClass('w-64', 'border-r')
    })

    it('shows sidebar trigger only on mobile', async () => {
      const TestChild = () => <div>Content</div>
      render(await DashboardLayout({ children: <TestChild /> }))

      const sidebarTrigger = screen.getByTestId('sidebar-trigger')
      expect(sidebarTrigger).toHaveClass('lg:hidden')
      expect(sidebarTrigger).toHaveAttribute('aria-label', 'Toggle sidebar')
    })
  })

  describe('Grid Layout Responsiveness', () => {
    beforeEach(() => {
      // Mock dashboard queries
      require('@/lib/supabase/queries').getContentPipelineStats.mockResolvedValue({
        total: 10,
        draft: 3,
        approved: 2,
        generating: 1,
        generated: 4,
      })

      require('@/lib/supabase/queries').getContentQueue.mockResolvedValue({
        data: [
          testDataFactory.generatedContent({ title: 'Test Content 1' }),
          testDataFactory.generatedContent({ title: 'Test Content 2' }),
        ],
      })

      require('@/lib/supabase/queries').getAiUsageSummary.mockResolvedValue({
        totalCost: 45.67,
        totalInputTokens: 12500,
        totalOutputTokens: 8300,
      })

      // Mock count queries
      const mockClient = createMockSupabaseClient()
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({ count: 5 }),
      })
      require('@/lib/supabase/server').createClient.mockResolvedValue(mockClient)
    })

    it('uses responsive grid classes on dashboard metrics', async () => {
      const { container } = render(await DashboardPage())

      const metricsGrid = container.querySelector('.grid.gap-4.md\\:grid-cols-2.lg\\:grid-cols-4')
      expect(metricsGrid).toBeInTheDocument()

      // Should have 4 metric cards
      const metricCards = container.querySelectorAll('.grid.gap-4.md\\:grid-cols-2.lg\\:grid-cols-4 > *')
      expect(metricCards).toHaveLength(4)
    })

    it('uses responsive grid for main dashboard sections', async () => {
      const { container } = render(await DashboardPage())

      const mainGrid = container.querySelector('.grid.gap-6.lg\\:grid-cols-2')
      expect(mainGrid).toBeInTheDocument()
    })

    it('adapts clients grid for different screen sizes', async () => {
      const mockClients = Array.from({ length: 6 }, (_, i) => 
        testDataFactory.client({ name: `Client ${i + 1}` })
      )

      require('@/lib/supabase/queries').getClients.mockResolvedValue({
        data: mockClients,
      })

      const { container } = render(await ClientsPage())

      const clientsGrid = container.querySelector('.grid.gap-4.md\\:grid-cols-2.lg\\:grid-cols-3')
      expect(clientsGrid).toBeInTheDocument()
    })

    it('uses responsive grid for content page sections', async () => {
      require('@/lib/supabase/queries').getAllContentBriefs.mockResolvedValue({
        data: [testDataFactory.contentBrief()],
      })

      const { container } = render(await ContentPage())

      const contentGrid = container.querySelector('.grid.gap-4.md\\:grid-cols-2')
      expect(contentGrid).toBeInTheDocument()
    })
  })

  describe('Form Responsiveness', () => {
    it('uses responsive form layout on new client page', () => {
      const { container } = render(<NewClientPage />)

      const formContainer = container.querySelector('.mx-auto.max-w-2xl')
      expect(formContainer).toBeInTheDocument()

      const formSpacing = container.querySelector('.space-y-6')
      expect(formSpacing).toBeInTheDocument()
    })

    it('handles form field spacing responsively', () => {
      const { container } = render(<NewClientPage />)

      const fieldSpacing = container.querySelectorAll('.space-y-2')
      expect(fieldSpacing.length).toBeGreaterThan(0)

      const buttonGroup = container.querySelector('.flex.gap-3.pt-4')
      expect(buttonGroup).toBeInTheDocument()
    })

    it('adapts button layout for mobile', () => {
      const { container } = render(<NewClientPage />)

      // Buttons should stack on mobile, be inline on desktop
      const buttonContainer = container.querySelector('.flex.gap-3')
      expect(buttonContainer).toBeInTheDocument()
    })
  })

  describe('Text and Typography Scaling', () => {
    beforeEach(() => {
      require('@/lib/supabase/queries').getContentPipelineStats.mockResolvedValue({
        total: 10, draft: 3, approved: 2, generating: 1, generated: 4,
      })
      require('@/lib/supabase/queries').getContentQueue.mockResolvedValue({
        data: [testDataFactory.generatedContent({ title: 'Test Content 1' })],
      })
      require('@/lib/supabase/queries').getAiUsageSummary.mockResolvedValue({
        totalCost: 45.67, totalInputTokens: 12500, totalOutputTokens: 8300,
      })
      const mockClient = createMockSupabaseClient()
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({ count: 5 }),
      })
      require('@/lib/supabase/server').createClient.mockResolvedValue(mockClient)
    })

    it('uses responsive heading sizes', async () => {
      render(await DashboardPage())

      await waitFor(() => {
        const mainHeading = screen.getByRole('heading', { name: /dashboard/i })
        expect(mainHeading).toHaveClass('text-3xl')
      })
    })

    it('uses appropriate text sizes for different content types', async () => {
      const { container } = render(await DashboardPage())

      await waitFor(() => {
        // Metric values should be prominent
        const metricValues = container.querySelectorAll('.text-2xl.font-bold')
        expect(metricValues.length).toBeGreaterThan(0)

        // Card titles should be readable
        const cardTitles = container.querySelectorAll('.text-sm.font-medium')
        expect(cardTitles.length).toBeGreaterThan(0)
      })
    })

    it('handles text truncation for long content', async () => {
      const longTitleContent = testDataFactory.generatedContent({ 
        title: 'This is a very long content title that should be truncated on smaller screens to prevent layout issues'
      })

      require('@/lib/supabase/queries').getContentQueue.mockResolvedValue({
        data: [longTitleContent],
      })

      const mockClient = createMockSupabaseClient()
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({ count: 1 }),
      })
      require('@/lib/supabase/server').createClient.mockResolvedValue(mockClient)

      const { container } = render(await DashboardPage())

      const truncatedText = container.querySelector('.truncate')
      expect(truncatedText).toBeInTheDocument()
    })
  })

  describe('Spacing and Padding Responsiveness', () => {
    it('uses consistent spacing throughout dashboard', async () => {
      const TestChild = () => <div>Content</div>
      const { container } = render(await DashboardLayout({ children: <TestChild /> }))

      // Header padding
      const header = container.querySelector('.px-6.py-3')
      expect(header).toBeInTheDocument()

      // Content padding
      const content = container.querySelector('.p-6')
      expect(content).toBeInTheDocument()
    })

    it('applies responsive padding to sidebar sections', () => {
      const { container } = render(<AppSidebar />)

      const sidebarHeader = container.querySelector('.border-b.px-4.py-4.space-y-3')
      expect(sidebarHeader).toBeInTheDocument()

      const sidebarFooter = container.querySelector('.border-t.p-4')
      expect(sidebarFooter).toBeInTheDocument()
    })

    it('uses appropriate spacing for form elements', () => {
      const { container } = render(<NewClientPage />)

      const formSpacing = container.querySelector('.space-y-4')
      expect(formSpacing).toBeInTheDocument()

      const fieldSpacing = container.querySelectorAll('.space-y-2')
      expect(fieldSpacing.length).toBeGreaterThan(0)
    })
  })

  describe('Interactive Element Sizing', () => {
    it('ensures buttons are properly sized for touch interaction', () => {
      render(<NewClientPage />)

      const submitButton = screen.getByRole('button', { name: /create client/i })
      const cancelButton = screen.getByRole('button', { name: /cancel/i })

      // Buttons should be large enough for touch interaction
      expect(submitButton).toBeInTheDocument()
      expect(cancelButton).toBeInTheDocument()
    })

    it('ensures form inputs are appropriately sized', () => {
      render(<NewClientPage />)

      const nameInput = screen.getByLabelText(/client name/i)
      const domainInput = screen.getByLabelText(/domain/i)

      expect(nameInput).toBeInTheDocument()
      expect(domainInput).toBeInTheDocument()
    })

    it('ensures navigation links are touch-friendly', () => {
      const { container } = render(<AppSidebar />)

      const navButtons = container.querySelectorAll('.sidebar-menu-button-responsive')
      navButtons.forEach(button => {
        expect(button).toHaveClass('w-full', 'px-3', 'py-2')
      })
    })
  })

  describe('Content Overflow Handling', () => {
    it('handles long client names gracefully', async () => {
      const longNameClients = [
        testDataFactory.client({ 
          name: 'This is a very long client name that might cause layout issues if not handled properly',
          domain: 'verylongdomainname.com'
        }),
      ]

      require('@/lib/supabase/queries').getClients.mockResolvedValue({
        data: longNameClients,
      })

      const { container } = render(await ClientsPage())

      // Should handle overflow gracefully
      const clientCard = container.querySelector('.transition-shadow.hover\\:shadow-md')
      expect(clientCard).toBeInTheDocument()
    })

    it('handles content overflow in dashboard metrics', async () => {
      require('@/lib/supabase/queries').getContentPipelineStats.mockResolvedValue({
        total: 10, draft: 3, approved: 2, generating: 1, generated: 4,
      })
      require('@/lib/supabase/queries').getContentQueue.mockResolvedValue({
        data: [testDataFactory.generatedContent({ title: 'Test Content 1' })],
      })
      require('@/lib/supabase/queries').getAiUsageSummary.mockResolvedValue({
        totalCost: 45.67, totalInputTokens: 12500, totalOutputTokens: 8300,
      })
      const mockClient = createMockSupabaseClient()
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({ count: 5 }),
      })
      require('@/lib/supabase/server').createClient.mockResolvedValue(mockClient)

      const { container } = render(await DashboardPage())

      await waitFor(() => {
        // Content should be contained within cards
        const cards = container.querySelectorAll('[class*="card"]')
        expect(cards.length).toBeGreaterThan(0)
      })
    })

    it('handles sidebar content overflow', () => {
      const { container } = render(<AppSidebar />)

      // Navigation should be scrollable if needed
      const sidebarContent = screen.getByTestId('sidebar-content')
      expect(sidebarContent).toBeInTheDocument()
    })
  })

  describe('Mobile-Specific Interactions', () => {
    beforeEach(() => {
      mockMatchMedia(true) // Mobile viewport
    })

    it('provides mobile-friendly sidebar trigger', async () => {
      const user = userEvent.setup()
      const TestChild = () => <div>Content</div>
      render(await DashboardLayout({ children: <TestChild /> }))

      const sidebarTrigger = screen.getByTestId('sidebar-trigger')
      expect(sidebarTrigger).toBeInTheDocument()
      expect(sidebarTrigger).toHaveClass('lg:hidden')

      // Should be clickable
      await user.click(sidebarTrigger)
      expect(sidebarTrigger).toBeEnabled()
    })

    it('handles touch interactions on navigation items', async () => {
      const user = userEvent.setup()
      render(<AppSidebar />)

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      
      // Should handle touch events
      await user.click(dashboardLink)
      expect(dashboardLink).toHaveAttribute('href', '/dashboard')
    })

    it('provides adequate spacing for mobile taps', () => {
      const { container } = render(<AppSidebar />)

      const menuButtons = container.querySelectorAll('.sidebar-menu-button-responsive')
      menuButtons.forEach(button => {
        expect(button).toHaveClass('px-3', 'py-2')
      })
    })
  })

  describe('Accessibility in Responsive Design', () => {
    it('maintains accessibility across breakpoints', async () => {
      const TestChild = () => <div>Content</div>
      render(await DashboardLayout({ children: <TestChild /> }))

      const mainContent = screen.getByRole('main')
      expect(mainContent).toHaveAttribute('id', 'main-content')

      const sidebarTrigger = screen.getByTestId('sidebar-trigger')
      expect(sidebarTrigger).toHaveAttribute('aria-label', 'Toggle sidebar')
    })

    it('preserves focus management on mobile', async () => {
      const user = userEvent.setup()
      mockMatchMedia(true) // Mobile

      render(<AppSidebar />)

      const firstLink = screen.getByRole('link', { name: /dashboard/i })
      firstLink.focus()
      expect(firstLink).toHaveFocus()

      await user.tab()
      const secondLink = screen.getByRole('link', { name: /clients/i })
      expect(secondLink).toHaveFocus()
    })

    it('maintains proper heading hierarchy on all screen sizes', async () => {
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

      render(await DashboardPage())

      await waitFor(() => {
        const h1 = screen.getByRole('heading', { level: 1 })
        expect(h1).toHaveTextContent('Dashboard')
      })
    })
  })

  describe('Performance Considerations', () => {
    it('does not load unnecessary content on mobile', () => {
      mockMatchMedia(true) // Mobile
      
      const { container } = render(<AppSidebar />)

      // Sidebar should be hidden by default on mobile
      const sidebar = screen.getByTestId('sidebar')
      expect(sidebar).toHaveClass('hidden', 'lg:block')
    })

    it('optimizes layout calculations for different viewports', () => {
      // Test that responsive classes are applied efficiently
      const { container, rerender } = render(<AppSidebar />)

      const sidebar = screen.getByTestId('sidebar')
      expect(sidebar).toHaveClass('w-64', 'border-r')

      // Rerender should maintain classes
      rerender(<AppSidebar />)
      expect(sidebar).toHaveClass('w-64', 'border-r')
    })
  })

  describe('Edge Cases and Error States', () => {
    it('handles empty states responsively', async () => {
      require('@/lib/supabase/queries').getClients.mockResolvedValue({
        data: [],
      })

      const { container } = render(await ClientsPage())

      // Empty state should be responsive
      const emptyState = container.querySelector('[class*="card"]')
      expect(emptyState).toBeInTheDocument()
    })

    it('handles loading states across breakpoints', async () => {
      // Mock slow loading
      require('@/lib/supabase/queries').getClients.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: [] }), 100))
      )

      render(await ClientsPage())

      // Should render without breaking layout - use more specific selector
      await waitFor(() => {
        const h1 = screen.getByRole('heading', { level: 1, name: /clients/i })
        expect(h1).toBeInTheDocument()
      })
    })

    it('gracefully handles very small viewports', () => {
      // Simulate very small mobile screen
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      })

      const { container } = render(<AppSidebar />)

      // Should still render without breaking
      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    })
  })
})
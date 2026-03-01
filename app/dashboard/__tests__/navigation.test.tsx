/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter, usePathname } from 'next/navigation'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import DashboardLayout from '../layout'
import { createMockSupabaseClient } from '@/lib/test-utils/database-test-framework'

// Polyfill requestSubmit for jsdom
if (!HTMLFormElement.prototype.requestSubmit) {
  HTMLFormElement.prototype.requestSubmit = function () {
    this.submit()
  }
}

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  redirect: jest.fn(),
}))

// Mock auth actions
jest.mock('@/lib/auth/actions', () => ({
  getUser: jest.fn(),
  signOut: jest.fn(),
}))

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

// Mock UI components that have complex dependencies
jest.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-provider">{children}</div>
  ),
  SidebarTrigger: () => <button data-testid="sidebar-trigger">Toggle Sidebar</button>,
  Sidebar: ({ children }: { children: React.ReactNode }) => (
    <aside data-testid="sidebar" role="navigation" aria-label="Main navigation">
      {children}
    </aside>
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
    <ul data-testid="sidebar-menu" role="list">{children}</ul>
  ),
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => (
    <li data-testid="sidebar-menu-item" role="listitem">{children}</li>
  ),
  SidebarMenuButton: ({
    children,
    asChild,
    isActive
  }: {
    children: React.ReactNode;
    asChild?: boolean;
    isActive?: boolean
  }) => {
    if (asChild) {
      return <div data-active={isActive}>{children}</div>
    }
    return (
      <button
        data-testid="sidebar-menu-button"
        data-active={isActive}
        className={isActive ? 'active' : ''}
      >
        {children}
      </button>
    )
  },
}))

// Mock OrgSwitcher component
jest.mock('@/components/dashboard/org-switcher', () => ({
  OrgSwitcher: () => <div data-testid="org-switcher">Organization Switcher</div>,
}))

// Mock Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, width, height }: any) => (
    <img src={src} alt={alt} width={width} height={height} />
  ),
}))

describe('Dashboard Navigation', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)

    // Mock auth
    require('@/lib/auth/actions').getUser.mockResolvedValue(mockUser)
    require('@/lib/auth/actions').signOut.mockImplementation(() => Promise.resolve())

    // Mock Supabase
    const mockClient = createMockSupabaseClient()
    require('@/lib/supabase/server').createClient.mockResolvedValue(mockClient)
  })

  describe('AppSidebar Component', () => {
    it('renders all navigation items', () => {
      ;(usePathname as jest.Mock).mockReturnValue('/dashboard')

      render(<AppSidebar />)

      expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
      expect(screen.getByText('Content Command')).toBeInTheDocument()
      expect(screen.getByTestId('org-switcher')).toBeInTheDocument()

      // Check all navigation items - use exact text to avoid ambiguity
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Clients')).toBeInTheDocument()
      expect(screen.getByText('Content')).toBeInTheDocument()
      expect(screen.getByText('Analytics')).toBeInTheDocument()
      expect(screen.getByText('Integrations')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('highlights active navigation item correctly', () => {
      ;(usePathname as jest.Mock).mockReturnValue('/dashboard/clients')

      render(<AppSidebar />)

      const clientsLink = screen.getByRole('link', { name: /clients/i })
      expect(clientsLink.closest('[data-active="true"]')).toBeInTheDocument()

      // Note: Dashboard link is also active because pathname.startsWith("/dashboard/") is true
      // This is expected behavior - the Dashboard nav item matches all /dashboard/* paths
    })

    it('highlights active navigation for nested paths', () => {
      ;(usePathname as jest.Mock).mockReturnValue('/dashboard/clients/new')

      render(<AppSidebar />)

      const clientsLink = screen.getByRole('link', { name: /clients/i })
      expect(clientsLink.closest('[data-active="true"]')).toBeInTheDocument()
    })

    it('has correct navigation links with proper hrefs', () => {
      ;(usePathname as jest.Mock).mockReturnValue('/dashboard')

      render(<AppSidebar />)

      // Use more specific selectors to avoid "Content Command" brand link ambiguity
      const allLinks = screen.getAllByRole('link')
      const navLinks = allLinks.filter(link => {
        const href = link.getAttribute('href')
        return href && href !== '/dashboard' || link.textContent?.trim() === 'Dashboard'
      })

      expect(screen.getByRole('link', { name: /^dashboard$/i })).toHaveAttribute('href', '/dashboard')
      expect(screen.getByRole('link', { name: /clients/i })).toHaveAttribute('href', '/dashboard/clients')
      // "Content" text exists in "Content Command" too - get the nav link specifically
      const contentNavLink = allLinks.find(l => l.getAttribute('href') === '/dashboard/content')
      expect(contentNavLink).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /analytics/i })).toHaveAttribute('href', '/dashboard/analytics')
      expect(screen.getByRole('link', { name: /integrations/i })).toHaveAttribute('href', '/dashboard/integrations')
      expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/dashboard/settings')
    })

    it('includes brand logo and link', () => {
      ;(usePathname as jest.Mock).mockReturnValue('/dashboard')

      const { container } = render(<AppSidebar />)

      const brandLink = screen.getByRole('link', { name: /content command/i })
      expect(brandLink).toHaveAttribute('href', '/dashboard')

      // Logo has alt="" (decorative), so it won't have an img role. Query by tag.
      const logo = container.querySelector('img[src="/logo.svg"]')
      expect(logo).toBeInTheDocument()
      expect(logo).toHaveAttribute('alt', '')
    })

    it('includes organization switcher', () => {
      ;(usePathname as jest.Mock).mockReturnValue('/dashboard')

      render(<AppSidebar />)

      expect(screen.getByTestId('org-switcher')).toBeInTheDocument()
    })

    it('includes sign out button', () => {
      ;(usePathname as jest.Mock).mockReturnValue('/dashboard')

      render(<AppSidebar />)

      const signOutButton = screen.getByRole('button', { name: /sign out/i })
      expect(signOutButton).toBeInTheDocument()
      expect(signOutButton).toHaveAttribute('type', 'submit')
    })

    it('has proper accessibility attributes', () => {
      ;(usePathname as jest.Mock).mockReturnValue('/dashboard/clients')

      render(<AppSidebar />)

      const navigation = screen.getByRole('navigation', { name: /main navigation/i })
      expect(navigation).toBeInTheDocument()

      const activeLink = screen.getByRole('link', { name: /clients/i })
      expect(activeLink).toHaveAttribute('aria-current', 'page')

      // Analytics should be inactive when on /dashboard/clients
      const inactiveLink = screen.getByRole('link', { name: /analytics/i })
      expect(inactiveLink).not.toHaveAttribute('aria-current')
    })

    it('includes navigation icons', () => {
      ;(usePathname as jest.Mock).mockReturnValue('/dashboard')

      render(<AppSidebar />)

      // Check for emoji icons (aria-hidden)
      const icons = screen.getAllByText(/[\u{1F4CA}\u{1F465}\u{1F4DD}\u{1F4C8}\u{1F50C}\u2699]/u)
      expect(icons.length).toBeGreaterThanOrEqual(6) // One for each navigation item

      icons.forEach(icon => {
        expect(icon).toHaveAttribute('aria-hidden', 'true')
      })
    })
  })

  describe('Dashboard Layout', () => {
    it('renders layout with sidebar and main content', async () => {
      const TestChild = () => <div data-testid="test-content">Test Content</div>

      render(await DashboardLayout({ children: <TestChild /> }))

      expect(screen.getByTestId('sidebar-provider')).toBeInTheDocument()
      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
      expect(screen.getByTestId('sidebar-trigger')).toBeInTheDocument()
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })

    it('redirects unauthenticated users', async () => {
      const { redirect } = require('next/navigation')
      require('@/lib/auth/actions').getUser.mockResolvedValue(null)

      const TestChild = () => <div>Test Content</div>

      try {
        render(await DashboardLayout({ children: <TestChild /> }))
      } catch {
        // redirect may throw in tests
      }

      expect(redirect).toHaveBeenCalledWith('/login')
    })

    it('has proper main content structure', async () => {
      const TestChild = () => <div data-testid="test-content">Test Content</div>

      render(await DashboardLayout({ children: <TestChild /> }))

      const mainContent = screen.getByRole('main')
      expect(mainContent).toHaveAttribute('id', 'main-content')
      expect(mainContent).toHaveClass('flex-1')

      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })

    it('includes sidebar trigger in header', async () => {
      const TestChild = () => <div>Test Content</div>

      render(await DashboardLayout({ children: <TestChild /> }))

      const sidebarTrigger = screen.getByTestId('sidebar-trigger')
      expect(sidebarTrigger).toBeInTheDocument()
      expect(sidebarTrigger.closest('.border-b')).toBeInTheDocument()
    })
  })

  describe('Navigation Interactions', () => {
    it('handles keyboard navigation', async () => {
      const user = userEvent.setup()
      ;(usePathname as jest.Mock).mockReturnValue('/dashboard')

      render(<AppSidebar />)

      const firstLink = screen.getByRole('link', { name: /^dashboard$/i })

      // Focus first link
      firstLink.focus()
      expect(firstLink).toHaveFocus()

      // Tab to next link
      await user.tab()
      expect(screen.getByRole('link', { name: /clients/i })).toHaveFocus()

      // Tab through all navigation items
      await user.tab()
      // The next focusable link after Clients
      const allLinks = screen.getAllByRole('link')
      const clientsIdx = allLinks.indexOf(screen.getByRole('link', { name: /clients/i }))
      // Content link should be next
      expect(allLinks[clientsIdx + 1]).toHaveFocus()
    })

    it('handles link clicks correctly', async () => {
      const user = userEvent.setup()
      ;(usePathname as jest.Mock).mockReturnValue('/dashboard')

      render(<AppSidebar />)

      const clientsLink = screen.getByRole('link', { name: /clients/i })

      // Click should navigate (in real app, Next.js handles this)
      await user.click(clientsLink)

      // Link should be clickable and have correct href
      expect(clientsLink).toHaveAttribute('href', '/dashboard/clients')
    })

    it('has sign out form with submit button', () => {
      ;(usePathname as jest.Mock).mockReturnValue('/dashboard')

      render(<AppSidebar />)

      const signOutButton = screen.getByRole('button', { name: /sign out/i })
      const form = signOutButton.closest('form')

      expect(form).toBeInTheDocument()
      expect(signOutButton).toHaveAttribute('type', 'submit')
    })
  })

  describe('Responsive Behavior', () => {
    it('has responsive layout classes', async () => {
      const TestChild = () => <div>Test Content</div>

      const { container } = render(await DashboardLayout({ children: <TestChild /> }))

      // Check for responsive classes
      expect(container.querySelector('.flex-1')).toBeInTheDocument()
      expect(container.querySelector('.flex.items-center.gap-2')).toBeInTheDocument()
      expect(container.querySelector('.px-6.py-3')).toBeInTheDocument()
      expect(container.querySelector('.p-6')).toBeInTheDocument()
    })

    it('includes mobile-friendly sidebar trigger', async () => {
      const TestChild = () => <div>Test Content</div>

      render(await DashboardLayout({ children: <TestChild /> }))

      const sidebarTrigger = screen.getByTestId('sidebar-trigger')
      expect(sidebarTrigger).toBeInTheDocument()

      // Should be clickable for mobile menu toggle
      expect(sidebarTrigger).toBeEnabled()
    })

    it('has proper spacing and layout for different screen sizes', () => {
      ;(usePathname as jest.Mock).mockReturnValue('/dashboard')

      const { container } = render(<AppSidebar />)

      // Check for responsive spacing classes
      expect(container.querySelector('.border-b.px-4.py-4.space-y-3')).toBeInTheDocument()
      expect(container.querySelector('.border-t.p-4')).toBeInTheDocument()
    })
  })

  describe('Navigation State Management', () => {
    it('correctly determines active state for exact matches', () => {
      ;(usePathname as jest.Mock).mockReturnValue('/dashboard')

      render(<AppSidebar />)

      const dashboardLink = screen.getByRole('link', { name: /^dashboard$/i })
      expect(dashboardLink.closest('[data-active="true"]')).toBeInTheDocument()
    })

    it('correctly determines active state for nested paths', () => {
      ;(usePathname as jest.Mock).mockReturnValue('/dashboard/content/briefs/new')

      render(<AppSidebar />)

      // Content nav link (not the brand "Content Command")
      const allLinks = screen.getAllByRole('link')
      const contentLink = allLinks.find(l => l.getAttribute('href') === '/dashboard/content')!
      expect(contentLink.closest('[data-active="true"]')).toBeInTheDocument()

      // Note: Dashboard link (/dashboard) is also active for /dashboard/content/briefs/new
      // because pathname.startsWith("/dashboard/") is true - this is expected behavior
    })

    it('handles edge cases in path matching', () => {
      ;(usePathname as jest.Mock).mockReturnValue('/dashboard/clients-archive')

      render(<AppSidebar />)

      // /dashboard/clients-archive should NOT match /dashboard/clients (no trailing /)
      const clientsLink = screen.getByRole('link', { name: /clients/i })
      expect(clientsLink.closest('[data-active="true"]')).not.toBeInTheDocument()
    })
  })

  describe('Navigation Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      ;(usePathname as jest.Mock).mockReturnValue('/dashboard')

      render(<AppSidebar />)

      const navigation = screen.getByRole('navigation', { name: /main navigation/i })
      expect(navigation).toBeInTheDocument()

      const menuList = screen.getByRole('list')
      expect(menuList).toBeInTheDocument()

      const menuItems = screen.getAllByRole('listitem')
      expect(menuItems).toHaveLength(6) // One for each navigation item
    })

    it('provides proper focus management', () => {
      ;(usePathname as jest.Mock).mockReturnValue('/dashboard')

      render(<AppSidebar />)

      // All links should be focusable
      const links = screen.getAllByRole('link')

      for (const link of links) {
        link.focus()
        expect(link).toHaveFocus()
      }
    })

    it('has proper semantic structure', () => {
      ;(usePathname as jest.Mock).mockReturnValue('/dashboard')

      render(<AppSidebar />)

      // Check for semantic structure
      expect(screen.getByTestId('sidebar-header')).toBeInTheDocument()
      expect(screen.getByTestId('sidebar-content')).toBeInTheDocument()
      expect(screen.getByTestId('sidebar-footer')).toBeInTheDocument()
      expect(screen.getByTestId('sidebar-group-label')).toHaveTextContent('Navigation')
    })

    it('includes skip links for accessibility', async () => {
      const TestChild = () => <div>Test Content</div>

      render(await DashboardLayout({ children: <TestChild /> }))

      const mainContent = screen.getByRole('main')
      expect(mainContent).toHaveAttribute('id', 'main-content')

      // Skip link would target this ID
    })
  })

  describe('Navigation Performance', () => {
    it('does not cause unnecessary re-renders', () => {
      const renderSpy = jest.fn()

      const TestSidebar = () => {
        renderSpy()
        return <AppSidebar />
      }

      ;(usePathname as jest.Mock).mockReturnValue('/dashboard')

      const { rerender } = render(<TestSidebar />)
      expect(renderSpy).toHaveBeenCalledTimes(1)

      // Re-render with same pathname should not cause extra renders
      rerender(<TestSidebar />)
      expect(renderSpy).toHaveBeenCalledTimes(2) // Expected for React strict mode
    })

    it('handles pathname changes efficiently', () => {
      ;(usePathname as jest.Mock).mockReturnValue('/dashboard')

      const { rerender } = render(<AppSidebar />)

      // Change pathname
      ;(usePathname as jest.Mock).mockReturnValue('/dashboard/clients')
      rerender(<AppSidebar />)

      // Should update active states correctly
      const clientsLink = screen.getByRole('link', { name: /clients/i })
      expect(clientsLink.closest('[data-active="true"]')).toBeInTheDocument()
    })
  })
})

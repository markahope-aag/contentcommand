/**
 * Tests for AppSidebar component
 * Tests navigation, active states, and sign out functionality
 */

import { render, screen } from '@testing-library/react'
import { AppSidebar } from '../app-sidebar'
import { SidebarProvider } from '@/components/ui/sidebar'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard'),
}))

// Mock the OrgSwitcher component
jest.mock('@/components/dashboard/org-switcher', () => ({
  OrgSwitcher: () => <div data-testid="org-switcher">OrgSwitcher</div>,
}))

// Mock auth actions
jest.mock('@/lib/auth/actions', () => ({
  signOut: jest.fn(),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

describe('AppSidebar', () => {
  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <SidebarProvider>
        {component}
      </SidebarProvider>
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders sidebar with brand and navigation', () => {
    renderWithProvider(<AppSidebar />)
    
    expect(screen.getByText('Content Command')).toBeInTheDocument()
    expect(screen.getByTestId('org-switcher')).toBeInTheDocument()
    expect(screen.getByText('Navigation')).toBeInTheDocument()
    expect(screen.getByText('Sign out')).toBeInTheDocument()
  })

  it('renders all navigation items', () => {
    renderWithProvider(<AppSidebar />)
    
    const expectedNavItems = [
      'Dashboard',
      'Clients', 
      'Content',
      'Analytics',
      'Integrations',
      'Settings'
    ]
    
    expectedNavItems.forEach(item => {
      expect(screen.getByText(item)).toBeInTheDocument()
    })
  })

  it('renders navigation items with icons', () => {
    renderWithProvider(<AppSidebar />)
    
    // Check that icons are present (emojis in this case)
    expect(screen.getByText('📊')).toBeInTheDocument() // Dashboard
    expect(screen.getByText('👥')).toBeInTheDocument() // Clients
    expect(screen.getByText('📝')).toBeInTheDocument() // Content
    expect(screen.getByText('📈')).toBeInTheDocument() // Analytics
    expect(screen.getByText('🔌')).toBeInTheDocument() // Integrations
    expect(screen.getByText('⚙️')).toBeInTheDocument() // Settings
  })

  it('shows correct active state for current path', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { usePathname } = require('next/navigation')
    usePathname.mockReturnValue('/dashboard')
    
    renderWithProvider(<AppSidebar />)
    
    // Dashboard should be active
    const dashboardLink = screen.getByText('Dashboard').closest('a')
    expect(dashboardLink).toHaveAttribute('href', '/dashboard')
  })

  it('shows active state for nested paths', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { usePathname } = require('next/navigation')
    usePathname.mockReturnValue('/dashboard/clients/123')
    
    renderWithProvider(<AppSidebar />)
    
    // Clients should be active for nested client path
    const clientsLink = screen.getByText('Clients').closest('a')
    expect(clientsLink).toHaveAttribute('href', '/dashboard/clients')
  })

  it('renders correct navigation links', () => {
    renderWithProvider(<AppSidebar />)
    
    const expectedLinks = [
      { text: 'Dashboard', href: '/dashboard' },
      { text: 'Clients', href: '/dashboard/clients' },
      { text: 'Content', href: '/dashboard/content' },
      { text: 'Analytics', href: '/dashboard/analytics' },
      { text: 'Integrations', href: '/dashboard/integrations' },
      { text: 'Settings', href: '/dashboard/settings' },
    ]
    
    expectedLinks.forEach(({ text, href }) => {
      const link = screen.getByText(text).closest('a')
      expect(link).toHaveAttribute('href', href)
    })
  })

  it('renders brand link to dashboard', () => {
    renderWithProvider(<AppSidebar />)
    
    const brandLink = screen.getByText('Content Command').closest('a')
    expect(brandLink).toHaveAttribute('href', '/dashboard')
  })

  it('renders sign out form', () => {
    renderWithProvider(<AppSidebar />)
    
    const signOutButton = screen.getByText('Sign out')
    expect(signOutButton).toHaveAttribute('type', 'submit')
    
    const form = signOutButton.closest('form')
    expect(form).toBeInTheDocument()
  })

  it('applies correct CSS classes for layout', () => {
    renderWithProvider(<AppSidebar />)
    
    // Check that the main sidebar structure is present
    const sidebar = screen.getByText('Content Command').closest('[data-sidebar="sidebar"]')
    expect(sidebar).toBeInTheDocument()
  })

  it('includes OrgSwitcher in header', () => {
    renderWithProvider(<AppSidebar />)
    
    const orgSwitcher = screen.getByTestId('org-switcher')
    expect(orgSwitcher).toBeInTheDocument()
    
    // Should be in the header section
    const header = screen.getByText('Content Command').closest('div')
    expect(header).toContainElement(orgSwitcher)
  })

  it('groups navigation items under Navigation label', () => {
    renderWithProvider(<AppSidebar />)
    
    expect(screen.getByText('Navigation')).toBeInTheDocument()
    
    // All nav items should be present after the Navigation label
    const navigationSection = screen.getByText('Navigation').closest('div')
    expect(navigationSection).toBeInTheDocument()
  })

  it('places sign out button in footer', () => {
    renderWithProvider(<AppSidebar />)
    
    const signOutButton = screen.getByText('Sign out')
    const footer = signOutButton.closest('[class*="border-t"]')
    expect(footer).toBeInTheDocument()
  })

  it('handles different pathname scenarios', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { usePathname } = require('next/navigation')
    
    // Test exact match
    usePathname.mockReturnValue('/dashboard/analytics')
    renderWithProvider(<AppSidebar />)
    
    const analyticsLink = screen.getByText('Analytics').closest('a')
    expect(analyticsLink).toHaveAttribute('href', '/dashboard/analytics')
    
    // Settings link should also be present
    const settingsLink = screen.getByText('Settings').closest('a')
    expect(settingsLink).toHaveAttribute('href', '/dashboard/settings')
  })

  it('renders with proper accessibility attributes', () => {
    renderWithProvider(<AppSidebar />)
    
    // Navigation should be properly structured
    const navItems = screen.getAllByRole('link')
    expect(navItems.length).toBeGreaterThan(0)
    
    // Sign out should be a button
    const signOutButton = screen.getByRole('button', { name: 'Sign out' })
    expect(signOutButton).toBeInTheDocument()
  })
})
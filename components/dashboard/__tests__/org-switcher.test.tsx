/**
 * Tests for OrgSwitcher component
 * Tests organization switching, loading states, and local storage
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OrgSwitcher } from '../org-switcher'
import type { Organization } from '@/types/database'

// Mock Next.js navigation
const mockPush = jest.fn()
const mockPathname = '/dashboard'
const mockSearchParams = new URLSearchParams()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}))

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  order: jest.fn().mockResolvedValue({ data: [], error: null }),
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

describe('OrgSwitcher', () => {
  const mockOrganizations: Organization[] = [
    {
      id: 'org-1',
      name: 'Test Organization 1',
      slug: 'test-org-1',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'org-2', 
      name: 'Test Organization 2',
      slug: 'test-org-2',
      created_at: '2024-01-02T00:00:00Z',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
    mockSearchParams.get = jest.fn().mockReturnValue(null)
  })

  it('shows loading state initially', () => {
    const { container } = render(<OrgSwitcher />)

    // Skeleton component renders with animate-pulse class
    const skeleton = container.querySelector('.animate-pulse')
    expect(skeleton).toBeInTheDocument()
  })

  it('shows create organization button when no organizations exist', async () => {
    mockSupabaseClient.order.mockResolvedValue({ data: [], error: null })
    
    render(<OrgSwitcher />)
    
    await waitFor(() => {
      expect(screen.getByText('Create Organization')).toBeInTheDocument()
    })
  })

  it('renders organization dropdown when organizations exist', async () => {
    mockSupabaseClient.order.mockResolvedValue({ data: mockOrganizations, error: null })
    
    render(<OrgSwitcher />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Organization 1')).toBeInTheDocument()
    })
  })

  it('selects first organization by default', async () => {
    mockSupabaseClient.order.mockResolvedValue({ data: mockOrganizations, error: null })
    
    render(<OrgSwitcher />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Organization 1')).toBeInTheDocument()
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('currentOrgId', 'org-1')
    })
  })

  it('uses organization from URL params if available', async () => {
    mockSearchParams.get = jest.fn().mockReturnValue('org-2')
    mockSupabaseClient.order.mockResolvedValue({ data: mockOrganizations, error: null })
    
    render(<OrgSwitcher />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Organization 2')).toBeInTheDocument()
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('currentOrgId', 'org-2')
    })
  })

  it('uses organization from localStorage if no URL param', async () => {
    mockLocalStorage.getItem.mockReturnValue('org-2')
    mockSupabaseClient.order.mockResolvedValue({ data: mockOrganizations, error: null })
    
    render(<OrgSwitcher />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Organization 2')).toBeInTheDocument()
    })
  })

  it('opens dropdown menu when clicked', async () => {
    const user = userEvent.setup()
    mockSupabaseClient.order.mockResolvedValue({ data: mockOrganizations, error: null })
    
    render(<OrgSwitcher />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Organization 1')).toBeInTheDocument()
    })
    
    const trigger = screen.getByRole('button', { name: /Test Organization 1/ })
    await user.click(trigger)
    
    expect(screen.getByText('Organizations')).toBeInTheDocument()
    expect(screen.getAllByText('Test Organization 1')).toHaveLength(2) // Trigger + menu item
    expect(screen.getByText('Test Organization 2')).toBeInTheDocument()
  })

  it('switches organization when menu item is clicked', async () => {
    const user = userEvent.setup()
    mockSupabaseClient.order.mockResolvedValue({ data: mockOrganizations, error: null })
    
    render(<OrgSwitcher />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Organization 1')).toBeInTheDocument()
    })
    
    // Open dropdown
    const trigger = screen.getByRole('button', { name: /Test Organization 1/ })
    await user.click(trigger)
    
    // Click on second organization
    const org2MenuItem = screen.getAllByText('Test Organization 2')[0]
    await user.click(org2MenuItem)
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('currentOrgId', 'org-2')
    expect(mockPush).toHaveBeenCalledWith('/dashboard?org=org-2')
  })

  it('shows create organization option in dropdown', async () => {
    const user = userEvent.setup()
    mockSupabaseClient.order.mockResolvedValue({ data: mockOrganizations, error: null })
    
    render(<OrgSwitcher />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Organization 1')).toBeInTheDocument()
    })
    
    const trigger = screen.getByRole('button', { name: /Test Organization 1/ })
    await user.click(trigger)
    
    const createOption = screen.getAllByText('Create Organization')[0]
    expect(createOption).toBeInTheDocument()
    
    await user.click(createOption)
    expect(mockPush).toHaveBeenCalledWith('/dashboard/settings/organization')
  })

  it('navigates to create organization when no orgs exist', async () => {
    const user = userEvent.setup()
    mockSupabaseClient.order.mockResolvedValue({ data: [], error: null })
    
    render(<OrgSwitcher />)
    
    await waitFor(() => {
      expect(screen.getByText('Create Organization')).toBeInTheDocument()
    })
    
    const createButton = screen.getByText('Create Organization')
    await user.click(createButton)
    
    expect(mockPush).toHaveBeenCalledWith('/dashboard/settings/organization')
  })

  it('highlights current organization in dropdown', async () => {
    const user = userEvent.setup()
    mockSupabaseClient.order.mockResolvedValue({ data: mockOrganizations, error: null })
    
    render(<OrgSwitcher />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Organization 1')).toBeInTheDocument()
    })
    
    const trigger = screen.getByRole('button', { name: /Test Organization 1/ })
    await user.click(trigger)
    
    // First organization should have active styling
    const org1MenuItem = screen.getAllByText('Test Organization 1')[1]
    expect(org1MenuItem.closest('div')).toHaveClass('bg-accent')
  })

  it('preserves existing URL parameters when switching orgs', async () => {
    const user = userEvent.setup()
    mockSearchParams.toString = jest.fn().mockReturnValue('tab=analytics')
    mockSupabaseClient.order.mockResolvedValue({ data: mockOrganizations, error: null })
    
    render(<OrgSwitcher />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Organization 1')).toBeInTheDocument()
    })
    
    const trigger = screen.getByRole('button', { name: /Test Organization 1/ })
    await user.click(trigger)
    
    const org2MenuItem = screen.getAllByText('Test Organization 2')[0]
    await user.click(org2MenuItem)
    
    expect(mockPush).toHaveBeenCalledWith('/dashboard?tab=analytics&org=org-2')
  })

  it('handles API errors gracefully', async () => {
    mockSupabaseClient.order.mockResolvedValue({ data: null, error: new Error('API Error') })
    
    render(<OrgSwitcher />)
    
    // Should not crash and should eventually show loading complete
    await waitFor(() => {
      // Component should handle error and show create org button
      expect(screen.getByText('Create Organization')).toBeInTheDocument()
    })
  })

  it('handles empty organization name gracefully', async () => {
    const orgsWithEmptyName = [
      { ...mockOrganizations[0], name: '' },
      mockOrganizations[1],
    ]
    mockSupabaseClient.order.mockResolvedValue({ data: orgsWithEmptyName, error: null })
    
    render(<OrgSwitcher />)
    
    await waitFor(() => {
      // Should still render, possibly with fallback text
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  it('truncates long organization names', async () => {
    const orgsWithLongName = [
      { ...mockOrganizations[0], name: 'Very Long Organization Name That Should Be Truncated' },
    ]
    mockSupabaseClient.order.mockResolvedValue({ data: orgsWithLongName, error: null })
    
    render(<OrgSwitcher />)
    
    await waitFor(() => {
      const trigger = screen.getByRole('button')
      expect(trigger.querySelector('.truncate')).toBeInTheDocument()
    })
  })

  it('shows first org name when no org matches saved/URL selection', async () => {
    // Even though no org matches the saved/URL id, the component falls back to data[0]
    const orgsWithDifferentIds = mockOrganizations.map((org, i) => ({
      ...org,
      id: `different-id-${i}`,
    }))
    mockSupabaseClient.order.mockResolvedValue({ data: orgsWithDifferentIds, error: null })

    render(<OrgSwitcher />)

    await waitFor(() => {
      // Falls back to first org since no targetId match
      expect(screen.getByText('Test Organization 1')).toBeInTheDocument()
    })
  })
})
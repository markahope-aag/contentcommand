/**
 * Tests for GoogleConnect component
 * Tests Google OAuth connection flow and client selection
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GoogleConnect } from '../google-connect'
import type { Client } from '@/types/database'

// Mock the toast hook
const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

// Mock fetch
global.fetch = jest.fn()

// Mock window.location
Object.defineProperty(window, 'location', {
  value: { href: '' },
  writable: true,
})

describe('GoogleConnect', () => {
  const mockClients: Client[] = [
    {
      id: 'client-1',
      name: 'Test Client 1',
      domain: 'testclient1.com',
      industry: 'Technology',
      target_keywords: ['test', 'client'],
      brand_voice: null,
      org_id: 'org-1',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'client-2',
      name: 'Test Client 2',
      domain: 'testclient2.com',
      industry: 'Marketing',
      target_keywords: ['test', 'marketing'],
      brand_voice: null,
      org_id: 'org-1',
      created_at: '2024-01-02T00:00:00Z',
    },
  ]

  const defaultProps = {
    clients: mockClients,
    connectedClientIds: [],
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://accounts.google.com/oauth/authorize?...' }),
    })
  })

  it('renders client selection dropdown', () => {
    render(<GoogleConnect {...defaultProps} />)
    
    expect(screen.getByText('Select a client')).toBeInTheDocument()
    expect(screen.getByText('Connect Google')).toBeInTheDocument()
  })

  it('shows all clients in dropdown', async () => {
    const user = userEvent.setup()
    render(<GoogleConnect {...defaultProps} />)
    
    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    
    expect(screen.getByText('Test Client 1')).toBeInTheDocument()
    expect(screen.getByText('Test Client 2')).toBeInTheDocument()
  })

  it('shows connected status for connected clients', async () => {
    const user = userEvent.setup()
    const propsWithConnected = {
      ...defaultProps,
      connectedClientIds: ['client-1'],
    }
    
    render(<GoogleConnect {...propsWithConnected} />)
    
    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    
    expect(screen.getByText('Test Client 1 (Connected)')).toBeInTheDocument()
    expect(screen.getByText('Test Client 2')).toBeInTheDocument()
  })

  it('disables connect button when no client selected', () => {
    render(<GoogleConnect {...defaultProps} />)
    
    const connectButton = screen.getByText('Connect Google')
    expect(connectButton).toBeDisabled()
  })

  it('enables connect button when client selected', async () => {
    const user = userEvent.setup()
    render(<GoogleConnect {...defaultProps} />)
    
    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    
    const client1Option = screen.getByText('Test Client 1')
    await user.click(client1Option)
    
    const connectButton = screen.getByText('Connect Google')
    expect(connectButton).not.toBeDisabled()
  })

  it('shows reconnect text for connected clients', async () => {
    const user = userEvent.setup()
    const propsWithConnected = {
      ...defaultProps,
      connectedClientIds: ['client-1'],
    }
    
    render(<GoogleConnect {...propsWithConnected} />)
    
    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    
    const client1Option = screen.getByText('Test Client 1 (Connected)')
    await user.click(client1Option)
    
    expect(screen.getByText('Reconnect Google')).toBeInTheDocument()
  })

  it('initiates Google OAuth flow when connect clicked', async () => {
    const user = userEvent.setup()
    render(<GoogleConnect {...defaultProps} />)
    
    // Select a client
    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    const client1Option = screen.getByText('Test Client 1')
    await user.click(client1Option)
    
    // Click connect
    const connectButton = screen.getByText('Connect Google')
    await user.click(connectButton)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/integrations/google/auth?clientId=client-1')
    })
  })

  it('redirects to Google OAuth URL on successful API response', async () => {
    const user = userEvent.setup()
    const mockAuthUrl = 'https://accounts.google.com/oauth/authorize?client_id=test'
    
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: mockAuthUrl }),
    })
    
    render(<GoogleConnect {...defaultProps} />)
    
    // Select client and connect
    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    const client1Option = screen.getByText('Test Client 1')
    await user.click(client1Option)
    
    const connectButton = screen.getByText('Connect Google')
    await user.click(connectButton)
    
    await waitFor(() => {
      expect(window.location.href).toBe(mockAuthUrl)
    })
  })

  it('shows loading state during connection', async () => {
    const user = userEvent.setup()
    
    // Mock a delayed response
    ;(fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ url: 'https://accounts.google.com/oauth/authorize' }),
      }), 100))
    )
    
    render(<GoogleConnect {...defaultProps} />)
    
    // Select client and connect
    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    const client1Option = screen.getByText('Test Client 1')
    await user.click(client1Option)
    
    const connectButton = screen.getByText('Connect Google')
    await user.click(connectButton)
    
    // Should show loading state
    expect(screen.getByText('Connecting...')).toBeInTheDocument()
    
    // Wait for connection to complete
    await waitFor(() => {
      expect(screen.queryByText('Connecting...')).not.toBeInTheDocument()
    }, { timeout: 200 })
  })

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Invalid client ID' }),
    })
    
    render(<GoogleConnect {...defaultProps} />)
    
    // Select client and connect
    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    const client1Option = screen.getByText('Test Client 1')
    await user.click(client1Option)
    
    const connectButton = screen.getByText('Connect Google')
    await user.click(connectButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Connection failed',
        description: 'Invalid client ID',
        variant: 'destructive',
      })
    })
  })

  it('handles network errors', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
    
    render(<GoogleConnect {...defaultProps} />)
    
    // Select client and connect
    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    const client1Option = screen.getByText('Test Client 1')
    await user.click(client1Option)
    
    const connectButton = screen.getByText('Connect Google')
    await user.click(connectButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Connection failed',
        description: 'Network error',
        variant: 'destructive',
      })
    })
  })

  it('handles missing authorization URL in response', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}), // No URL in response
    })
    
    render(<GoogleConnect {...defaultProps} />)
    
    // Select client and connect
    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    const client1Option = screen.getByText('Test Client 1')
    await user.click(client1Option)
    
    const connectButton = screen.getByText('Connect Google')
    await user.click(connectButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Connection failed',
        description: 'No authorization URL returned',
        variant: 'destructive',
      })
    })
  })

  it('handles malformed JSON responses', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('Invalid JSON')),
    })
    
    render(<GoogleConnect {...defaultProps} />)
    
    // Select client and connect
    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    const client1Option = screen.getByText('Test Client 1')
    await user.click(client1Option)
    
    const connectButton = screen.getByText('Connect Google')
    await user.click(connectButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Connection failed',
        description: 'Request failed (500)',
        variant: 'destructive',
      })
    })
  })

  it('handles empty clients list', () => {
    render(<GoogleConnect clients={[]} connectedClientIds={[]} />)
    
    expect(screen.getByText('Select a client')).toBeInTheDocument()
    expect(screen.getByText('Connect Google')).toBeDisabled()
  })

  it('preserves selected client after failed connection', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock).mockRejectedValue(new Error('Connection failed'))
    
    render(<GoogleConnect {...defaultProps} />)
    
    // Select client
    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    const client1Option = screen.getByText('Test Client 1')
    await user.click(client1Option)
    
    // Attempt connection
    const connectButton = screen.getByText('Connect Google')
    await user.click(connectButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled()
    })
    
    // Client should still be selected
    expect(connectButton).not.toBeDisabled()
  })

  it('handles client selection change', async () => {
    const user = userEvent.setup()
    render(<GoogleConnect {...defaultProps} />)
    
    // Select first client
    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    const client1Option = screen.getByText('Test Client 1')
    await user.click(client1Option)
    
    // Change to second client
    await user.click(trigger)
    const client2Option = screen.getByText('Test Client 2')
    await user.click(client2Option)
    
    // Button should still be enabled
    const connectButton = screen.getByText('Connect Google')
    expect(connectButton).not.toBeDisabled()
  })

  it('resets loading state after error', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock).mockRejectedValue(new Error('Test error'))
    
    render(<GoogleConnect {...defaultProps} />)
    
    // Select client and connect
    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    const client1Option = screen.getByText('Test Client 1')
    await user.click(client1Option)
    
    const connectButton = screen.getByText('Connect Google')
    await user.click(connectButton)
    
    // Should show loading initially
    expect(screen.getByText('Connecting...')).toBeInTheDocument()
    
    // Should reset after error
    await waitFor(() => {
      expect(screen.getByText('Connect Google')).toBeInTheDocument()
      expect(screen.queryByText('Connecting...')).not.toBeInTheDocument()
    })
  })
})
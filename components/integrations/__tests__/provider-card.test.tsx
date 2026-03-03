/**
 * Tests for ProviderCard component
 * Tests provider information display and health status
 */

import { render, screen } from '@testing-library/react'
import { ProviderCard } from '../provider-card'
import type { IntegrationHealth } from '@/types/database'

describe('ProviderCard', () => {
  const mockHealth: IntegrationHealth = {
    id: '1',
    provider: 'dataforseo',
    status: 'healthy',
    last_success: '2024-01-01T12:00:00Z',
    last_failure: null,
    error_count: 0,
    avg_response_ms: 150,
    metadata: null,
    updated_at: '2024-01-01T00:00:00Z',
  }

  const defaultProps = {
    name: 'DataForSEO',
    provider: 'dataforseo',
    description: 'Competitive analysis and keyword research',
  }

  it('renders provider card with basic information', () => {
    render(<ProviderCard {...defaultProps} />)

    expect(screen.getByText('DataForSEO')).toBeInTheDocument()
    expect(screen.getByText('Competitive analysis and keyword research')).toBeInTheDocument()
  })

  it('displays health status badge', () => {
    render(<ProviderCard {...defaultProps} health={mockHealth} />)

    expect(screen.getByText('healthy')).toBeInTheDocument()

    const badge = screen.getByText('healthy')
    expect(badge).toHaveClass('bg-green-100', 'text-green-800')
  })

  it('shows unknown status when no health data', () => {
    render(<ProviderCard {...defaultProps} />)

    expect(screen.getByText('unknown')).toBeInTheDocument()

    const badge = screen.getByText('unknown')
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-800')
  })

  it('displays last success time', () => {
    render(<ProviderCard {...defaultProps} health={mockHealth} />)

    expect(screen.getByText(/Last sync:/)).toBeInTheDocument()
    expect(screen.getByText(/2024/)).toBeInTheDocument()
  })

  it('shows Never when no last success', () => {
    const healthWithoutSuccess = { ...mockHealth, last_success: null }
    render(<ProviderCard {...defaultProps} health={healthWithoutSuccess} />)

    expect(screen.getByText('Last sync: Never')).toBeInTheDocument()
  })

  it('displays average response time', () => {
    render(<ProviderCard {...defaultProps} health={mockHealth} />)

    expect(screen.getByText('Avg response: 150ms')).toBeInTheDocument()
  })

  it('hides response time when not available', () => {
    const healthWithoutResponseTime = { ...mockHealth, avg_response_ms: null }
    render(<ProviderCard {...defaultProps} health={healthWithoutResponseTime} />)

    expect(screen.queryByText(/Avg response:/)).not.toBeInTheDocument()
  })

  it('renders children content', () => {
    render(
      <ProviderCard {...defaultProps}>
        <div>Custom content</div>
      </ProviderCard>
    )

    expect(screen.getByText('Custom content')).toBeInTheDocument()
  })

  it('applies correct status colors for different health states', () => {
    const healthStates = [
      { status: 'healthy', expectedClass: 'bg-green-100 text-green-800' },
      { status: 'degraded', expectedClass: 'bg-yellow-100 text-yellow-800' },
      { status: 'down', expectedClass: 'bg-red-100 text-red-800' },
      { status: 'unknown', expectedClass: 'bg-gray-100 text-gray-800' },
    ]

    healthStates.forEach(({ status, expectedClass }) => {
      const healthWithStatus = { ...mockHealth, status: status as 'healthy' | 'degraded' | 'down' | 'unknown' }
      const { rerender } = render(<ProviderCard {...defaultProps} health={healthWithStatus} />)

      const badge = screen.getByText(status)
      expect(badge).toHaveClass(...expectedClass.split(' '))

      rerender(<div />)
    })
  })

  it('formats last success date correctly', () => {
    const healthWithSpecificDate = {
      ...mockHealth,
      last_success: '2024-01-15T14:30:00Z'
    }
    render(<ProviderCard {...defaultProps} health={healthWithSpecificDate} />)

    const lastSyncText = screen.getByText(/Last sync:/)
    expect(lastSyncText.textContent).toMatch(/2024/)
  })

  it('hides response time when zero (falsy)', () => {
    const healthWithZeroResponseTime = { ...mockHealth, avg_response_ms: 0 }
    render(<ProviderCard {...defaultProps} health={healthWithZeroResponseTime} />)

    expect(screen.queryByText(/Avg response:/)).not.toBeInTheDocument()
  })

  it('handles large response times', () => {
    const healthWithLargeResponseTime = { ...mockHealth, avg_response_ms: 5000 }
    render(<ProviderCard {...defaultProps} health={healthWithLargeResponseTime} />)

    expect(screen.getByText('Avg response: 5000ms')).toBeInTheDocument()
  })

  it('maintains card structure with header and content', () => {
    render(<ProviderCard {...defaultProps} health={mockHealth} />)

    const header = screen.getByText('DataForSEO').closest('[class*="flex"]')
    expect(header).toContainElement(screen.getByText('healthy'))

    const description = screen.getByText('Competitive analysis and keyword research')
    expect(description).toBeInTheDocument()
  })

  it('handles empty description', () => {
    render(<ProviderCard {...defaultProps} description="" />)

    expect(screen.getByText('DataForSEO')).toBeInTheDocument()
    expect(screen.queryByText('Competitive analysis')).not.toBeInTheDocument()
  })

  it('handles long provider names', () => {
    render(
      <ProviderCard
        {...defaultProps}
        name="Very Long Provider Name That Should Display Properly"
      />
    )

    expect(screen.getByText('Very Long Provider Name That Should Display Properly')).toBeInTheDocument()
  })

  it('handles long descriptions', () => {
    const longDescription = 'This is a very long description that should wrap properly and display all the content without any issues in the card layout'
    render(<ProviderCard {...defaultProps} description={longDescription} />)

    expect(screen.getByText(longDescription)).toBeInTheDocument()
  })
})

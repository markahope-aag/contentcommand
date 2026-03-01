/**
 * Tests for HealthStatus component
 * Tests health display, status colors, and provider names
 */

import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { HealthStatus } from '../health-status'
import type { IntegrationHealth } from '@/types/database'

describe('HealthStatus', () => {
  const mockHealthData: IntegrationHealth[] = [
    {
      id: '1',
      provider: 'dataforseo',
      status: 'healthy',
      last_success: '2024-01-01T00:00:00Z',
      last_failure: null,
      error_count: 0,
      avg_response_ms: 150,
      metadata: null,
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      provider: 'frase',
      status: 'degraded',
      last_success: '2024-01-01T00:00:00Z',
      last_failure: '2024-01-01T01:00:00Z',
      error_count: 2,
      avg_response_ms: 500,
      metadata: null,
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '3',
      provider: 'google',
      status: 'down',
      last_success: null,
      last_failure: '2024-01-01T02:00:00Z',
      error_count: 5,
      avg_response_ms: null,
      metadata: null,
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '4',
      provider: 'llmrefs',
      status: 'unknown',
      last_success: null,
      last_failure: null,
      error_count: 0,
      avg_response_ms: null,
      metadata: null,
      updated_at: '2024-01-01T00:00:00Z',
    },
  ]

  it('renders health status for all providers', () => {
    render(<HealthStatus healthData={mockHealthData} />)
    
    expect(screen.getByText('DataForSEO')).toBeInTheDocument()
    expect(screen.getByText('Frase')).toBeInTheDocument()
    expect(screen.getByText('Google')).toBeInTheDocument()
    expect(screen.getByText('LLMrefs')).toBeInTheDocument()
  })

  it('displays correct status badges', () => {
    render(<HealthStatus healthData={mockHealthData} />)
    
    expect(screen.getByText('healthy')).toBeInTheDocument()
    expect(screen.getByText('degraded')).toBeInTheDocument()
    expect(screen.getByText('down')).toBeInTheDocument()
    expect(screen.getByText('unknown')).toBeInTheDocument()
  })

  it('applies correct status colors', () => {
    render(<HealthStatus healthData={mockHealthData} />)
    
    const healthyBadge = screen.getByText('healthy')
    expect(healthyBadge).toHaveClass('bg-green-100', 'text-green-800')
    
    const degradedBadge = screen.getByText('degraded')
    expect(degradedBadge).toHaveClass('bg-yellow-100', 'text-yellow-800')
    
    const downBadge = screen.getByText('down')
    expect(downBadge).toHaveClass('bg-red-100', 'text-red-800')
    
    const unknownBadge = screen.getByText('unknown')
    expect(unknownBadge).toHaveClass('bg-gray-100', 'text-gray-800')
  })

  it('displays response times when available', () => {
    render(<HealthStatus healthData={mockHealthData} />)
    
    expect(screen.getByText('150ms')).toBeInTheDocument() // DataForSEO
    expect(screen.getByText('500ms')).toBeInTheDocument() // Frase
    expect(screen.queryByText('0ms')).not.toBeInTheDocument() // Google (null response time)
    expect(screen.queryByText('nullms')).not.toBeInTheDocument() // LLMrefs (null response time)
  })

  it('shows empty state when no health data', () => {
    render(<HealthStatus healthData={[]} />)
    
    expect(screen.getByText('No health data available yet. Run a sync to start tracking.')).toBeInTheDocument()
  })

  it('handles unknown provider names', () => {
    const unknownProviderData: IntegrationHealth[] = [
      {
        id: '1',
        provider: 'unknown-provider',
        status: 'healthy',
        last_success: '2024-01-01T00:00:00Z',
        last_failure: null,
        error_count: 0,
        avg_response_ms: 200,
        metadata: null,
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]
    
    render(<HealthStatus healthData={unknownProviderData} />)
    
    // Should display the provider key as-is when no friendly name exists
    expect(screen.getByText('unknown-provider')).toBeInTheDocument()
  })

  it('handles null response times gracefully', () => {
    const nullResponseTimeData: IntegrationHealth[] = [
      {
        id: '1',
        provider: 'dataforseo',
        status: 'healthy',
        last_success: '2024-01-01T00:00:00Z',
        last_failure: null,
        error_count: 0,
        avg_response_ms: null,
        metadata: null,
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]
    
    render(<HealthStatus healthData={nullResponseTimeData} />)
    
    expect(screen.getByText('DataForSEO')).toBeInTheDocument()
    expect(screen.getByText('healthy')).toBeInTheDocument()
    // Should not display response time when null
    expect(screen.queryByText('ms')).not.toBeInTheDocument()
  })

  it('handles zero response times', () => {
    const zeroResponseTimeData: IntegrationHealth[] = [
      {
        id: '1',
        provider: 'dataforseo',
        status: 'healthy',
        last_success: '2024-01-01T00:00:00Z',
        last_failure: null,
        error_count: 0,
        avg_response_ms: 0,
        metadata: null,
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]
    
    render(<HealthStatus healthData={zeroResponseTimeData} />)
    
    // Zero is falsy, so response time won't be displayed
    expect(screen.queryByText('0ms')).not.toBeInTheDocument()
    expect(screen.getByText('DataForSEO')).toBeInTheDocument()
    expect(screen.getByText('healthy')).toBeInTheDocument()
  })

  it('renders with correct layout structure', () => {
    render(<HealthStatus healthData={mockHealthData} />)
    
    // Should have flex layout with gap - find the parent container
    const parentContainer = screen.getByText('DataForSEO').closest('div')?.parentElement
    expect(parentContainer).toHaveClass('flex', 'flex-wrap', 'gap-3')
    
    // Each health item should have proper styling
    const healthItem = screen.getByText('DataForSEO').closest('.rounded-lg')
    expect(healthItem).toHaveClass('rounded-lg', 'border', 'px-3', 'py-2')
  })

  it('displays all provider friendly names correctly', () => {
    render(<HealthStatus healthData={mockHealthData} />)
    
    // Test that all provider keys map to correct friendly names
    const expectedMappings = [
      { provider: 'dataforseo', friendlyName: 'DataForSEO' },
      { provider: 'frase', friendlyName: 'Frase' },
      { provider: 'google', friendlyName: 'Google' },
      { provider: 'llmrefs', friendlyName: 'LLMrefs' },
    ]
    
    expectedMappings.forEach(({ friendlyName }) => {
      expect(screen.getByText(friendlyName)).toBeInTheDocument()
    })
  })

  it('handles large response times', () => {
    const largeResponseTimeData: IntegrationHealth[] = [
      {
        id: '1',
        provider: 'dataforseo',
        status: 'degraded',
        last_success: '2024-01-01T00:00:00Z',
        last_failure: null,
        error_count: 0,
        avg_response_ms: 5000,
        metadata: null,
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]
    
    render(<HealthStatus healthData={largeResponseTimeData} />)
    
    expect(screen.getByText('5000ms')).toBeInTheDocument()
  })

  it('handles single provider data', () => {
    const singleProviderData = [mockHealthData[0]]
    
    render(<HealthStatus healthData={singleProviderData} />)
    
    expect(screen.getByText('DataForSEO')).toBeInTheDocument()
    expect(screen.getByText('healthy')).toBeInTheDocument()
    expect(screen.getByText('150ms')).toBeInTheDocument()
    
    // Should not show other providers
    expect(screen.queryByText('Frase')).not.toBeInTheDocument()
    expect(screen.queryByText('Google')).not.toBeInTheDocument()
    expect(screen.queryByText('LLMrefs')).not.toBeInTheDocument()
  })

  it('has no accessibility violations', async () => {
    const { container } = render(<HealthStatus healthData={mockHealthData} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('has no accessibility violations with empty state', async () => {
    const { container } = render(<HealthStatus healthData={[]} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('maintains consistent styling across all status types', () => {
    render(<HealthStatus healthData={mockHealthData} />)
    
    // All badges should have consistent badge styling
    const badges = screen.getAllByText(/healthy|degraded|down|unknown/)
    badges.forEach(badge => {
      // Check for badge base classes instead of variant-outline
      expect(badge).toHaveClass('inline-flex', 'items-center', 'rounded-md', 'border')
    })
  })
})
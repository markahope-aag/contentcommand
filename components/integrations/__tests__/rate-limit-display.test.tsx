/**
 * Tests for RateLimitDisplay component
 * Tests rate limit information display and layout
 */

import { render, screen } from '@testing-library/react'
import { RateLimitDisplay } from '../rate-limit-display'

describe('RateLimitDisplay', () => {
  it('renders rate limits section with title', () => {
    render(<RateLimitDisplay />)
    
    expect(screen.getByText('Rate Limits')).toBeInTheDocument()
  })

  it('displays all provider rate limits', () => {
    render(<RateLimitDisplay />)
    
    expect(screen.getByText('DataForSEO')).toBeInTheDocument()
    expect(screen.getByText('2,000/min')).toBeInTheDocument()
    
    expect(screen.getByText('Frase')).toBeInTheDocument()
    expect(screen.getByText('500/hr')).toBeInTheDocument()
    
    expect(screen.getByText('Google')).toBeInTheDocument()
    expect(screen.getByText('100/min')).toBeInTheDocument()
    
    expect(screen.getByText('LLMrefs')).toBeInTheDocument()
    expect(screen.getByText('10/min')).toBeInTheDocument()
  })

  it('displays provider icons', () => {
    render(<RateLimitDisplay />)
    
    expect(screen.getByText('🔍')).toBeInTheDocument() // DataForSEO
    expect(screen.getByText('📝')).toBeInTheDocument() // Frase
    expect(screen.getByText('📊')).toBeInTheDocument() // Google
    expect(screen.getByText('🤖')).toBeInTheDocument() // LLMrefs
  })

  it('renders cards in a grid layout', () => {
    render(<RateLimitDisplay />)
    
    const gridContainer = screen.getByText('DataForSEO').closest('.grid')
    expect(gridContainer).toHaveClass('grid', 'grid-cols-2', 'gap-3', 'sm:grid-cols-4')
  })

  it('applies correct card structure', () => {
    render(<RateLimitDisplay />)
    
    // Check that each provider has a card structure
    const dataForSEOCard = screen.getByText('DataForSEO').closest('[class*="rounded"]')
    expect(dataForSEOCard).toBeInTheDocument()
    
    const fraseCard = screen.getByText('Frase').closest('[class*="rounded"]')
    expect(fraseCard).toBeInTheDocument()
  })

  it('displays rate limits with proper typography', () => {
    render(<RateLimitDisplay />)
    
    // Check that rate limits are displayed with semibold styling
    const dataForSEOLimit = screen.getByText('2,000/min')
    expect(dataForSEOLimit).toHaveClass('text-lg', 'font-semibold')
    
    const fraseLimit = screen.getByText('500/hr')
    expect(fraseLimit).toHaveClass('text-lg', 'font-semibold')
  })

  it('displays provider names with icons in header', () => {
    render(<RateLimitDisplay />)
    
    // Check that provider names are displayed with medium font weight
    const dataForSEOName = screen.getByText('DataForSEO')
    expect(dataForSEOName).toHaveClass('text-sm', 'font-medium')
    
    const fraseName = screen.getByText('Frase')
    expect(fraseName).toHaveClass('text-sm', 'font-medium')
  })

  it('maintains consistent spacing and layout', () => {
    render(<RateLimitDisplay />)
    
    // Check main container spacing
    const container = screen.getByText('Rate Limits').closest('.space-y-3')
    expect(container).toBeInTheDocument()
    
    // Check that title has proper styling
    const title = screen.getByText('Rate Limits')
    expect(title).toHaveClass('text-lg', 'font-medium')
  })

  it('renders all four providers', () => {
    render(<RateLimitDisplay />)
    
    const providerNames = ['DataForSEO', 'Frase', 'Google', 'LLMrefs']
    providerNames.forEach(name => {
      expect(screen.getByText(name)).toBeInTheDocument()
    })
  })

  it('renders all rate limit values', () => {
    render(<RateLimitDisplay />)
    
    const rateLimits = ['2,000/min', '500/hr', '100/min', '10/min']
    rateLimits.forEach(limit => {
      expect(screen.getByText(limit)).toBeInTheDocument()
    })
  })

  it('renders all provider icons', () => {
    render(<RateLimitDisplay />)
    
    const icons = ['🔍', '📝', '📊', '🤖']
    icons.forEach(icon => {
      expect(screen.getByText(icon)).toBeInTheDocument()
    })
  })

  it('applies responsive grid classes', () => {
    render(<RateLimitDisplay />)
    
    const gridContainer = screen.getByText('DataForSEO').closest('.grid')
    expect(gridContainer).toHaveClass('sm:grid-cols-4') // 4 columns on small screens and up
    expect(gridContainer).toHaveClass('grid-cols-2') // 2 columns on mobile
  })

  it('uses card components for each provider', () => {
    render(<RateLimitDisplay />)
    
    // Each provider should be in a Card component
    const cards = screen.getAllByRole('generic').filter(el => 
      el.className && el.className.includes('rounded')
    )
    expect(cards.length).toBeGreaterThanOrEqual(4) // At least 4 cards for providers
  })

  it('maintains proper card header and content structure', () => {
    render(<RateLimitDisplay />)
    
    // Check that icons and names are grouped together in headers
    const dataForSEOIcon = screen.getByText('🔍')
    const dataForSEOName = screen.getByText('DataForSEO')
    
    // They should be in the same container
    const headerContainer = dataForSEOIcon.closest('.flex')
    expect(headerContainer).toContainElement(dataForSEOName)
  })

  it('displays rate limits in content sections', () => {
    render(<RateLimitDisplay />)
    
    // Rate limits should be in content sections separate from headers
    const dataForSEOLimit = screen.getByText('2,000/min')
    const dataForSEOIcon = screen.getByText('🔍')
    
    // They should not be in the same immediate container
    expect(dataForSEOIcon.closest('div')).not.toBe(dataForSEOLimit.closest('div'))
  })

  it('renders static data correctly', () => {
    render(<RateLimitDisplay />)
    
    // This component displays static rate limit data
    // Verify all expected combinations are present
    const expectedData = [
      { provider: 'DataForSEO', limit: '2,000/min', icon: '🔍' },
      { provider: 'Frase', limit: '500/hr', icon: '📝' },
      { provider: 'Google', limit: '100/min', icon: '📊' },
      { provider: 'LLMrefs', limit: '10/min', icon: '🤖' },
    ]
    
    expectedData.forEach(({ provider, limit, icon }) => {
      expect(screen.getByText(provider)).toBeInTheDocument()
      expect(screen.getByText(limit)).toBeInTheDocument()
      expect(screen.getByText(icon)).toBeInTheDocument()
    })
  })
})
/**
 * Tests for AiUsageSummary component
 * Tests usage display, cost formatting, and provider breakdowns
 */

import { render, screen } from '@testing-library/react'
import { AiUsageSummary } from '../ai-usage-summary'

describe('AiUsageSummary', () => {
  const mockUsageSummary = {
    totalCost: 12.3456,
    totalInputTokens: 150000,
    totalOutputTokens: 75000,
    byProvider: {
      openai: { cost: 8.2345, calls: 25 },
      anthropic: { cost: 4.1111, calls: 15 },
    },
    byOperation: {
      content_generation: { cost: 7.5000, calls: 20 },
      quality_analysis: { cost: 3.2456, calls: 12 },
      brief_generation: { cost: 1.6000, calls: 8 },
    },
  }

  it('renders usage summary with all metrics', () => {
    render(<AiUsageSummary summary={mockUsageSummary} />)
    
    expect(screen.getByText('AI Usage')).toBeInTheDocument()
    expect(screen.getByText('$12.3456')).toBeInTheDocument() // Total cost
    expect(screen.getByText('150.0k')).toBeInTheDocument() // Input tokens
    expect(screen.getByText('75.0k')).toBeInTheDocument() // Output tokens
    expect(screen.getByText('Total Cost')).toBeInTheDocument()
    expect(screen.getByText('Input Tokens')).toBeInTheDocument()
    expect(screen.getByText('Output Tokens')).toBeInTheDocument()
  })

  it('displays provider breakdown when available', () => {
    render(<AiUsageSummary summary={mockUsageSummary} />)
    
    expect(screen.getByText('By Provider')).toBeInTheDocument()
    expect(screen.getByText('openai')).toBeInTheDocument() // CSS capitalize class handles display
    expect(screen.getByText('$8.2345 (25 calls)')).toBeInTheDocument()
    expect(screen.getByText('anthropic')).toBeInTheDocument() // CSS capitalize class handles display
    expect(screen.getByText('$4.1111 (15 calls)')).toBeInTheDocument()
  })

  it('displays operation breakdown when available', () => {
    render(<AiUsageSummary summary={mockUsageSummary} />)
    
    expect(screen.getByText('By Operation')).toBeInTheDocument()
    expect(screen.getByText('content generation')).toBeInTheDocument()
    expect(screen.getByText('$7.5000 (20 calls)')).toBeInTheDocument()
    expect(screen.getByText('quality analysis')).toBeInTheDocument()
    expect(screen.getByText('$3.2456 (12 calls)')).toBeInTheDocument()
    expect(screen.getByText('brief generation')).toBeInTheDocument()
    expect(screen.getByText('$1.6000 (8 calls)')).toBeInTheDocument()
  })

  it('formats token counts in thousands', () => {
    const summaryWithLargeTokens = {
      ...mockUsageSummary,
      totalInputTokens: 1234567,
      totalOutputTokens: 987654,
    }
    
    render(<AiUsageSummary summary={summaryWithLargeTokens} />)
    
    expect(screen.getByText('1234.6k')).toBeInTheDocument() // Input tokens
    expect(screen.getByText('987.7k')).toBeInTheDocument() // Output tokens
  })

  it('handles small token counts', () => {
    const summaryWithSmallTokens = {
      ...mockUsageSummary,
      totalInputTokens: 500,
      totalOutputTokens: 250,
    }
    
    render(<AiUsageSummary summary={summaryWithSmallTokens} />)
    
    expect(screen.getByText('0.5k')).toBeInTheDocument() // Input tokens
    expect(screen.getByText('0.3k')).toBeInTheDocument() // Output tokens
  })

  it('formats costs to 4 decimal places', () => {
    const summaryWithPreciseCosts = {
      ...mockUsageSummary,
      totalCost: 0.0001,
      byProvider: {
        openai: { cost: 0.0001, calls: 1 },
      },
    }
    
    render(<AiUsageSummary summary={summaryWithPreciseCosts} />)
    
    expect(screen.getByText('$0.0001')).toBeInTheDocument() // Total cost
    expect(screen.getByText('$0.0001 (1 calls)')).toBeInTheDocument() // Provider cost
  })

  it('shows empty state when summary is null', () => {
    render(<AiUsageSummary summary={null} />)
    
    expect(screen.getByText('AI Usage')).toBeInTheDocument()
    expect(screen.getByText('No usage data available.')).toBeInTheDocument()
  })

  it('handles zero costs and tokens', () => {
    const zeroSummary = {
      totalCost: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      byProvider: {},
      byOperation: {},
    }
    
    render(<AiUsageSummary summary={zeroSummary} />)
    
    expect(screen.getByText('$0.0000')).toBeInTheDocument()
    expect(screen.getAllByText('0.0k')).toHaveLength(2) // Input and output tokens
  })

  it('hides provider section when no providers', () => {
    const summaryWithoutProviders = {
      ...mockUsageSummary,
      byProvider: {},
    }
    
    render(<AiUsageSummary summary={summaryWithoutProviders} />)
    
    expect(screen.queryByText('By Provider')).not.toBeInTheDocument()
    expect(screen.getByText('By Operation')).toBeInTheDocument() // Operations should still show
  })

  it('hides operation section when no operations', () => {
    const summaryWithoutOperations = {
      ...mockUsageSummary,
      byOperation: {},
    }
    
    render(<AiUsageSummary summary={summaryWithoutOperations} />)
    
    expect(screen.getByText('By Provider')).toBeInTheDocument() // Providers should still show
    expect(screen.queryByText('By Operation')).not.toBeInTheDocument()
  })

  it('capitalizes provider names', () => {
    const summaryWithLowercaseProviders = {
      ...mockUsageSummary,
      byProvider: {
        openai: { cost: 5.0, calls: 10 },
        anthropic: { cost: 3.0, calls: 5 },
      },
    }
    
    render(<AiUsageSummary summary={summaryWithLowercaseProviders} />)
    
    // Text content is lowercase, but CSS capitalize class handles display
    expect(screen.getByText('openai')).toBeInTheDocument()
    expect(screen.getByText('anthropic')).toBeInTheDocument()
  })

  it('formats operation names by replacing underscores', () => {
    const summaryWithUnderscoreOperations = {
      ...mockUsageSummary,
      byOperation: {
        content_generation: { cost: 5.0, calls: 10 },
        quality_analysis: { cost: 3.0, calls: 5 },
        brief_generation: { cost: 2.0, calls: 3 },
      },
    }
    
    render(<AiUsageSummary summary={summaryWithUnderscoreOperations} />)
    
    expect(screen.getByText('content generation')).toBeInTheDocument()
    expect(screen.getByText('quality analysis')).toBeInTheDocument()
    expect(screen.getByText('brief generation')).toBeInTheDocument()
  })

  it('handles large costs correctly', () => {
    const summaryWithLargeCosts = {
      ...mockUsageSummary,
      totalCost: 1234.5678,
      byProvider: {
        openai: { cost: 999.9999, calls: 1000 },
      },
    }
    
    render(<AiUsageSummary summary={summaryWithLargeCosts} />)
    
    expect(screen.getByText('$1234.5678')).toBeInTheDocument()
    expect(screen.getByText('$999.9999 (1000 calls)')).toBeInTheDocument()
  })

  it('handles single provider and operation', () => {
    const singleItemSummary = {
      totalCost: 5.0,
      totalInputTokens: 10000,
      totalOutputTokens: 5000,
      byProvider: {
        openai: { cost: 5.0, calls: 1 },
      },
      byOperation: {
        content_generation: { cost: 5.0, calls: 1 },
      },
    }
    
    render(<AiUsageSummary summary={singleItemSummary} />)
    
    expect(screen.getByText('By Provider')).toBeInTheDocument()
    expect(screen.getByText('openai')).toBeInTheDocument()
    expect(screen.getByText('By Operation')).toBeInTheDocument()
    expect(screen.getByText('content generation')).toBeInTheDocument()
  })

  it('maintains consistent layout structure', () => {
    render(<AiUsageSummary summary={mockUsageSummary} />)
    
    // Check main metrics grid - find the grid container
    const totalCostElement = screen.getByText('Total Cost')
    const metricsContainer = totalCostElement.closest('div')?.parentElement?.parentElement
    expect(metricsContainer).toHaveClass('grid', 'grid-cols-3', 'gap-4')
    
    // Check sections have proper spacing
    const providerSection = screen.getByText('By Provider').nextElementSibling
    expect(providerSection).toHaveClass('space-y-1')
  })

  it('handles very small token counts', () => {
    const summaryWithTinyTokens = {
      ...mockUsageSummary,
      totalInputTokens: 1,
      totalOutputTokens: 1,
    }
    
    render(<AiUsageSummary summary={summaryWithTinyTokens} />)
    
    expect(screen.getAllByText('0.0k')).toHaveLength(2) // Both input and output should round to 0.0k
  })
})
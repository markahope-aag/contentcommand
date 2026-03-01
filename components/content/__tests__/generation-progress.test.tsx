/**
 * Tests for GenerationProgress component
 * Tests progress states, animations, and quality score display
 */

import { render, screen } from '@testing-library/react'
import { GenerationProgress } from '../generation-progress'

describe('GenerationProgress', () => {
  it('shows generating state with spinner', () => {
    render(<GenerationProgress status="generating" />)
    
    expect(screen.getByText('Generating content...')).toBeInTheDocument()
    
    // Check for spinner element
    const spinner = screen.getByText('Generating content...').previousElementSibling
    expect(spinner).toHaveClass('animate-spin', 'h-4', 'w-4', 'border-2', 'border-primary', 'border-t-transparent', 'rounded-full')
  })

  it('shows complete state for generated status', () => {
    render(<GenerationProgress status="generated" />)
    
    expect(screen.getByText('Complete')).toBeInTheDocument()
    
    const badge = screen.getByText('Complete')
    expect(badge).toHaveClass('bg-green-100', 'text-green-800')
  })

  it('shows complete state for reviewing status', () => {
    render(<GenerationProgress status="reviewing" />)
    
    expect(screen.getByText('Complete')).toBeInTheDocument()
  })

  it('shows complete state for published status', () => {
    render(<GenerationProgress status="published" />)
    
    expect(screen.getByText('Complete')).toBeInTheDocument()
  })

  it('shows quality score when provided for complete states', () => {
    render(<GenerationProgress status="generated" qualityScore={85} />)
    
    expect(screen.getByText('Complete')).toBeInTheDocument()
    expect(screen.getByText('Score: 85')).toBeInTheDocument()
  })

  it('does not show quality score when null', () => {
    render(<GenerationProgress status="generated" qualityScore={null} />)
    
    expect(screen.getByText('Complete')).toBeInTheDocument()
    expect(screen.queryByText(/Score:/)).not.toBeInTheDocument()
  })

  it('does not show quality score when undefined', () => {
    render(<GenerationProgress status="generated" />)
    
    expect(screen.getByText('Complete')).toBeInTheDocument()
    expect(screen.queryByText(/Score:/)).not.toBeInTheDocument()
  })

  it('shows quality score of 0', () => {
    render(<GenerationProgress status="generated" qualityScore={0} />)
    
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
  })

  it('handles other status values with formatted text', () => {
    render(<GenerationProgress status="draft" />)
    
    expect(screen.getByText('draft')).toBeInTheDocument()
    
    const badge = screen.getByText('draft')
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-800')
  })

  it('replaces first underscore in status text', () => {
    render(<GenerationProgress status="revision_requested" />)

    // Component uses .replace("_", " ") which only replaces the first underscore
    expect(screen.getByText('revision requested')).toBeInTheDocument()
  })

  it('handles approved status', () => {
    render(<GenerationProgress status="approved" />)
    
    expect(screen.getByText('approved')).toBeInTheDocument()
    
    const badge = screen.getByText('approved')
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-800')
  })

  it('handles empty status string', () => {
    const { container } = render(<GenerationProgress status="" />)

    // Empty status renders a Badge with empty text content
    const badge = container.querySelector('.bg-gray-100')
    expect(badge).toBeInTheDocument()
  })

  it('applies correct badge styling for non-complete states', () => {
    render(<GenerationProgress status="draft" />)

    const badge = screen.getByText('draft')
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-800')
  })

  it('applies correct badge styling for complete states', () => {
    render(<GenerationProgress status="generated" />)

    const badge = screen.getByText('Complete')
    expect(badge).toHaveClass('bg-green-100', 'text-green-800')
  })

  it('shows quality score with secondary variant', () => {
    render(<GenerationProgress status="generated" qualityScore={92} />)

    const scoreBadge = screen.getByText('Score: 92')
    // Badge with variant="secondary" gets bg-secondary class from cva
    expect(scoreBadge).toHaveClass('bg-secondary')
  })

  it('handles high quality scores', () => {
    render(<GenerationProgress status="published" qualityScore={100} />)
    
    expect(screen.getByText('Score: 100')).toBeInTheDocument()
  })

  it('handles low quality scores', () => {
    render(<GenerationProgress status="reviewing" qualityScore={1} />)
    
    expect(screen.getByText('Score: 1')).toBeInTheDocument()
  })

  it('maintains layout structure with flex container', () => {
    render(<GenerationProgress status="generated" qualityScore={85} />)
    
    const container = screen.getByText('Complete').closest('.flex')
    expect(container).toHaveClass('flex', 'items-center', 'gap-2')
  })

  it('shows spinner animation for generating state', () => {
    render(<GenerationProgress status="generating" />)
    
    const container = screen.getByText('Generating content...').closest('.flex')
    expect(container).toHaveClass('flex', 'items-center', 'gap-2')
    
    const spinner = container?.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('handles multiple underscores in status', () => {
    render(<GenerationProgress status="some_complex_status_name" />)

    // .replace("_", " ") only replaces the first underscore
    expect(screen.getByText('some complex_status_name')).toBeInTheDocument()
  })

  it('handles status with mixed case', () => {
    render(<GenerationProgress status="Draft" />)
    
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('handles decimal quality scores', () => {
    render(<GenerationProgress status="generated" qualityScore={85.7} />)
    
    expect(screen.getByText('Score: 85.7')).toBeInTheDocument()
  })

  it('handles negative quality scores', () => {
    render(<GenerationProgress status="generated" qualityScore={-5} />)
    
    expect(screen.getByText('Score: -5')).toBeInTheDocument()
  })

  it('shows both complete badge and score for all complete states', () => {
    const completeStates = ['generated', 'reviewing', 'published']
    
    completeStates.forEach(status => {
      const { rerender } = render(<GenerationProgress status={status} qualityScore={75} />)
      
      expect(screen.getByText('Complete')).toBeInTheDocument()
      expect(screen.getByText('Score: 75')).toBeInTheDocument()
      
      rerender(<div />)
    })
  })
})
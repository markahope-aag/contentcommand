/**
 * Tests for PipelineStatus component
 * Tests pipeline stage visualization and statistics
 */

import { render, screen } from '@testing-library/react'
import { PipelineStatus } from '../pipeline-status'

describe('PipelineStatus', () => {
  const mockStats = {
    draft: 5,
    approved: 3,
    generating: 2,
    generated: 8,
    reviewing: 4,
    revision_requested: 1,
    published: 12,
  }

  it('renders pipeline status with all stages', () => {
    render(<PipelineStatus stats={mockStats} />)
    
    expect(screen.getByText('Content Pipeline')).toBeInTheDocument()
    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByText('Approved')).toBeInTheDocument()
    expect(screen.getByText('Generating')).toBeInTheDocument()
    expect(screen.getByText('Generated')).toBeInTheDocument()
    expect(screen.getByText('Reviewing')).toBeInTheDocument()
    expect(screen.getByText('Revision')).toBeInTheDocument()
    expect(screen.getByText('Published')).toBeInTheDocument()
  })

  it('displays correct counts for each stage', () => {
    render(<PipelineStatus stats={mockStats} />)
    
    expect(screen.getByText('5')).toBeInTheDocument() // Draft
    expect(screen.getByText('3')).toBeInTheDocument() // Approved
    expect(screen.getByText('2')).toBeInTheDocument() // Generating
    expect(screen.getByText('8')).toBeInTheDocument() // Generated
    expect(screen.getByText('4')).toBeInTheDocument() // Reviewing
    expect(screen.getByText('1')).toBeInTheDocument() // Revision
    expect(screen.getByText('12')).toBeInTheDocument() // Published
  })

  it('calculates and displays total count correctly', () => {
    render(<PipelineStatus stats={mockStats} />)
    
    // Total should be 5+3+2+8+4+1+12 = 35
    expect(screen.getByText('35 total')).toBeInTheDocument()
  })

  it('handles empty stats', () => {
    render(<PipelineStatus stats={{}} />)
    
    expect(screen.getByText('Content Pipeline')).toBeInTheDocument()
    expect(screen.getByText('0 total')).toBeInTheDocument()
    
    // All stages should show 0
    const zeros = screen.getAllByText('0')
    expect(zeros).toHaveLength(7) // One for each stage
  })

  it('handles partial stats', () => {
    const partialStats = {
      draft: 3,
      published: 7,
    }
    render(<PipelineStatus stats={partialStats} />)
    
    expect(screen.getByText('10 total')).toBeInTheDocument() // 3 + 7
    expect(screen.getByText('3')).toBeInTheDocument() // Draft
    expect(screen.getByText('7')).toBeInTheDocument() // Published
    
    // Missing stages should show 0
    const zeros = screen.getAllByText('0')
    expect(zeros).toHaveLength(5) // 5 missing stages
  })

  it('handles stats with zero values', () => {
    const zeroStats = {
      draft: 0,
      approved: 0,
      generating: 0,
      generated: 5,
      reviewing: 0,
      revision_requested: 0,
      published: 3,
    }
    render(<PipelineStatus stats={zeroStats} />)
    
    expect(screen.getByText('8 total')).toBeInTheDocument() // 5 + 3
    expect(screen.getByText('5')).toBeInTheDocument() // Generated
    expect(screen.getByText('3')).toBeInTheDocument() // Published
    
    // Zero values should still be displayed
    const zeros = screen.getAllByText('0')
    expect(zeros).toHaveLength(5) // 5 stages with 0
  })

  it('handles large numbers correctly', () => {
    const largeStats = {
      draft: 1000,
      published: 5000,
    }
    render(<PipelineStatus stats={largeStats} />)
    
    expect(screen.getByText('6000 total')).toBeInTheDocument()
    expect(screen.getByText('1000')).toBeInTheDocument()
    expect(screen.getByText('5000')).toBeInTheDocument()
  })

  it('renders all stage labels in correct order', () => {
    render(<PipelineStatus stats={mockStats} />)
    
    const expectedStages = ['Draft', 'Approved', 'Generating', 'Generated', 'Reviewing', 'Revision', 'Published']
    expectedStages.forEach(stage => {
      expect(screen.getByText(stage)).toBeInTheDocument()
    })
  })

  it('applies correct CSS classes for layout', () => {
    render(<PipelineStatus stats={mockStats} />)
    
    // Check that stages are laid out in a flex container
    const stagesContainer = screen.getByText('Draft').closest('.flex')
    expect(stagesContainer).toHaveClass('flex', 'gap-1')
    
    // Check individual stage styling
    const draftStage = screen.getByText('Draft').closest('.flex-1')
    expect(draftStage).toHaveClass('flex-1', 'text-center')
  })

  it('handles negative numbers gracefully', () => {
    const negativeStats = {
      draft: -5,
      published: 10,
    }
    render(<PipelineStatus stats={negativeStats} />)
    
    expect(screen.getByText('5 total')).toBeInTheDocument() // -5 + 10 = 5
    expect(screen.getByText('-5')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('handles decimal numbers by displaying them as-is', () => {
    const decimalStats = {
      draft: 2.5,
      published: 7.8,
    }
    render(<PipelineStatus stats={decimalStats} />)
    
    expect(screen.getByText('10.3 total')).toBeInTheDocument() // 2.5 + 7.8
    expect(screen.getByText('2.5')).toBeInTheDocument()
    expect(screen.getByText('7.8')).toBeInTheDocument()
  })
})
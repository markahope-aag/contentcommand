/**
 * Tests for GenerationProgress component
 * Tests progress steps display and elapsed timer
 */

import { render, screen, act } from '@testing-library/react'
import { GenerationProgress } from '../generation-progress'

beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

describe('GenerationProgress', () => {
  it('renders nothing when not active', () => {
    const { container } = render(<GenerationProgress isActive={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders step list when active', () => {
    render(<GenerationProgress isActive={true} />)

    expect(screen.getByText('Preparing brief data')).toBeInTheDocument()
    expect(screen.getByText('Analyzing SERP competitors')).toBeInTheDocument()
    expect(screen.getByText('Extracting semantic keywords')).toBeInTheDocument()
    expect(screen.getByText('Building content prompt')).toBeInTheDocument()
    expect(screen.getByText('Writing article with AI')).toBeInTheDocument()
    expect(screen.getByText('Saving generated content')).toBeInTheDocument()
  })

  it('shows elapsed timer', () => {
    render(<GenerationProgress isActive={true} />)

    expect(screen.getByText(/Elapsed:/)).toBeInTheDocument()
    expect(screen.getByText(/typically takes 30–90 seconds/)).toBeInTheDocument()
  })

  it('advances steps over time', () => {
    render(<GenerationProgress isActive={true} />)

    // First step should be active initially
    const firstStep = screen.getByText('Preparing brief data')
    expect(firstStep).toHaveClass('font-medium')

    // Advance past first step (2000ms)
    act(() => { jest.advanceTimersByTime(2500) })

    // Second step should now be active
    const secondStep = screen.getByText('Analyzing SERP competitors')
    expect(secondStep).toHaveClass('font-medium')

    // First step should now be done (line-through)
    expect(firstStep).toHaveClass('line-through')
  })

  it('resets when deactivated', () => {
    const { rerender } = render(<GenerationProgress isActive={true} />)

    act(() => { jest.advanceTimersByTime(5000) })

    rerender(<GenerationProgress isActive={false} />)

    // Should render nothing
    expect(screen.queryByText('Preparing brief data')).not.toBeInTheDocument()
  })

  it('updates elapsed time display', () => {
    render(<GenerationProgress isActive={true} />)

    act(() => { jest.advanceTimersByTime(5000) })

    expect(screen.getByText(/5s/)).toBeInTheDocument()
  })

  it('shows minutes when elapsed exceeds 60s', () => {
    render(<GenerationProgress isActive={true} />)

    act(() => { jest.advanceTimersByTime(65000) })

    expect(screen.getByText(/1m/)).toBeInTheDocument()
  })
})

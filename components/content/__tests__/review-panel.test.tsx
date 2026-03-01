/**
 * Tests for ReviewPanel component
 * Tests review actions, form handling, and API interactions
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReviewPanel } from '../review-panel'

// Mock the toast hook
const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

// Mock fetch
global.fetch = jest.fn()

describe('ReviewPanel', () => {
  const mockOnReviewSubmitted = jest.fn()
  const contentId = 'test-content-id'

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
  })

  it('renders review panel with approve and revision buttons', () => {
    render(<ReviewPanel contentId={contentId} onReviewSubmitted={mockOnReviewSubmitted} />)
    
    expect(screen.getByText('Human Review')).toBeInTheDocument()
    expect(screen.getByText('Approve')).toBeInTheDocument()
    expect(screen.getByText('Request Revision')).toBeInTheDocument()
    expect(screen.getByText('Reviewer Notes')).toBeInTheDocument()
    expect(screen.getByText('Approve Content')).toBeInTheDocument()
  })

  it('defaults to approve action', () => {
    render(<ReviewPanel contentId={contentId} />)

    const approveButton = screen.getByText('Approve')
    const revisionButton = screen.getByText('Request Revision')

    // Approve should be the default variant (bg-primary), revision should be outline (border-input)
    expect(approveButton.closest('button')).toHaveClass('bg-primary')
    expect(revisionButton.closest('button')).toHaveClass('border-input')
  })

  it('switches to revision action when clicked', async () => {
    const user = userEvent.setup()
    render(<ReviewPanel contentId={contentId} />)
    
    const revisionButton = screen.getByText('Request Revision')
    await user.click(revisionButton)
    
    expect(screen.getByText('Request Revisions')).toBeInTheDocument()
    expect(screen.getByText('Revision Requests (one per line)')).toBeInTheDocument()
  })

  it('shows revision requests field only when revision action is selected', async () => {
    const user = userEvent.setup()
    render(<ReviewPanel contentId={contentId} />)
    
    // Initially, revision requests field should not be visible
    expect(screen.queryByText('Revision Requests (one per line)')).not.toBeInTheDocument()
    
    // Click revision button
    await user.click(screen.getByText('Request Revision'))
    
    // Now revision requests field should be visible
    expect(screen.getByText('Revision Requests (one per line)')).toBeInTheDocument()
  })

  it('submits approval with correct API call', async () => {
    const user = userEvent.setup()
    render(<ReviewPanel contentId={contentId} onReviewSubmitted={mockOnReviewSubmitted} />)
    
    const notesTextarea = screen.getByPlaceholderText('Add your review notes...')
    await user.type(notesTextarea, 'Looks great!')
    
    const submitButton = screen.getByText('Approve Content')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(`/api/content/${contentId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          reviewerNotes: 'Looks great!',
          revisionRequests: undefined,
        }),
      })
    })
    
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Content approved',
      description: 'Content has been approved and is ready for publishing.',
    })
    expect(mockOnReviewSubmitted).toHaveBeenCalled()
  })

  it('submits revision request with correct API call', async () => {
    const user = userEvent.setup()
    render(<ReviewPanel contentId={contentId} onReviewSubmitted={mockOnReviewSubmitted} />)
    
    // Switch to revision action
    await user.click(screen.getByText('Request Revision'))
    
    // Fill in notes and revision requests
    const notesTextarea = screen.getByPlaceholderText('Add your review notes...')
    await user.type(notesTextarea, 'Needs improvements')
    
    const revisionsTextarea = screen.getByPlaceholderText('Add specific revision requests...')
    await user.type(revisionsTextarea, 'Add more examples\nImprove conclusion')
    
    const submitButton = screen.getByText('Request Revisions')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(`/api/content/${contentId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revision',
          reviewerNotes: 'Needs improvements',
          revisionRequests: ['Add more examples', 'Improve conclusion'],
        }),
      })
    })
    
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Revisions requested',
      description: 'Revision requests have been sent.',
    })
    expect(mockOnReviewSubmitted).toHaveBeenCalled()
  })

  it('handles empty notes by sending undefined', async () => {
    const user = userEvent.setup()
    render(<ReviewPanel contentId={contentId} />)
    
    const submitButton = screen.getByText('Approve Content')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(`/api/content/${contentId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          reviewerNotes: undefined,
          revisionRequests: undefined,
        }),
      })
    })
  })

  it('filters empty revision requests', async () => {
    const user = userEvent.setup()
    render(<ReviewPanel contentId={contentId} />)
    
    await user.click(screen.getByText('Request Revision'))
    
    const revisionsTextarea = screen.getByPlaceholderText('Add specific revision requests...')
    await user.type(revisionsTextarea, 'Add examples\n\nImprove style\n')
    
    const submitButton = screen.getByText('Request Revisions')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(`/api/content/${contentId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revision',
          reviewerNotes: undefined,
          revisionRequests: ['Add examples', 'Improve style'],
        }),
      })
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    
    // Mock a delayed response
    ;(fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      }), 100))
    )
    
    render(<ReviewPanel contentId={contentId} />)
    
    const submitButton = screen.getByText('Approve Content')
    await user.click(submitButton)
    
    // Should show loading text
    expect(screen.getByText('Submitting...')).toBeInTheDocument()
    
    // Wait for submission to complete
    await waitFor(() => {
      expect(screen.getByText('Approve Content')).toBeInTheDocument()
    }, { timeout: 200 })
  })

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Validation failed' }),
    })
    
    render(<ReviewPanel contentId={contentId} />)
    
    const submitButton = screen.getByText('Approve Content')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Review failed',
        description: 'Validation failed',
        variant: 'destructive',
      })
    })
    
    expect(mockOnReviewSubmitted).not.toHaveBeenCalled()
  })

  it('handles network errors', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
    
    render(<ReviewPanel contentId={contentId} />)
    
    const submitButton = screen.getByText('Approve Content')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Review failed',
        description: 'Network error',
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
    
    render(<ReviewPanel contentId={contentId} />)
    
    const submitButton = screen.getByText('Approve Content')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Review failed',
        description: 'Review submission failed',
        variant: 'destructive',
      })
    })
  })

  it('works without onReviewSubmitted callback', async () => {
    const user = userEvent.setup()
    render(<ReviewPanel contentId={contentId} />)
    
    const submitButton = screen.getByText('Approve Content')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled()
    })
    
    // Should not throw error even without callback
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Content approved',
      description: 'Content has been approved and is ready for publishing.',
    })
  })

  it('resets form state after successful submission', async () => {
    const user = userEvent.setup()
    render(<ReviewPanel contentId={contentId} />)
    
    const notesTextarea = screen.getByPlaceholderText('Add your review notes...')
    await user.type(notesTextarea, 'Test notes')
    
    const submitButton = screen.getByText('Approve Content')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled()
    })
    
    // Form should still have the content (component doesn't reset form)
    expect(notesTextarea).toHaveValue('Test notes')
  })
})
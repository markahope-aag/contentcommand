/**
 * Tests for QualityScoreDisplay component
 * Tests score visualization, color coding, and null handling
 */

import { render, screen } from '@testing-library/react'
import { QualityScoreDisplay } from '../quality-score-display'
import type { ContentQualityAnalysis } from '@/types/database'

describe('QualityScoreDisplay', () => {
  const mockAnalysis: ContentQualityAnalysis = {
    id: 'test-analysis-id',
    content_id: 'test-content-id',
    overall_score: 85,
    seo_score: 90,
    readability_score: 80,
    authority_score: 75,
    engagement_score: 88,
    aeo_score: 82,
    detailed_feedback: null,
    created_at: '2024-01-01T00:00:00Z',
  }

  it('renders quality scores with all metrics', () => {
    render(<QualityScoreDisplay analysis={mockAnalysis} />)
    
    expect(screen.getByText('Quality Scores')).toBeInTheDocument()
    expect(screen.getByText('85')).toBeInTheDocument() // Overall score
    expect(screen.getByText('SEO')).toBeInTheDocument()
    expect(screen.getByText('90/100')).toBeInTheDocument() // SEO score
    expect(screen.getByText('Readability')).toBeInTheDocument()
    expect(screen.getByText('80/100')).toBeInTheDocument()
    expect(screen.getByText('Authority')).toBeInTheDocument()
    expect(screen.getByText('75/100')).toBeInTheDocument()
    expect(screen.getByText('Engagement')).toBeInTheDocument()
    expect(screen.getByText('88/100')).toBeInTheDocument()
    expect(screen.getByText('AEO')).toBeInTheDocument()
    expect(screen.getByText('82/100')).toBeInTheDocument()
  })

  it('applies correct color for high overall score (80+)', () => {
    const highScoreAnalysis = { ...mockAnalysis, overall_score: 90 }
    render(<QualityScoreDisplay analysis={highScoreAnalysis} />)
    
    const overallScore = screen.getByText('90')
    expect(overallScore).toHaveClass('text-green-600')
  })

  it('applies correct color for medium overall score (60-79)', () => {
    const mediumScoreAnalysis = { ...mockAnalysis, overall_score: 65 }
    render(<QualityScoreDisplay analysis={mediumScoreAnalysis} />)
    
    const overallScore = screen.getByText('65')
    expect(overallScore).toHaveClass('text-yellow-600')
  })

  it('applies correct color for low overall score (40-59)', () => {
    const lowScoreAnalysis = { ...mockAnalysis, overall_score: 45 }
    render(<QualityScoreDisplay analysis={lowScoreAnalysis} />)
    
    const overallScore = screen.getByText('45')
    expect(overallScore).toHaveClass('text-orange-600')
  })

  it('applies correct color for very low overall score (<40)', () => {
    const veryLowScoreAnalysis = { ...mockAnalysis, overall_score: 25 }
    render(<QualityScoreDisplay analysis={veryLowScoreAnalysis} />)
    
    const overallScore = screen.getByText('25')
    expect(overallScore).toHaveClass('text-red-600')
  })

  it('handles null scores by displaying 0', () => {
    const nullScoreAnalysis: ContentQualityAnalysis = {
      ...mockAnalysis,
      overall_score: null,
      seo_score: null,
      readability_score: null,
      authority_score: null,
      engagement_score: null,
      aeo_score: null,
    }
    render(<QualityScoreDisplay analysis={nullScoreAnalysis} />)
    
    expect(screen.getByText('0')).toBeInTheDocument() // Overall score
    expect(screen.getAllByText('0/100')).toHaveLength(5) // All individual scores
  })

  it('renders empty state when analysis is null', () => {
    render(<QualityScoreDisplay analysis={null} />)
    
    expect(screen.getByText('Quality Scores')).toBeInTheDocument()
    expect(screen.getByText('No quality analysis available yet. Run scoring to see results.')).toBeInTheDocument()
  })

  it('applies correct progress bar colors for high scores', () => {
    render(<QualityScoreDisplay analysis={mockAnalysis} />)
    
    // Check that progress bars have correct background colors
    const seoSection = screen.getByText('SEO').closest('.space-y-1')
    const progressBar = seoSection?.querySelector('[style*="width: 90%"]')
    expect(progressBar).toBeInTheDocument()
    expect(progressBar).toHaveClass('bg-green-500')
  })

  it('applies correct progress bar colors for medium scores', () => {
    const mediumScoreAnalysis = { ...mockAnalysis, seo_score: 65 }
    render(<QualityScoreDisplay analysis={mediumScoreAnalysis} />)
    
    const seoSection = screen.getByText('SEO').closest('.space-y-1')
    const progressBar = seoSection?.querySelector('[style*="width: 65%"]')
    expect(progressBar).toBeInTheDocument()
    expect(progressBar).toHaveClass('bg-yellow-500')
  })

  it('applies correct progress bar colors for low scores', () => {
    const lowScoreAnalysis = { ...mockAnalysis, seo_score: 45 }
    render(<QualityScoreDisplay analysis={lowScoreAnalysis} />)
    
    const seoSection = screen.getByText('SEO').closest('.space-y-1')
    const progressBar = seoSection?.querySelector('[style*="width: 45%"]')
    expect(progressBar).toBeInTheDocument()
    expect(progressBar).toHaveClass('bg-orange-500')
  })

  it('applies correct progress bar colors for very low scores', () => {
    const veryLowScoreAnalysis = { ...mockAnalysis, seo_score: 25 }
    render(<QualityScoreDisplay analysis={veryLowScoreAnalysis} />)
    
    const seoSection = screen.getByText('SEO').closest('.space-y-1')
    const progressBar = seoSection?.querySelector('[style*="width: 25%"]')
    expect(progressBar).toBeInTheDocument()
    expect(progressBar).toHaveClass('bg-red-500')
  })

  it('sets correct progress bar width', () => {
    render(<QualityScoreDisplay analysis={mockAnalysis} />)
    
    const seoSection = screen.getByText('SEO').closest('.space-y-1')
    const progressBar = seoSection?.querySelector('[style*="width: 90%"]') as HTMLElement
    expect(progressBar?.style.width).toBe('90%')
  })

  it('handles mixed null and valid scores', () => {
    const mixedScoreAnalysis: ContentQualityAnalysis = {
      ...mockAnalysis,
      seo_score: 90,
      readability_score: null,
      authority_score: 75,
      engagement_score: null,
      aeo_score: 82,
    }
    render(<QualityScoreDisplay analysis={mixedScoreAnalysis} />)
    
    expect(screen.getByText('90/100')).toBeInTheDocument() // SEO
    expect(screen.getAllByText('0/100')).toHaveLength(2) // Readability and Engagement (null)
    expect(screen.getByText('75/100')).toBeInTheDocument() // Authority
    expect(screen.getByText('82/100')).toBeInTheDocument() // AEO
  })

  it('renders all score labels correctly', () => {
    render(<QualityScoreDisplay analysis={mockAnalysis} />)
    
    const expectedLabels = ['SEO', 'Readability', 'Authority', 'Engagement', 'AEO']
    expectedLabels.forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument()
    })
  })
})
// Mock dependencies to prevent ESM import errors from redis/cache
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))
jest.mock('@/lib/cache', () => ({
  invalidateCache: jest.fn(),
  withCache: jest.fn((key: string, fn: () => Promise<unknown>) => fn()),
}))

import { BriefWorkflowSimulator, AIUsageTracker, QualityScoreSimulator, testDataFactory } from '@/lib/test-utils/integration-helpers'
import { canTransition } from '@/lib/content/workflow'

describe('Brief Workflow Integration', () => {
  let workflowSimulator: BriefWorkflowSimulator
  let usageTracker: AIUsageTracker
  let qualityScorer: QualityScoreSimulator

  beforeEach(() => {
    const testBrief = testDataFactory.createBrief({
      title: 'Complete Workflow Test Brief',
      target_keyword: 'integration testing',
    })
    
    workflowSimulator = new BriefWorkflowSimulator(testBrief)
    usageTracker = new AIUsageTracker()
    qualityScorer = new QualityScoreSimulator()
  })

  describe('Happy Path Workflow', () => {
    it('completes full brief lifecycle from draft to published', async () => {
      // Start in draft state
      expect(workflowSimulator.getCurrentState()).toBe('draft')
      
      // Run complete workflow
      const transitions = await workflowSimulator.runHappyPathWorkflow()
      
      // Verify all transitions occurred
      expect(transitions).toEqual([
        'approved',
        'generating', 
        'generated',
        'reviewing',
        'published'
      ])
      
      // Verify final state
      expect(workflowSimulator.getCurrentState()).toBe('published')
      
      // Verify metadata was added at each step
      const finalBrief = workflowSimulator.getBriefData()
      expect(finalBrief.approved_at).toBeDefined()
      expect(finalBrief.generation_started_at).toBeDefined()
      expect(finalBrief.generated_at).toBeDefined()
      expect(finalBrief.content_id).toBeDefined()
      expect(finalBrief.published_at).toBeDefined()
      expect(finalBrief.published_url).toBeDefined()
    })

    it('tracks AI usage throughout the workflow', async () => {
      // Simulate AI usage during brief generation
      usageTracker.trackUsage('openai', 'brief_analysis', 1500, 800, 0.045)
      usageTracker.trackUsage('claude', 'content_generation', 2000, 1200, 0.078)
      usageTracker.trackUsage('openai', 'quality_scoring', 500, 200, 0.012)
      
      const summary = usageTracker.getSummary()
      
      // Verify total usage
      expect(summary.totalCost).toBeCloseTo(0.135, 3)
      expect(summary.totalInputTokens).toBe(4000)
      expect(summary.totalOutputTokens).toBe(2200)
      
      // Verify breakdown by provider
      expect(summary.byProvider.openai.cost).toBeCloseTo(0.057, 3)
      expect(summary.byProvider.openai.calls).toBe(2)
      expect(summary.byProvider.claude.cost).toBeCloseTo(0.078, 3)
      expect(summary.byProvider.claude.calls).toBe(1)
      
      // Verify breakdown by operation
      expect(summary.byOperation.brief_analysis.cost).toBeCloseTo(0.045, 3)
      expect(summary.byOperation.content_generation.cost).toBeCloseTo(0.078, 3)
      expect(summary.byOperation.quality_scoring.cost).toBeCloseTo(0.012, 3)
    })

    it('generates quality scores for content at each stage', async () => {
      const testContent = `
        This is a comprehensive guide about integration testing in modern web applications.
        Integration testing ensures that different components work together seamlessly.
        
        What is integration testing? Integration testing is a crucial step in the development process.
        It helps identify issues that might not be caught by unit tests alone.
        
        Research shows that proper integration testing can reduce bugs by up to 40%.
        Expert developers recommend implementing integration tests early in the development cycle.
        
        How to implement integration testing:
        1. Identify critical user workflows
        2. Create test scenarios that cover these workflows
        3. Set up test data and mock external dependencies
        4. Run tests regularly as part of CI/CD pipeline
        
        Why is this important? Because it ensures your application works as expected in real-world scenarios.
      `
      
      const qualityScore = qualityScorer.generateScore(testContent, 'integration testing')
      
      // Verify score structure
      expect(qualityScore.overall_score).toBeGreaterThan(0)
      expect(qualityScore.overall_score).toBeLessThanOrEqual(100)
      expect(qualityScore.seo_score).toBeDefined()
      expect(qualityScore.readability_score).toBeDefined()
      expect(qualityScore.authority_score).toBeDefined()
      expect(qualityScore.engagement_score).toBeDefined()
      expect(qualityScore.aeo_score).toBeDefined()
      
      // Verify content analysis
      expect(qualityScore.seo_score).toBeGreaterThan(60) // Should score well for keyword usage
      expect(qualityScore.authority_score).toBeGreaterThan(30) // Has research and expert mentions
      expect(qualityScore.aeo_score).toBeGreaterThan(60) // Has what/how/why questions
      expect(qualityScore.engagement_score).toBeGreaterThan(60) // Has questions and structure
      
      // Verify feedback is appropriate
      if (qualityScore.overall_score >= 80) {
        expect(qualityScore.feedback).toContain('Excellent')
      } else if (qualityScore.overall_score >= 60) {
        expect(qualityScore.feedback).toContain('Good')
      } else {
        expect(qualityScore.feedback).toContain('needs improvement')
      }
    })
  })

  describe('Revision Workflow', () => {
    it('handles revision requests and re-approval', async () => {
      // First, get to reviewing state
      await workflowSimulator.transitionTo('approved')
      await workflowSimulator.transitionTo('generating')
      await workflowSimulator.transitionTo('generated')
      await workflowSimulator.transitionTo('reviewing')
      
      // Run revision workflow
      const revisionTransitions = await workflowSimulator.runRevisionWorkflow()
      
      expect(revisionTransitions).toEqual([
        'revision_requested',
        'draft'
      ])
      
      // Verify revision metadata
      const briefData = workflowSimulator.getBriefData()
      expect(briefData.revision_requested_at).toBeDefined()
      expect(briefData.revision_notes).toBe('Please add more technical details')
      expect(briefData.revised_at).toBeDefined()
      
      // Should be able to re-approve and continue
      expect(workflowSimulator.canTransitionTo('approved')).toBe(true)
      await workflowSimulator.transitionTo('approved')
      expect(workflowSimulator.getCurrentState()).toBe('approved')
    })

    it('prevents invalid state transitions', async () => {
      // Try invalid transitions
      expect(() => workflowSimulator.transitionTo('published')).rejects.toThrow()
      expect(() => workflowSimulator.transitionTo('reviewing')).rejects.toThrow()
      
      // Verify valid transitions are still allowed
      expect(workflowSimulator.canTransitionTo('approved')).toBe(true)
      expect(workflowSimulator.canTransitionTo('published')).toBe(false)
    })
  })

  describe('Workflow State Validation', () => {
    it('validates state transitions using workflow utility', () => {
      // Test valid transitions
      expect(canTransition('draft', 'approved')).toBe(true)
      expect(canTransition('approved', 'generating')).toBe(true)
      expect(canTransition('generating', 'generated')).toBe(true)
      expect(canTransition('generated', 'reviewing')).toBe(true)
      expect(canTransition('reviewing', 'published')).toBe(true)
      expect(canTransition('reviewing', 'revision_requested')).toBe(true)
      expect(canTransition('revision_requested', 'draft')).toBe(true)
      expect(canTransition('revision_requested', 'approved')).toBe(true)
      
      // Test invalid transitions
      expect(canTransition('draft', 'generating')).toBe(false)
      expect(canTransition('approved', 'published')).toBe(false)
      expect(canTransition('published', 'draft')).toBe(false)
      expect(canTransition('generated', 'approved')).toBe(false)
    })

    it('handles edge cases in state validation', () => {
      // Test with invalid states
      expect(canTransition('invalid_state', 'approved')).toBe(false)
      expect(canTransition('draft', 'invalid_state')).toBe(false)
      
      // Test with empty strings
      expect(canTransition('', 'approved')).toBe(false)
      expect(canTransition('draft', '')).toBe(false)
    })
  })

  describe('Multi-Brief Workflow', () => {
    it('handles multiple briefs in different states simultaneously', async () => {
      // Create multiple brief simulators
      const brief1 = new BriefWorkflowSimulator(testDataFactory.createBrief({ title: 'Brief 1' }))
      const brief2 = new BriefWorkflowSimulator(testDataFactory.createBrief({ title: 'Brief 2' }))
      const brief3 = new BriefWorkflowSimulator(testDataFactory.createBrief({ title: 'Brief 3' }))
      
      // Move them to different states
      await brief1.transitionTo('approved')
      await brief2.transitionTo('approved')
      await brief2.transitionTo('generating')
      await brief3.runHappyPathWorkflow()
      
      // Verify independent state management
      expect(brief1.getCurrentState()).toBe('approved')
      expect(brief2.getCurrentState()).toBe('generating')
      expect(brief3.getCurrentState()).toBe('published')
      
      // Verify they can continue independently
      expect(brief1.canTransitionTo('generating')).toBe(true)
      expect(brief2.canTransitionTo('generated')).toBe(true)
      expect(brief3.canTransitionTo('draft')).toBe(false) // Published is terminal
    })
  })

  describe('Performance and Scalability', () => {
    it('handles large content efficiently in quality scoring', () => {
      const largeContent = 'integration testing '.repeat(1000) + 
        'This comprehensive guide covers integration testing in detail. ' +
        'Research indicates that proper testing improves quality. ' +
        'Expert recommendations include automated testing. ' +
        'What are the benefits? How can we implement this? Why is it important?'
      
      const startTime = Date.now()
      const score = qualityScorer.generateScore(largeContent, 'integration testing')
      const endTime = Date.now()
      
      // Should complete quickly even with large content
      expect(endTime - startTime).toBeLessThan(100) // Less than 100ms
      
      // Should still produce valid scores
      expect(score.overall_score).toBeGreaterThan(0)
      expect(score.seo_score).toBeGreaterThan(0) // High keyword density
      expect(score.authority_score).toBeGreaterThan(0)
      expect(score.aeo_score).toBeGreaterThan(0)
    })

    it('efficiently tracks large numbers of AI usage events', () => {
      // Add many usage events
      for (let i = 0; i < 1000; i++) {
        usageTracker.trackUsage(
          i % 2 === 0 ? 'openai' : 'claude',
          `operation_${i % 10}`,
          Math.floor(Math.random() * 2000) + 500,
          Math.floor(Math.random() * 1000) + 200,
          Math.random() * 0.1 + 0.01
        )
      }
      
      const startTime = Date.now()
      const summary = usageTracker.getSummary()
      const endTime = Date.now()
      
      // Should compute summary quickly
      expect(endTime - startTime).toBeLessThan(50) // Less than 50ms
      
      // Should have correct totals
      expect(Object.keys(summary.byProvider)).toHaveLength(2) // openai and claude
      expect(Object.keys(summary.byOperation)).toHaveLength(10) // operation_0 to operation_9
      expect(summary.totalCost).toBeGreaterThan(0)
      expect(summary.totalInputTokens).toBeGreaterThan(0)
      expect(summary.totalOutputTokens).toBeGreaterThan(0)
    })
  })
})
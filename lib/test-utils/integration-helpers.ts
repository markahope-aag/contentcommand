/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Integration test helpers for end-to-end workflow testing
 */

import { createMockSupabaseClient } from './api-mocks'

// Workflow state machine for content brief lifecycle
export const briefWorkflowStates = {
  draft: {
    allowedTransitions: ['approved'],
    requiredActions: ['approve'],
  },
  approved: {
    allowedTransitions: ['generating'],
    requiredActions: ['generate'],
  },
  generating: {
    allowedTransitions: ['generated'],
    requiredActions: [],
  },
  generated: {
    allowedTransitions: ['reviewing'],
    requiredActions: ['review'],
  },
  reviewing: {
    allowedTransitions: ['published', 'revision_requested'],
    requiredActions: ['publish', 'request_revision'],
  },
  revision_requested: {
    allowedTransitions: ['draft', 'approved'],
    requiredActions: ['revise'],
  },
  published: {
    allowedTransitions: [],
    requiredActions: [],
  },
}

// Simulate a complete brief workflow
export class BriefWorkflowSimulator {
  private currentState: string = 'draft'
  private briefData: any
  private mockClient: any

  constructor(initialBriefData: any) {
    this.briefData = { ...initialBriefData, status: 'draft' }
    this.mockClient = createMockSupabaseClient()
  }

  getCurrentState() {
    return this.currentState
  }

  getBriefData() {
    return this.briefData
  }

  getMockClient() {
    return this.mockClient
  }

  canTransitionTo(newState: string): boolean {
    const currentStateConfig = briefWorkflowStates[this.currentState as keyof typeof briefWorkflowStates]
    return currentStateConfig?.allowedTransitions.includes(newState as never) || false
  }

  async transitionTo(newState: string, metadata?: any): Promise<boolean> {
    if (!this.canTransitionTo(newState)) {
      throw new Error(`Cannot transition from ${this.currentState} to ${newState}`)
    }

    // Update state
    this.currentState = newState
    this.briefData.status = newState
    
    // Add any metadata
    if (metadata) {
      Object.assign(this.briefData, metadata)
    }

    // Mock database update
    this.mockClient.from.mockReturnValue(this.mockClient)
    this.mockClient.update.mockReturnValue(this.mockClient)
    this.mockClient.eq.mockResolvedValue({
      data: this.briefData,
      error: null,
    })

    return true
  }

  // Simulate the complete happy path workflow
  async runHappyPathWorkflow(): Promise<string[]> {
    const transitions: string[] = []
    
    // Draft -> Approved
    await this.transitionTo('approved', { approved_at: new Date().toISOString() })
    transitions.push('approved')
    
    // Approved -> Generating
    await this.transitionTo('generating', { generation_started_at: new Date().toISOString() })
    transitions.push('generating')
    
    // Generating -> Generated
    await this.transitionTo('generated', { 
      generated_at: new Date().toISOString(),
      content_id: 'generated-content-123'
    })
    transitions.push('generated')
    
    // Generated -> Reviewing
    await this.transitionTo('reviewing', { review_started_at: new Date().toISOString() })
    transitions.push('reviewing')
    
    // Reviewing -> Published
    await this.transitionTo('published', { 
      published_at: new Date().toISOString(),
      published_url: 'https://example.com/published-content'
    })
    transitions.push('published')
    
    return transitions
  }

  // Simulate revision workflow
  async runRevisionWorkflow(): Promise<string[]> {
    const transitions: string[] = []
    
    // Start from reviewing state
    if (this.currentState !== 'reviewing') {
      await this.transitionTo('reviewing')
      transitions.push('reviewing')
    }
    
    // Reviewing -> Revision Requested
    await this.transitionTo('revision_requested', {
      revision_requested_at: new Date().toISOString(),
      revision_notes: 'Please add more technical details'
    })
    transitions.push('revision_requested')
    
    // Revision Requested -> Draft (for re-editing)
    await this.transitionTo('draft', {
      revised_at: new Date().toISOString()
    })
    transitions.push('draft')
    
    return transitions
  }
}

// AI Usage tracking simulator
export class AIUsageTracker {
  private usage: any[] = []

  trackUsage(provider: string, operation: string, inputTokens: number, outputTokens: number, cost: number) {
    this.usage.push({
      provider,
      operation,
      inputTokens,
      outputTokens,
      cost,
      timestamp: new Date().toISOString(),
    })
  }

  getSummary() {
    const totalCost = this.usage.reduce((sum, u) => sum + u.cost, 0)
    const totalInputTokens = this.usage.reduce((sum, u) => sum + u.inputTokens, 0)
    const totalOutputTokens = this.usage.reduce((sum, u) => sum + u.outputTokens, 0)

    const byProvider: Record<string, { cost: number; calls: number }> = {}
    const byOperation: Record<string, { cost: number; calls: number }> = {}

    this.usage.forEach(u => {
      // By provider
      if (!byProvider[u.provider]) {
        byProvider[u.provider] = { cost: 0, calls: 0 }
      }
      byProvider[u.provider].cost += u.cost
      byProvider[u.provider].calls += 1

      // By operation
      if (!byOperation[u.operation]) {
        byOperation[u.operation] = { cost: 0, calls: 0 }
      }
      byOperation[u.operation].cost += u.cost
      byOperation[u.operation].calls += 1
    })

    return {
      totalCost,
      totalInputTokens,
      totalOutputTokens,
      byProvider,
      byOperation,
    }
  }

  reset() {
    this.usage = []
  }
}

// Quality score simulator
export class QualityScoreSimulator {
  generateScore(content: string, targetKeyword: string): any {
    // Simulate quality scoring based on content characteristics
    const wordCount = content.split(' ').length
    const keywordDensity = (content.toLowerCase().split(targetKeyword.toLowerCase()).length - 1) / wordCount * 100

    // Simulate scoring algorithm
    const seoScore = Math.min(100, Math.max(0, 
      (keywordDensity > 0 ? 70 : 30) + 
      (wordCount > 500 ? 20 : 0) +
      (content.includes('https://') ? 10 : 0)
    ))

    const readabilityScore = Math.min(100, Math.max(0,
      80 - (wordCount > 2000 ? 20 : 0) +
      (content.split('.').length > 10 ? 10 : 0)
    ))

    const authorityScore = Math.min(100, Math.max(0,
      (content.includes('research') ? 20 : 0) +
      (content.includes('study') ? 15 : 0) +
      (content.includes('expert') ? 15 : 0) +
      40 // base score
    ))

    const engagementScore = Math.min(100, Math.max(0,
      (content.includes('?') ? 15 : 0) +
      (content.includes('!') ? 10 : 0) +
      (content.split('\n').length > 5 ? 15 : 0) +
      50 // base score
    ))

    const aeoScore = Math.min(100, Math.max(0,
      (content.includes('what') || content.includes('how') || content.includes('why') ? 25 : 0) +
      (content.includes('step') ? 20 : 0) +
      45 // base score
    ))

    const overallScore = Math.round((seoScore + readabilityScore + authorityScore + engagementScore + aeoScore) / 5)

    return {
      id: `score-${Date.now()}`,
      content_id: 'test-content-id',
      overall_score: overallScore,
      seo_score: seoScore,
      readability_score: readabilityScore,
      authority_score: authorityScore,
      engagement_score: engagementScore,
      aeo_score: aeoScore,
      feedback: overallScore < 60 ? 'Content needs improvement in multiple areas' : 
                overallScore < 80 ? 'Good content with room for enhancement' : 
                'Excellent content quality',
      improvement_suggestions: overallScore < 80 ? [
        'Increase keyword density',
        'Add more authoritative sources',
        'Improve readability'
      ] : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }
}

// Test data factories
export const testDataFactory = {
  createBrief: (overrides: any = {}) => ({
    id: `brief-${Date.now()}`,
    client_id: 'test-client-123',
    title: 'Test Content Brief',
    target_keyword: 'test keyword',
    status: 'draft',
    priority_level: 'medium',
    content_type: 'blog_post',
    target_word_count: 1000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),

  createContent: (overrides: any = {}) => ({
    id: `content-${Date.now()}`,
    brief_id: 'test-brief-123',
    title: 'Generated Content Title',
    content: 'This is the generated content body with test keyword and relevant information.',
    word_count: 150,
    model_used: 'openai',
    generation_time_ms: 5000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),

  createUser: (overrides: any = {}) => ({
    id: `user-${Date.now()}`,
    email: 'test@example.com',
    created_at: new Date().toISOString(),
    ...overrides,
  }),

  createClient: (overrides: any = {}) => ({
    id: `client-${Date.now()}`,
    name: 'Test Client',
    domain: 'testclient.com',
    industry: 'Technology',
    target_keywords: ['tech', 'innovation', 'software'],
    created_at: new Date().toISOString(),
    ...overrides,
  }),
}
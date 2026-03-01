// Mock dependencies that workflow.ts imports at module level
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))
jest.mock('@/lib/cache', () => ({
  invalidateCache: jest.fn(),
}))

import { canTransition } from '../workflow'
import type { BriefStatus } from '../workflow'

describe('workflow utilities', () => {
  describe('canTransition', () => {
    it('allows valid transitions from draft', () => {
      expect(canTransition('draft', 'approved')).toBe(true)
    })

    it('disallows invalid transitions from draft', () => {
      expect(canTransition('draft', 'generating')).toBe(false)
      expect(canTransition('draft', 'published')).toBe(false)
      expect(canTransition('draft', 'reviewing')).toBe(false)
    })

    it('allows valid transitions from approved', () => {
      expect(canTransition('approved', 'generating')).toBe(true)
    })

    it('disallows invalid transitions from approved', () => {
      expect(canTransition('approved', 'draft')).toBe(false)
      expect(canTransition('approved', 'published')).toBe(false)
    })

    it('allows valid transitions from generating', () => {
      expect(canTransition('generating', 'generated')).toBe(true)
    })

    it('disallows invalid transitions from generating', () => {
      expect(canTransition('generating', 'draft')).toBe(false)
      expect(canTransition('generating', 'approved')).toBe(false)
    })

    it('allows valid transitions from generated', () => {
      expect(canTransition('generated', 'reviewing')).toBe(true)
    })

    it('allows valid transitions from reviewing', () => {
      expect(canTransition('reviewing', 'published')).toBe(true)
      expect(canTransition('reviewing', 'revision_requested')).toBe(true)
    })

    it('allows valid transitions from revision_requested', () => {
      expect(canTransition('revision_requested', 'draft')).toBe(true)
      expect(canTransition('revision_requested', 'approved')).toBe(true)
    })

    it('disallows transitions from published', () => {
      expect(canTransition('published', 'draft')).toBe(false)
      expect(canTransition('published', 'reviewing')).toBe(false)
      expect(canTransition('published', 'approved')).toBe(false)
    })

    it('handles invalid status values', () => {
      expect(canTransition('invalid_status', 'draft')).toBe(false)
      expect(canTransition('draft', 'invalid_status')).toBe(false)
      expect(canTransition('invalid', 'also_invalid')).toBe(false)
    })

    it('handles empty strings', () => {
      expect(canTransition('', 'draft')).toBe(false)
      expect(canTransition('draft', '')).toBe(false)
      expect(canTransition('', '')).toBe(false)
    })

    it('is case sensitive', () => {
      expect(canTransition('Draft', 'approved')).toBe(false)
      expect(canTransition('draft', 'Approved')).toBe(false)
    })

    describe('complete workflow paths', () => {
      it('allows happy path workflow', () => {
        const happyPath: BriefStatus[] = [
          'draft',
          'approved', 
          'generating',
          'generated',
          'reviewing',
          'published'
        ]

        for (let i = 0; i < happyPath.length - 1; i++) {
          const from = happyPath[i]
          const to = happyPath[i + 1]
          expect(canTransition(from, to)).toBe(true)
        }
      })

      it('allows revision workflow', () => {
        expect(canTransition('reviewing', 'revision_requested')).toBe(true)
        expect(canTransition('revision_requested', 'draft')).toBe(true)
        expect(canTransition('revision_requested', 'approved')).toBe(true)
      })
    })
  })
})
import { NextResponse } from 'next/server'
import {
  validateBody,
  briefGenerateSchema,
  contentGenerateSchema,
  createOrgSchema,
  dataforseoKeywordsSchema,
} from '../validations'
import { z } from 'zod'

// Mock NextResponse for testing
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({ data, options })),
  },
}))

describe('validation utilities', () => {
  describe('validateBody', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      age: z.number().positive(),
    })

    it('returns success for valid data', () => {
      const validData = { name: 'John', age: 25 }
      const result = validateBody(testSchema, validData)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(validData)
      }
    })

    it('returns error response for invalid data', () => {
      const invalidData = { name: '', age: -5 }
      const result = validateBody(testSchema, invalidData)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(NextResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            details: expect.any(Array),
          }),
          { status: 400 }
        )
      }
    })

    it('handles missing required fields', () => {
      const incompleteData = { name: 'John' } // missing age
      const result = validateBody(testSchema, incompleteData)
      
      expect(result.success).toBe(false)
    })

    it('handles completely invalid data types', () => {
      const invalidData = 'not an object'
      const result = validateBody(testSchema, invalidData)
      
      expect(result.success).toBe(false)
    })
  })

  describe('briefGenerateSchema', () => {
    const validClientId = '123e4567-e89b-12d3-a456-426614174000'

    it('validates correct brief generation data', () => {
      const validData = {
        clientId: validClientId,
        targetKeyword: 'content marketing',
        contentType: 'blog post',
      }
      
      const result = briefGenerateSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.targetKeyword).toBe('content marketing')
      }
    })

    it('sanitizes target keyword', () => {
      const dataWithHtml = {
        clientId: validClientId,
        targetKeyword: '  <script>SEO</script>  ',
      }
      
      const result = briefGenerateSchema.safeParse(dataWithHtml)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.targetKeyword).toBe('SEO')
      }
    })

    it('requires valid UUID for clientId', () => {
      const invalidData = {
        clientId: 'invalid-uuid',
        targetKeyword: 'keyword',
      }
      
      const result = briefGenerateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('requires non-empty target keyword', () => {
      const invalidData = {
        clientId: validClientId,
        targetKeyword: '   ',
      }
      
      const result = briefGenerateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('contentGenerateSchema', () => {
    const validBriefId = '123e4567-e89b-12d3-a456-426614174000'

    it('validates correct content generation data', () => {
      const validData = {
        briefId: validBriefId,
        model: 'claude' as const,
      }
      
      const result = contentGenerateSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.model).toBe('claude')
      }
    })

    it('allows optional model parameter', () => {
      const validData = {
        briefId: validBriefId,
      }
      
      const result = contentGenerateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('validates model enum values', () => {
      const invalidData = {
        briefId: validBriefId,
        model: 'invalid-model',
      }
      
      const result = contentGenerateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('requires valid UUID for briefId', () => {
      const invalidData = {
        briefId: 'not-a-uuid',
        model: 'claude' as const,
      }
      
      const result = contentGenerateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('createOrgSchema', () => {
    it('validates correct organization data', () => {
      const validData = {
        name: 'My Company',
        slug: 'my-company',
      }
      
      const result = createOrgSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('My Company')
        expect(result.data.slug).toBe('my-company')
      }
    })

    it('sanitizes and validates slug format', () => {
      const dataWithInvalidSlug = {
        name: 'Test Company',
        slug: 'Test Company!',
      }
      
      const result = createOrgSchema.safeParse(dataWithInvalidSlug)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.slug).toBe('test-company')
      }
    })

    it('rejects empty slug after sanitization', () => {
      const dataWithEmptySlug = {
        name: 'Test Company',
        slug: '!!!',
      }
      
      const result = createOrgSchema.safeParse(dataWithEmptySlug)
      expect(result.success).toBe(false)
    })

    it('caps name length', () => {
      const longName = 'A'.repeat(150)
      const dataWithLongName = {
        name: longName,
        slug: 'test-slug',
      }
      
      const result = createOrgSchema.safeParse(dataWithLongName)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name.length).toBe(100)
      }
    })
  })

  describe('dataforseoKeywordsSchema', () => {
    const validClientId = '123e4567-e89b-12d3-a456-426614174000'

    it('validates correct DataForSEO keywords data', () => {
      const validData = {
        clientId: validClientId,
        domain: 'example.com',
        type: 'keywords' as const,
        competitorDomain: 'competitor.com',
      }
      
      const result = dataforseoKeywordsSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.domain).toBe('example.com')
        expect(result.data.competitorDomain).toBe('competitor.com')
      }
    })

    it('sanitizes domain inputs', () => {
      const dataWithComplexDomains = {
        clientId: validClientId,
        domain: 'https://www.example.com/path',
        type: 'keywords' as const,
        competitorDomain: 'HTTP://COMPETITOR.COM/',
      }
      
      const result = dataforseoKeywordsSchema.safeParse(dataWithComplexDomains)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.domain).toBe('example.com')
        expect(result.data.competitorDomain).toBe('competitor.com')
      }
    })

    it('requires competitor domain for keywords type', () => {
      const invalidData = {
        clientId: validClientId,
        domain: 'example.com',
        type: 'keywords' as const,
        // missing competitorDomain
      }
      
      const result = dataforseoKeywordsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('validates type literal', () => {
      const invalidData = {
        clientId: validClientId,
        domain: 'example.com',
        type: 'invalid-type',
        competitorDomain: 'competitor.com',
      }
      
      const result = dataforseoKeywordsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})
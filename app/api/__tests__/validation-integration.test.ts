/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Integration tests for API validation without complex mocking
 */

import { validateBody, briefGenerateSchema, createOrgSchema } from '@/lib/validations'
import { NextResponse } from 'next/server'

// Simple mock for NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data: any, init?: ResponseInit) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
      data,
      init,
    })),
  },
}))

describe('API Validation Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('validateBody utility', () => {
    it('processes valid organization data correctly', () => {
      const validOrgData = {
        name: '  Test Organization  ',
        slug: 'Test-Organization!',
      }

      const result = validateBody(createOrgSchema, validOrgData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Test Organization') // Trimmed
        expect(result.data.slug).toBe('test-organization') // Sanitized
      }
    })

    it('rejects invalid organization data with detailed errors', () => {
      const invalidOrgData = {
        name: '', // Empty name
        slug: '!!!', // Invalid slug that becomes empty after sanitization
      }

      const result = validateBody(createOrgSchema, invalidOrgData)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(NextResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining([
              expect.stringContaining('name'),
              expect.stringContaining('slug'),
            ]),
          }),
          { status: 400 }
        )
      }
    })

    it('processes valid brief generation data correctly', () => {
      const validBriefData = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        targetKeyword: '  <script>content marketing</script>  ',
        contentType: 'blog_post',
      }

      const result = validateBody(briefGenerateSchema, validBriefData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.clientId).toBe('123e4567-e89b-12d3-a456-426614174000')
        expect(result.data.targetKeyword).toBe('content marketing') // Sanitized
        expect(result.data.contentType).toBe('blog_post')
      }
    })

    it('rejects invalid brief data with specific error messages', () => {
      const invalidBriefData = {
        clientId: 'not-a-uuid',
        targetKeyword: '', // Empty after sanitization
        contentType: 'x'.repeat(300), // Too long
      }

      const result = validateBody(briefGenerateSchema, invalidBriefData)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(NextResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining([
              'Invalid clientId',
            ]),
          }),
          { status: 400 }
        )
      }
    })

    it('handles edge cases in data sanitization', () => {
      const edgeCaseData = {
        name: '<div>Company & Co.</div>',
        slug: 'Company & Co.!!!',
      }

      const result = validateBody(createOrgSchema, edgeCaseData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Company & Co.') // HTML stripped, entities preserved
        expect(result.data.slug).toBe('company-co') // Properly slugified
      }
    })

    it('validates nested object structures', () => {
      // Test with a more complex schema if available
      const complexData = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        targetKeyword: 'valid keyword',
        contentType: undefined, // Optional field
      }

      const result = validateBody(briefGenerateSchema, complexData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.contentType).toBeUndefined()
      }
    })

    it('provides consistent error format across different schemas', () => {
      // Test org validation error format
      const invalidOrg = { name: '', slug: '' }
      const orgResult = validateBody(createOrgSchema, invalidOrg)

      // Test brief validation error format
      const invalidBrief = { clientId: 'invalid', targetKeyword: '' }
      const briefResult = validateBody(briefGenerateSchema, invalidBrief)

      expect(orgResult.success).toBe(false)
      expect(briefResult.success).toBe(false)

      // Both should use the same error structure
      if (!orgResult.success && !briefResult.success) {
        const orgResponse = orgResult.response as any
        const briefResponse = briefResult.response as any
        expect(orgResponse.data.error).toBe('Validation failed')
        expect(briefResponse.data.error).toBe('Validation failed')
        expect(Array.isArray(orgResponse.data.details)).toBe(true)
        expect(Array.isArray(briefResponse.data.details)).toBe(true)
      }
    })
  })

  describe('Schema composition and reuse', () => {
    it('handles UUID validation consistently across schemas', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000'
      const invalidUuid = 'not-a-uuid'

      // Test UUID in brief schema
      const validBrief = { clientId: validUuid, targetKeyword: 'test' }
      const invalidBrief = { clientId: invalidUuid, targetKeyword: 'test' }

      const validResult = validateBody(briefGenerateSchema, validBrief)
      const invalidResult = validateBody(briefGenerateSchema, invalidBrief)

      expect(validResult.success).toBe(true)
      expect(invalidResult.success).toBe(false)

      if (!invalidResult.success) {
        expect((invalidResult.response as any).data.details).toEqual(
          expect.arrayContaining([
            expect.stringContaining('Invalid clientId')
          ])
        )
      }
    })

    it('applies string sanitization consistently', () => {
      const testCases = [
        { input: '  test  ', expected: 'test' },
        { input: '<script>alert("xss")</script>test', expected: 'alert("xss")test' },
        { input: 'a'.repeat(1000), expectedLength: 500 }, // Should be capped at 500 for text fields
      ]

      testCases.forEach(({ input, expected, expectedLength }) => {
        const orgData = { name: input, slug: 'test-slug' }
        const result = validateBody(createOrgSchema, orgData)

        expect(result.success).toBe(true)
        if (result.success) {
          if (expected) {
            expect(result.data.name).toBe(expected)
          }
          if (expectedLength) {
            expect(result.data.name.length).toBeLessThanOrEqual(expectedLength)
          }
        }
      })
    })
  })

  describe('Performance with large datasets', () => {
    it('handles validation of large objects efficiently', () => {
      const largeOrgData = {
        name: 'Test Organization',
        slug: 'test-org',
        // Add many additional fields that might be ignored
        ...Object.fromEntries(
          Array.from({ length: 100 }, (_, i) => [`extra_field_${i}`, `value_${i}`])
        ),
      }

      const startTime = Date.now()
      const result = validateBody(createOrgSchema, largeOrgData)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(50) // Should complete quickly
      expect(result.success).toBe(true)
      if (result.success) {
        // Should only include schema-defined fields
        expect(Object.keys(result.data)).toEqual(['name', 'slug'])
      }
    })

    it('handles validation of many small objects efficiently', () => {
      const testData = Array.from({ length: 100 }, (_, i) => ({
        name: `Organization ${i}`,
        slug: `org-${i}`,
      }))

      const startTime = Date.now()
      const results = testData.map(data => validateBody(createOrgSchema, data))
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(100) // Should complete quickly
      expect(results.every(r => r.success)).toBe(true)
    })
  })
})
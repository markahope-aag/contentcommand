import { cn } from '../utils'

describe('cn utility function', () => {
  it('combines class names correctly', () => {
    const result = cn('text-red-500', 'bg-blue-100')
    expect(result).toContain('text-red-500')
    expect(result).toContain('bg-blue-100')
  })

  it('handles conditional classes', () => {
    const isActive = true
    const result = cn('base-class', isActive && 'active-class')
    expect(result).toContain('base-class')
    expect(result).toContain('active-class')
  })

  it('handles false conditional classes', () => {
    const isActive = false
    const result = cn('base-class', isActive && 'active-class')
    expect(result).toContain('base-class')
    expect(result).not.toContain('active-class')
  })

  it('merges conflicting Tailwind classes correctly', () => {
    const result = cn('p-4', 'p-8')
    // twMerge should keep only the last conflicting class
    expect(result).toBe('p-8')
  })

  it('handles empty inputs', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('handles undefined and null inputs', () => {
    const result = cn('text-sm', undefined, null, 'text-lg')
    expect(result).toBe('text-lg')
  })
})
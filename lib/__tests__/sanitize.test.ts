import {
  stripHtml,
  sanitizeString,
  sanitizeStringMax,
  sanitizeDomain,
  sanitizeSlug,
  sanitizeStringArray,
} from '../sanitize'

describe('sanitize utilities', () => {
  describe('stripHtml', () => {
    it('removes HTML tags', () => {
      expect(stripHtml('<p>Hello world</p>')).toBe('Hello world')
      expect(stripHtml('<script>alert("xss")</script>')).toBe('alert("xss")')
      expect(stripHtml('No <strong>HTML</strong> here')).toBe('No HTML here')
    })

    it('handles nested tags', () => {
      expect(stripHtml('<div><p>Nested <span>content</span></p></div>')).toBe('Nested content')
    })

    it('handles malformed HTML', () => {
      expect(stripHtml('<p>Unclosed tag')).toBe('Unclosed tag')
      expect(stripHtml('Text with < and > symbols')).toBe('Text with  symbols')
    })

    it('returns empty string for HTML-only input', () => {
      expect(stripHtml('<div></div>')).toBe('')
      expect(stripHtml('<br/>')).toBe('')
    })
  })

  describe('sanitizeString', () => {
    it('trims whitespace and strips HTML', () => {
      expect(sanitizeString('  <p>Hello</p>  ')).toBe('Hello')
      expect(sanitizeString('\n\t<div>Content</div>\n\t')).toBe('Content')
    })

    it('handles empty strings', () => {
      expect(sanitizeString('')).toBe('')
      expect(sanitizeString('   ')).toBe('')
    })
  })

  describe('sanitizeStringMax', () => {
    it('caps string length', () => {
      expect(sanitizeStringMax('This is a long string', 10)).toBe('This is a ')
      expect(sanitizeStringMax('Short', 10)).toBe('Short')
    })

    it('sanitizes before capping', () => {
      expect(sanitizeStringMax('  <p>Long content here</p>  ', 10)).toBe('Long conte')
    })

    it('handles zero length', () => {
      expect(sanitizeStringMax('Any string', 0)).toBe('')
    })
  })

  describe('sanitizeDomain', () => {
    it('removes protocol and www', () => {
      expect(sanitizeDomain('https://www.example.com')).toBe('example.com')
      expect(sanitizeDomain('http://example.com')).toBe('example.com')
      expect(sanitizeDomain('www.example.com')).toBe('example.com')
    })

    it('removes paths and trailing slashes', () => {
      expect(sanitizeDomain('example.com/path/to/page')).toBe('example.com')
      expect(sanitizeDomain('example.com/')).toBe('example.com')
    })

    it('converts to lowercase', () => {
      expect(sanitizeDomain('EXAMPLE.COM')).toBe('example.com')
      expect(sanitizeDomain('Example.Com')).toBe('example.com')
    })

    it('handles complex URLs', () => {
      expect(sanitizeDomain('https://www.EXAMPLE.com/path?query=1#hash')).toBe('example.com')
    })

    it('strips HTML and trims', () => {
      expect(sanitizeDomain('  <script>example.com</script>  ')).toBe('example.com<')
    })
  })

  describe('sanitizeSlug', () => {
    it('creates valid slugs', () => {
      expect(sanitizeSlug('Hello World')).toBe('hello-world')
      expect(sanitizeSlug('My Great Post!')).toBe('my-great-post')
    })

    it('handles special characters', () => {
      expect(sanitizeSlug('Post@#$%Title')).toBe('post-title')
      expect(sanitizeSlug('Title with (parentheses)')).toBe('title-with-parentheses')
    })

    it('removes leading and trailing hyphens', () => {
      expect(sanitizeSlug('-leading-and-trailing-')).toBe('leading-and-trailing')
      expect(sanitizeSlug('---multiple---')).toBe('multiple')
    })

    it('collapses multiple hyphens', () => {
      expect(sanitizeSlug('word----word')).toBe('word-word')
      expect(sanitizeSlug('a---b---c')).toBe('a-b-c')
    })

    it('handles empty or whitespace-only input', () => {
      expect(sanitizeSlug('')).toBe('')
      expect(sanitizeSlug('   ')).toBe('')
      expect(sanitizeSlug('!!!')).toBe('')
    })
  })

  describe('sanitizeStringArray', () => {
    it('sanitizes each string in array', () => {
      const input = ['  <p>First</p>  ', '<div>Second</div>', '  Third  ']
      const expected = ['First', 'Second', 'Third']
      expect(sanitizeStringArray(input)).toEqual(expected)
    })

    it('filters out empty strings', () => {
      const input = ['Valid', '  ', '<div></div>', 'Also valid']
      const expected = ['Valid', 'Also valid']
      expect(sanitizeStringArray(input)).toEqual(expected)
    })

    it('handles empty array', () => {
      expect(sanitizeStringArray([])).toEqual([])
    })

    it('handles array with only empty/whitespace strings', () => {
      const input = ['  ', '<div></div>', '\n\t']
      expect(sanitizeStringArray(input)).toEqual([])
    })
  })
})
import { render } from '@testing-library/react'
import { axe } from 'jest-axe'
import LoginPage from '../login/page'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: jest.fn(),
    },
  }),
}))

describe('LoginPage accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<LoginPage />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

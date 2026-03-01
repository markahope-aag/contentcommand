import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { SkipLink } from '../skip-link'

describe('SkipLink', () => {
  it('renders a skip link targeting main content', () => {
    render(<SkipLink />)

    const link = screen.getByText('Skip to main content')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '#main-content')
  })

  it('is visually hidden by default', () => {
    render(<SkipLink />)

    const link = screen.getByText('Skip to main content')
    expect(link).toHaveClass('sr-only')
  })

  it('has no accessibility violations', async () => {
    const { container } = render(<SkipLink />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

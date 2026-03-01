import { render } from '@testing-library/react'
import { axe } from 'jest-axe'
import type { ReactElement } from 'react'

/**
 * Renders a component and runs axe accessibility checks.
 * Asserts that there are no accessibility violations.
 */
export async function renderAndCheckA11y(
  ui: ReactElement,
  options?: { axeOptions?: Parameters<typeof axe>[1] }
): Promise<{ container: HTMLElement }> {
  const renderResult = render(ui)
  const results = await axe(renderResult.container, options?.axeOptions)
  expect(results).toHaveNoViolations()
  return { container: renderResult.container }
}

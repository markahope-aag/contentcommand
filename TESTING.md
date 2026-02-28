# Testing Guide for Content Command

## Overview

This project now has a comprehensive testing framework set up with Jest and React Testing Library. The tests are designed to be simple, useful, non-flaky, and require minimal mocking.

## Test Setup

### Framework
- **Jest** - Testing framework
- **@testing-library/react** - React component testing utilities
- **@testing-library/jest-dom** - Additional Jest matchers
- **@testing-library/user-event** - User interaction simulation

### Configuration
- `jest.config.js` - Jest configuration with Next.js integration
- `jest.setup.js` - Test environment setup and global mocks
- Path aliases configured for `@/` imports

### Scripts
```bash
npm test              # Run tests once
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

## Current Test Coverage

### ✅ Completed Tests

#### **Utility Functions** (100% coverage)
- `lib/utils.ts` - Class name utility function
- `lib/sanitize.ts` - Input sanitization functions
- `lib/validations.ts` - Zod schema validation
- `lib/content/workflow.ts` - Brief status transitions

#### **UI Components** (High coverage)
- `components/ui/button.tsx` - Button component with variants
- `components/ui/card.tsx` - Card components family

#### **API Integration Tests**
- `app/api/__tests__/validation-integration.test.ts` - API validation workflows
- Input sanitization and validation across different endpoints
- Error handling and response formatting consistency

#### **Business Logic Components**
- `components/__tests__/component-integration.test.tsx` - Complex component behavior
- Brief card status management and user interactions
- AI usage summary calculations and formatting
- Multi-component state management

#### **Integration Workflows**
- `__tests__/integration/brief-workflow.test.ts` - End-to-end workflows
- Complete brief lifecycle from draft to published
- AI usage tracking and cost calculation
- Quality scoring simulation
- Multi-brief workflow management
- Performance testing with large datasets

### 📊 Test Statistics
- **Test Suites**: 9 passed
- **Tests**: 140 passed  
- **Overall Coverage**: 6.85% (focused on core utilities and business logic)

## Test Principles

### 1. **Simple Tests**
- Focus on pure functions and isolated components
- Avoid complex setup or teardown
- Test one thing at a time

### 2. **Useful Tests**
- Test actual business logic and user interactions
- Cover edge cases and error conditions
- Verify expected behavior, not implementation details

### 3. **Non-Flaky Tests**
- Use deterministic test data
- Avoid time-dependent tests
- Mock external dependencies consistently

### 4. **Minimal Mocking**
- Mock only external dependencies (APIs, databases)
- Use real implementations for internal utilities
- Prefer dependency injection over complex mocks

## Test Examples

### Utility Function Test
```typescript
describe('sanitizeString', () => {
  it('trims whitespace and strips HTML', () => {
    expect(sanitizeString('  <p>Hello</p>  ')).toBe('Hello')
  })
})
```

### Component Test
```typescript
describe('Button Component', () => {
  it('handles click events', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()
    
    render(<Button onClick={handleClick}>Click me</Button>)
    await user.click(screen.getByRole('button'))
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### API Validation Test
```typescript
describe('validateBody utility', () => {
  it('processes valid organization data correctly', () => {
    const validData = { name: '  Test Org  ', slug: 'Test-Org!' }
    const result = validateBody(createOrgSchema, validData)
    
    expect(result.success).toBe(true)
    expect(result.data.name).toBe('Test Org') // Trimmed
    expect(result.data.slug).toBe('test-org') // Sanitized
  })
})
```

### Business Logic Component Test
```typescript
describe('BriefCard', () => {
  it('shows correct buttons based on status', () => {
    const draftBrief = { ...baseBrief, status: 'draft' }
    render(<BriefCard brief={draftBrief} onApprove={jest.fn()} />)
    
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Generate' })).not.toBeInTheDocument()
  })
})
```

### Integration Workflow Test
```typescript
describe('Brief Workflow', () => {
  it('completes full lifecycle from draft to published', async () => {
    const simulator = new BriefWorkflowSimulator(testBrief)
    const transitions = await simulator.runHappyPathWorkflow()
    
    expect(transitions).toEqual(['approved', 'generating', 'generated', 'reviewing', 'published'])
    expect(simulator.getCurrentState()).toBe('published')
  })
})
```

## Next Steps

### 🎯 Priority Areas for Additional Tests

1. **Database Operations** (Remaining)
   - Test CRUD operations with test database
   - Test query functions with real Supabase
   - Test RLS policies and permissions

2. **Real API Route Testing** (Future)
   - Test with actual Supabase connections
   - Test authentication flows end-to-end
   - Test external API integrations

3. **Advanced Integration Tests** (Future)
   - Browser-based E2E testing
   - Performance testing under load
   - Error recovery scenarios

### 🚀 Advanced Testing Features

1. **Visual Regression Testing**
   - Screenshot testing for UI components
   - Storybook integration

2. **Performance Testing**
   - Load testing for API endpoints
   - Component render performance

3. **Accessibility Testing**
   - axe-core integration
   - Keyboard navigation tests

## Best Practices

### Writing Tests
1. **Arrange, Act, Assert** pattern
2. **Descriptive test names** that explain the scenario
3. **Test the interface, not the implementation**
4. **Use data-testid for complex queries**

### Maintaining Tests
1. **Keep tests close to the code** they test
2. **Update tests when requirements change**
3. **Remove tests for deleted features**
4. **Refactor tests when code is refactored**

### Performance
1. **Use `screen` queries over `container` queries**
2. **Avoid unnecessary `async/await`**
3. **Mock expensive operations**
4. **Use `beforeEach` for common setup**

## Troubleshooting

### Common Issues

1. **Module resolution errors**
   - Check path aliases in `jest.config.js`
   - Verify imports use correct paths

2. **Async test failures**
   - Use `waitFor` for async operations
   - Ensure proper cleanup with `cleanup()`

3. **Mock issues**
   - Clear mocks between tests with `jest.clearAllMocks()`
   - Use `jest.resetModules()` for module state

### Debug Tips
- Use `screen.debug()` to see rendered output
- Use `logRoles()` to see available ARIA roles
- Check Jest configuration with `--showConfig`

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
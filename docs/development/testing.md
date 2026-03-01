# Testing Guide

Content Command maintains comprehensive test coverage across all layers of the application. This guide covers our testing strategy, tools, and best practices.

## Testing Philosophy

Our testing approach follows the testing pyramid:

```
    /\
   /  \     E2E Tests (Few)
  /____\    
 /      \   Integration Tests (Some)
/__________\ Unit Tests (Many)
```

### Testing Principles

1. **Fast Feedback**: Tests should run quickly and provide immediate feedback
2. **Reliable**: Tests should be deterministic and not flaky
3. **Maintainable**: Tests should be easy to understand and modify
4. **Comprehensive**: Critical paths must be thoroughly tested
5. **Isolated**: Tests should not depend on external services or state

## Test Structure

### Directory Organization

```
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   └── __tests__/
│   │       └── button.test.tsx
│   ├── content/
│   │   ├── review-panel.tsx
│   │   └── __tests__/
│   │       └── review-panel.test.tsx
├── lib/
│   ├── supabase/
│   │   ├── queries.ts
│   │   └── __tests__/
│   │       ├── queries.test.ts
│   │       ├── rls-policies.test.ts
│   │       └── migrations-transactions.test.ts
│   └── test-utils/
│       ├── database-test-framework.ts
│       ├── api-test-framework.ts
│       └── integration-helpers.ts
└── app/
    └── api/
        └── __tests__/
            ├── api-endpoints-unit.test.ts
            └── validation-integration.test.ts
```

### Test Categories

#### 1. Unit Tests
Test individual functions, components, and modules in isolation.

**Location**: `__tests__` directories alongside source files
**Tools**: Jest, React Testing Library
**Coverage**: ~70% of total tests

#### 2. Integration Tests
Test interactions between multiple components or modules.

**Location**: `__tests__` directories in feature folders
**Tools**: Jest, Supertest, Test Database
**Coverage**: ~25% of total tests

#### 3. End-to-End Tests
Test complete user workflows from browser perspective.

**Location**: `e2e/` directory (future implementation)
**Tools**: Playwright
**Coverage**: ~5% of total tests

## Testing Tools

### Core Testing Framework

#### Jest Configuration

```javascript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,ts}',
    'app/**/*.{js,ts}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}

module.exports = createJestConfig(customJestConfig)
```

#### Jest Setup

```javascript
// jest.setup.js
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Supabase
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
      signOut: jest.fn(),
    },
  }),
}))
```

### Component Testing

#### React Testing Library

We use React Testing Library for component testing with these principles:

- **Test behavior, not implementation**
- **Use accessible queries** (getByRole, getByLabelText)
- **Test user interactions**
- **Avoid testing internal state**

#### Example Component Test

```typescript
// components/ui/__tests__/button.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../button'

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('handles click events', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()
    
    render(<Button onClick={handleClick}>Click me</Button>)
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies variant styles correctly', () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-destructive')
  })

  it('handles disabled state', () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })
})
```

### API Testing

#### Database Testing Framework

We've built a comprehensive framework for testing database operations:

```typescript
// lib/test-utils/database-test-framework.ts
export const testDataFactory = {
  organization: (overrides = {}): Organization => ({
    id: 'org-test-id',
    name: 'Test Organization',
    slug: 'test-org',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }),

  client: (overrides = {}): Client => ({
    id: 'client-test-id',
    name: 'Test Client',
    domain: 'testclient.com',
    industry: 'Technology',
    target_keywords: ['test', 'keywords'],
    brand_voice: { tone: 'professional' },
    org_id: 'org-test-id',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }),
}

export const rlsTestHelpers = {
  expectAuthorized: async (queryFn: () => Promise<any>) => {
    const result = await queryFn()
    expect(result.error).toBeNull()
    expect(result.data).toBeDefined()
    return result.data
  },

  expectUnauthorized: async (queryFn: () => Promise<any>) => {
    const result = await queryFn()
    expect(result.error).toBeTruthy()
    expect(result.data).toBeNull()
    return result.error
  },
}
```

#### Example Database Test

```typescript
// lib/supabase/__tests__/queries.test.ts
import { getOrganizations, createOrganization } from '../queries'
import { testDataFactory, mockQueryResults } from '@/lib/test-utils/database-test-framework'

describe('Organization Queries', () => {
  let mockClient: jest.Mocked<any>

  beforeEach(() => {
    mockClient = createMockSupabaseClient()
    const { createClient } = require('../server')
    createClient.mockResolvedValue(mockClient)
  })

  describe('getOrganizations', () => {
    it('fetches all organizations ordered by created_at desc', async () => {
      const mockOrgs = [
        testDataFactory.organization({ name: 'Org 1' }),
        testDataFactory.organization({ name: 'Org 2' }),
      ]
      
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue(mockQueryResults.success(mockOrgs)),
        }),
      })

      const result = await getOrganizations()

      expect(mockClient.from).toHaveBeenCalledWith('organizations')
      expect(result).toEqual(mockOrgs)
    })
  })
})
```

### RLS Policy Testing

#### Testing Row Level Security

```typescript
// lib/supabase/__tests__/rls-policies.test.ts
describe('RLS Policies', () => {
  describe('Organization Policies', () => {
    it('allows users to view their organizations', async () => {
      authTestHelpers.mockAuthenticatedUser(mockClient, TEST_USERS.owner.id)
      const mockOrgs = [testDataFactory.organization()]
      
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue(mockQueryResults.success(mockOrgs)),
        }),
      })

      const queryFn = async () => {
        return await mockClient
          .from('organizations')
          .select('*')
          .order('created_at', { ascending: false })
      }

      const result = await rlsTestHelpers.expectAuthorized(queryFn)
      expect(result).toEqual(mockOrgs)
    })

    it('denies access to unauthenticated users', async () => {
      authTestHelpers.mockUnauthenticatedUser(mockClient)
      
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue(mockQueryResults.error('JWT expired', 'PGRST301')),
        }),
      })

      const queryFn = async () => {
        return await mockClient
          .from('organizations')
          .select('*')
          .order('created_at', { ascending: false })
      }

      await rlsTestHelpers.expectUnauthorized(queryFn)
    })
  })
})
```

### API Route Testing

#### Testing API Endpoints

```typescript
// app/api/__tests__/api-endpoints-unit.test.ts
import { POST } from '../organizations/route'
import { createMockRequest } from '@/lib/test-utils/api-test-framework'

describe('/api/organizations', () => {
  describe('POST', () => {
    it('creates organization with valid data', async () => {
      const mockRequest = createMockRequest({
        method: 'POST',
        body: {
          name: 'Test Organization',
          slug: 'test-org',
        },
        user: { id: 'user-id' },
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe('Test Organization')
    })

    it('validates required fields', async () => {
      const mockRequest = createMockRequest({
        method: 'POST',
        body: {}, // Missing required fields
        user: { id: 'user-id' },
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('ValidationError')
    })
  })
})
```

## Test Patterns and Best Practices

### Component Testing Patterns

#### 1. Arrange, Act, Assert (AAA)

```typescript
it('updates input value on change', async () => {
  // Arrange
  const user = userEvent.setup()
  render(<SearchInput onSearch={jest.fn()} />)
  
  // Act
  const input = screen.getByRole('textbox')
  await user.type(input, 'search term')
  
  // Assert
  expect(input).toHaveValue('search term')
})
```

#### 2. Testing User Interactions

```typescript
it('submits form with correct data', async () => {
  const mockOnSubmit = jest.fn()
  const user = userEvent.setup()
  
  render(<ContactForm onSubmit={mockOnSubmit} />)
  
  await user.type(screen.getByLabelText(/name/i), 'John Doe')
  await user.type(screen.getByLabelText(/email/i), 'john@example.com')
  await user.click(screen.getByRole('button', { name: /submit/i }))
  
  expect(mockOnSubmit).toHaveBeenCalledWith({
    name: 'John Doe',
    email: 'john@example.com',
  })
})
```

#### 3. Testing Async Operations

```typescript
it('displays loading state during API call', async () => {
  const mockApiCall = jest.fn().mockImplementation(
    () => new Promise(resolve => setTimeout(resolve, 100))
  )
  
  render(<DataFetcher apiCall={mockApiCall} />)
  
  const button = screen.getByRole('button', { name: /fetch data/i })
  fireEvent.click(button)
  
  expect(screen.getByText(/loading/i)).toBeInTheDocument()
  
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })
})
```

### Mocking Strategies

#### 1. External API Mocking

```typescript
// Mock fetch for API calls
global.fetch = jest.fn()

beforeEach(() => {
  (fetch as jest.Mock).mockClear()
})

it('handles API success response', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data: 'success' }),
  })

  const result = await apiCall('/test-endpoint')
  expect(result).toEqual({ data: 'success' })
})
```

#### 2. Database Mocking

```typescript
// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      }),
    }),
  }),
}))
```

#### 3. Hook Mocking

```typescript
// Mock custom hooks
jest.mock('@/hooks/use-client-data', () => ({
  useClientData: () => ({
    data: mockClientData,
    loading: false,
    error: null,
  }),
}))
```

### Testing Complex Components

#### 1. Form Components

```typescript
describe('ClientForm', () => {
  it('validates form fields', async () => {
    const user = userEvent.setup()
    render(<ClientForm onSubmit={jest.fn()} />)
    
    // Submit without filling required fields
    await user.click(screen.getByRole('button', { name: /save/i }))
    
    expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    expect(screen.getByText(/domain is required/i)).toBeInTheDocument()
  })

  it('submits valid form data', async () => {
    const mockOnSubmit = jest.fn()
    const user = userEvent.setup()
    
    render(<ClientForm onSubmit={mockOnSubmit} />)
    
    await user.type(screen.getByLabelText(/name/i), 'Test Client')
    await user.type(screen.getByLabelText(/domain/i), 'testclient.com')
    await user.selectOptions(screen.getByLabelText(/industry/i), 'Technology')
    await user.click(screen.getByRole('button', { name: /save/i }))
    
    expect(mockOnSubmit).toHaveBeenCalledWith({
      name: 'Test Client',
      domain: 'testclient.com',
      industry: 'Technology',
    })
  })
})
```

#### 2. Data Display Components

```typescript
describe('ClientList', () => {
  it('displays client data correctly', () => {
    const mockClients = [
      { id: '1', name: 'Client 1', domain: 'client1.com' },
      { id: '2', name: 'Client 2', domain: 'client2.com' },
    ]
    
    render(<ClientList clients={mockClients} />)
    
    expect(screen.getByText('Client 1')).toBeInTheDocument()
    expect(screen.getByText('client1.com')).toBeInTheDocument()
    expect(screen.getByText('Client 2')).toBeInTheDocument()
    expect(screen.getByText('client2.com')).toBeInTheDocument()
  })

  it('displays empty state when no clients', () => {
    render(<ClientList clients={[]} />)
    expect(screen.getByText(/no clients found/i)).toBeInTheDocument()
  })
})
```

## Running Tests

### Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- button.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="validation"

# Run tests for specific directory
npm test -- components/ui
```

### Coverage Reports

Coverage reports are generated in the `coverage/` directory:

```bash
# Generate and view coverage report
npm run test:coverage
open coverage/lcov-report/index.html
```

### Continuous Integration

Tests run automatically on:
- Pull request creation
- Push to main branch
- Scheduled nightly runs

#### GitHub Actions Configuration

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run lint
      - run: npm run build
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
```

## Test Quality Guidelines

### Writing Good Tests

1. **Descriptive Test Names**
   ```typescript
   // Good
   it('displays error message when API call fails')
   
   // Bad
   it('handles error')
   ```

2. **Single Responsibility**
   ```typescript
   // Good - tests one thing
   it('validates email format')
   it('validates password length')
   
   // Bad - tests multiple things
   it('validates form')
   ```

3. **Clear Assertions**
   ```typescript
   // Good
   expect(screen.getByText('Success!')).toBeInTheDocument()
   
   // Bad
   expect(container.innerHTML).toContain('Success!')
   ```

### Test Maintenance

1. **Keep Tests DRY**
   - Use setup functions for common test data
   - Extract reusable test utilities
   - Use beforeEach for common setup

2. **Update Tests with Code Changes**
   - Modify tests when behavior changes
   - Remove obsolete tests
   - Add tests for new features

3. **Review Test Failures**
   - Investigate failing tests immediately
   - Don't ignore flaky tests
   - Fix root causes, not symptoms

## Debugging Tests

### Common Issues and Solutions

#### 1. Async Test Issues

```typescript
// Problem: Test finishes before async operation
it('loads data', async () => {
  render(<DataComponent />)
  // Test might finish before data loads
  expect(screen.getByText('Data loaded')).toBeInTheDocument()
})

// Solution: Wait for async operations
it('loads data', async () => {
  render(<DataComponent />)
  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument()
  })
})
```

#### 2. Mock Issues

```typescript
// Problem: Mock not working as expected
jest.mock('@/lib/api', () => ({
  fetchData: jest.fn(),
}))

// Solution: Ensure mock is properly typed and implemented
const mockFetchData = jest.fn()
jest.mock('@/lib/api', () => ({
  fetchData: mockFetchData,
}))

beforeEach(() => {
  mockFetchData.mockResolvedValue({ data: 'test' })
})
```

#### 3. Component Not Found Issues

```typescript
// Problem: Component not rendering
expect(screen.getByText('Submit')).toBeInTheDocument()

// Solution: Debug what's actually rendered
screen.debug() // Shows current DOM
screen.logTestingPlaygroundURL() // Interactive debugging
```

### Test Debugging Tools

1. **screen.debug()** - Print current DOM
2. **screen.logTestingPlaygroundURL()** - Interactive query builder
3. **Jest debugger** - Step through test execution
4. **React DevTools** - Inspect component state

## Performance Testing

### Test Performance Guidelines

1. **Fast Tests**
   - Unit tests should run in milliseconds
   - Integration tests should complete within seconds
   - Avoid unnecessary async operations

2. **Parallel Execution**
   - Tests run in parallel by default
   - Use `--maxWorkers` to control parallelism
   - Avoid shared state between tests

3. **Selective Testing**
   - Use `--testPathPattern` for focused testing
   - Skip expensive tests during development
   - Use `test.skip()` for temporarily disabled tests

### Monitoring Test Performance

```bash
# Run tests with timing information
npm test -- --verbose

# Profile test execution
npm test -- --detectOpenHandles --forceExit

# Run tests with coverage and timing
npm run test:coverage -- --verbose
```

This comprehensive testing guide ensures Content Command maintains high quality and reliability across all components and features.
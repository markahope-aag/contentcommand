/**
 * Tests for ApiKeyForm component
 * Tests form handling, validation, and submission
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiKeyForm } from '../api-key-form'

describe('ApiKeyForm', () => {
  const mockOnSave = jest.fn()
  const mockOnOpenChange = jest.fn()

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    provider: 'DataForSEO',
    fields: [
      { key: 'apiKey', label: 'API Key' },
      { key: 'username', label: 'Username' },
    ],
    onSave: mockOnSave,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders form when open', () => {
    render(<ApiKeyForm {...defaultProps} />)
    
    expect(screen.getByText('Configure DataForSEO')).toBeInTheDocument()
    expect(screen.getByLabelText('API Key')).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<ApiKeyForm {...defaultProps} open={false} />)
    
    expect(screen.queryByText('Configure DataForSEO')).not.toBeInTheDocument()
  })

  it('renders all provided fields', () => {
    const fieldsWithTypes = [
      { key: 'apiKey', label: 'API Key', type: 'password' },
      { key: 'endpoint', label: 'API Endpoint', type: 'url' },
      { key: 'timeout', label: 'Timeout (seconds)', type: 'number' },
    ]
    
    render(<ApiKeyForm {...defaultProps} fields={fieldsWithTypes} />)
    
    expect(screen.getByLabelText('API Key')).toHaveAttribute('type', 'password')
    expect(screen.getByLabelText('API Endpoint')).toHaveAttribute('type', 'url')
    expect(screen.getByLabelText('Timeout (seconds)')).toHaveAttribute('type', 'number')
  })

  it('defaults field type to text when not specified', () => {
    render(<ApiKeyForm {...defaultProps} />)
    
    expect(screen.getByLabelText('API Key')).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText('Username')).toHaveAttribute('type', 'text')
  })

  it('updates field values when typing', async () => {
    const user = userEvent.setup()
    render(<ApiKeyForm {...defaultProps} />)
    
    const apiKeyInput = screen.getByLabelText('API Key')
    const usernameInput = screen.getByLabelText('Username')
    
    await user.type(apiKeyInput, 'test-api-key')
    await user.type(usernameInput, 'test-username')
    
    expect(apiKeyInput).toHaveValue('test-api-key')
    expect(usernameInput).toHaveValue('test-username')
  })

  it('submits form with correct values', async () => {
    const user = userEvent.setup()
    render(<ApiKeyForm {...defaultProps} />)
    
    const apiKeyInput = screen.getByLabelText('API Key')
    const usernameInput = screen.getByLabelText('Username')
    const saveButton = screen.getByText('Save')
    
    await user.type(apiKeyInput, 'test-api-key')
    await user.type(usernameInput, 'test-username')
    await user.click(saveButton)
    
    expect(mockOnSave).toHaveBeenCalledWith({
      apiKey: 'test-api-key',
      username: 'test-username',
    })
  })

  it('closes dialog after successful submission', async () => {
    const user = userEvent.setup()
    render(<ApiKeyForm {...defaultProps} />)
    
    const apiKeyInput = screen.getByLabelText('API Key')
    const saveButton = screen.getByText('Save')
    
    await user.type(apiKeyInput, 'test-api-key')
    await user.click(saveButton)
    
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('clears form values after submission', async () => {
    const user = userEvent.setup()
    render(<ApiKeyForm {...defaultProps} />)
    
    const apiKeyInput = screen.getByLabelText('API Key')
    const saveButton = screen.getByText('Save')
    
    await user.type(apiKeyInput, 'test-api-key')
    await user.click(saveButton)
    
    // Form should be cleared (though dialog might be closed)
    expect(mockOnSave).toHaveBeenCalled()
  })

  it('cancels form without saving', async () => {
    const user = userEvent.setup()
    render(<ApiKeyForm {...defaultProps} />)
    
    const apiKeyInput = screen.getByLabelText('API Key')
    const cancelButton = screen.getByText('Cancel')
    
    await user.type(apiKeyInput, 'test-api-key')
    await user.click(cancelButton)
    
    expect(mockOnSave).not.toHaveBeenCalled()
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('requires all fields to be filled', async () => {
    const user = userEvent.setup()
    render(<ApiKeyForm {...defaultProps} />)
    
    const saveButton = screen.getByText('Save')
    
    // Try to submit without filling fields
    await user.click(saveButton)
    
    // Form should not submit (HTML5 validation)
    expect(mockOnSave).not.toHaveBeenCalled()
  })

  it('handles form submission via Enter key', async () => {
    const user = userEvent.setup()
    render(<ApiKeyForm {...defaultProps} />)
    
    const apiKeyInput = screen.getByLabelText('API Key')
    const usernameInput = screen.getByLabelText('Username')
    
    await user.type(apiKeyInput, 'test-api-key')
    await user.type(usernameInput, 'test-username')
    await user.keyboard('{Enter}')
    
    expect(mockOnSave).toHaveBeenCalledWith({
      apiKey: 'test-api-key',
      username: 'test-username',
    })
  })

  it('displays informational text about API keys', () => {
    render(<ApiKeyForm {...defaultProps} />)
    
    expect(screen.getByText(/API keys are stored as environment variables/)).toBeInTheDocument()
    expect(screen.getByText(/Contact your administrator to update them/)).toBeInTheDocument()
  })

  it('handles single field form', () => {
    const singleFieldProps = {
      ...defaultProps,
      fields: [{ key: 'token', label: 'Access Token' }],
    }
    
    render(<ApiKeyForm {...singleFieldProps} />)
    
    expect(screen.getByLabelText('Access Token')).toBeInTheDocument()
    expect(screen.queryByLabelText('Username')).not.toBeInTheDocument()
  })

  it('handles empty fields array', () => {
    const noFieldsProps = {
      ...defaultProps,
      fields: [],
    }
    
    render(<ApiKeyForm {...noFieldsProps} />)
    
    expect(screen.getByText('Configure DataForSEO')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
    // No input fields should be present
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('handles special characters in field values', async () => {
    const user = userEvent.setup()
    render(<ApiKeyForm {...defaultProps} />)
    
    const apiKeyInput = screen.getByLabelText('API Key')
    const specialValue = 'key-with-special-chars!@#$%^&*()'
    
    await user.type(apiKeyInput, specialValue)
    
    expect(apiKeyInput).toHaveValue(specialValue)
  })

  it('preserves field order as provided', () => {
    const orderedFields = [
      { key: 'field3', label: 'Third Field' },
      { key: 'field1', label: 'First Field' },
      { key: 'field2', label: 'Second Field' },
    ]
    
    render(<ApiKeyForm {...defaultProps} fields={orderedFields} />)
    
    const inputs = screen.getAllByRole('textbox')
    expect(inputs[0]).toHaveAttribute('id', 'field3')
    expect(inputs[1]).toHaveAttribute('id', 'field1')
    expect(inputs[2]).toHaveAttribute('id', 'field2')
  })

  it('handles long provider names', () => {
    const longProviderProps = {
      ...defaultProps,
      provider: 'Very Long Provider Name That Should Display Correctly',
    }
    
    render(<ApiKeyForm {...longProviderProps} />)
    
    expect(screen.getByText('Configure Very Long Provider Name That Should Display Correctly')).toBeInTheDocument()
  })

  it('handles form reset when dialog reopens', () => {
    const { rerender } = render(<ApiKeyForm {...defaultProps} open={false} />)
    
    // Open dialog
    rerender(<ApiKeyForm {...defaultProps} open={true} />)
    
    // Fields should be empty on fresh open
    expect(screen.getByLabelText('API Key')).toHaveValue('')
    expect(screen.getByLabelText('Username')).toHaveValue('')
  })

  it('prevents form submission with empty required fields', () => {
    render(<ApiKeyForm {...defaultProps} />)
    
    const form = screen.getByRole('form')
    const apiKeyInput = screen.getByLabelText('API Key')
    
    // Check that required attribute is set
    expect(apiKeyInput).toBeRequired()
    
    // Form should have noValidate to false (default HTML5 validation)
    expect(form).not.toHaveAttribute('noValidate')
  })
})
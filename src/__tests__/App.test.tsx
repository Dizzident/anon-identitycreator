import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { CryptoService } from '../utils/crypto'

jest.mock('../utils/crypto', () => ({
  CryptoService: {
    generateKeyPair: jest.fn(),
  },
}))

// Mock the storage providers
jest.mock('../utils/storage', () => ({
  createStorageProvider: jest.fn(() => ({
    type: 'memory',
    save: jest.fn().mockResolvedValue(undefined),
    load: jest.fn().mockResolvedValue([]),
    clear: jest.fn().mockResolvedValue(undefined),
  })),
  MemoryStorageProvider: jest.fn().mockImplementation(() => ({
    type: 'memory',
    save: jest.fn().mockResolvedValue(undefined),
    load: jest.fn().mockResolvedValue([]),
    clear: jest.fn().mockResolvedValue(undefined),
  })),
}))

describe('App', () => {
  const mockKeyPair = {
    publicKey: new Uint8Array([1, 2, 3, 4, 5]),
    privateKey: new Uint8Array([6, 7, 8, 9, 10]),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    ;(CryptoService.generateKeyPair as jest.Mock).mockResolvedValue(mockKeyPair)
    // Mock window.confirm to always return true for storage change tests
    window.confirm = jest.fn(() => true)
  })

  it('renders app header and main components', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByText('Anonymous Identity Manager')).toBeInTheDocument()
    })
    
    expect(screen.getByText('DID Storage Configuration')).toBeInTheDocument()
    expect(screen.getByText('Create New Identity')).toBeInTheDocument()
    expect(screen.getByText('Your Identities')).toBeInTheDocument()
  })

  it('creates and displays a new identity', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    const input = screen.getByLabelText('Identity Name *')
    const createButton = screen.getByRole('button', { name: 'Create Identity' })
    
    await user.type(input, 'Test Identity')
    await user.click(createButton)
    
    await waitFor(() => {
      expect(screen.getByText('Test Identity')).toBeInTheDocument()
    })
    
    expect(screen.queryByText('No identities created yet. Create one above!')).not.toBeInTheDocument()
  })

  it('deletes an identity', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    // Create an identity first
    const input = screen.getByLabelText('Identity Name *')
    const createButton = screen.getByRole('button', { name: 'Create Identity' })
    
    await user.type(input, 'Test Identity')
    await user.click(createButton)
    
    await waitFor(() => {
      expect(screen.getByText('Test Identity')).toBeInTheDocument()
    })
    
    // Delete the identity
    const deleteButton = screen.getByRole('button', { name: '×' })
    await user.click(deleteButton)
    
    expect(screen.queryByText('Test Identity')).not.toBeInTheDocument()
    expect(screen.getByText('No identities created yet. Create one above!')).toBeInTheDocument()
  })

  it('creates multiple identities', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    const input = screen.getByLabelText('Identity Name *')
    const createButton = screen.getByRole('button', { name: 'Create Identity' })
    
    // Create first identity
    await user.type(input, 'Identity 1')
    await user.click(createButton)
    
    await waitFor(() => {
      expect(screen.getByText('Identity 1')).toBeInTheDocument()
    })
    
    // Create second identity
    await user.type(input, 'Identity 2')
    await user.click(createButton)
    
    await waitFor(() => {
      expect(screen.getByText('Identity 2')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Identity 1')).toBeInTheDocument()
    expect(screen.getByText('Identity 2')).toBeInTheDocument()
  })

  it('displays storage configuration with default DID mode', async () => {
    render(<App />)
    
    // App defaults to DID mode
    expect(screen.getByText('DID Storage Configuration')).toBeInTheDocument()
    expect(screen.getByText(/\d+ identities/)).toBeInTheDocument()
    
    // Check that DID mode checkbox is checked
    const didModeCheckbox = screen.getByRole('checkbox', { name: /Use DID\/VC Mode/i }) as HTMLInputElement
    expect(didModeCheckbox.checked).toBe(true)
  })

  it('changes storage type when radio button is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    // First switch to legacy mode to see the old storage config
    const didModeCheckbox = screen.getByRole('checkbox', { name: /Use DID\/VC Mode/i })
    await user.click(didModeCheckbox)
    
    // Confirm the mode switch
    expect(window.confirm).toHaveBeenCalledWith(
      'Switching between legacy and DID modes will clear current session. Continue?'
    )
    
    // Wait for storage configuration to appear
    await waitFor(() => {
      expect(screen.getByText('Storage Configuration')).toBeInTheDocument()
    })
    
    const localStorageRadio = screen.getByDisplayValue('localStorage')
    await user.click(localStorageRadio)
    
    expect(window.confirm).toHaveBeenCalledWith(
      'Changing storage type will clear current identities from the old storage. Continue?'
    )
    
    await waitFor(() => {
      expect(screen.getByText('localStorage')).toBeInTheDocument()
    })
  })
})
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UrlClaimStep from '@/components/admin/onboarding/UrlClaimStep'
import InviteGateStep from '@/components/admin/onboarding/InviteGateStep'

// InviteGateStep hosts the invite-request modal, which reads the session.
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}))

// The invite code moved from the claim screen to its own gate screen that runs
// first — these suites mirror that split.

function setupGate(props = {}) {
  const setInviteCode = jest.fn()
  const onSubmit = jest.fn((e) => e.preventDefault())
  render(
    <InviteGateStep
      firstName="Ann"
      inviteCode={props.inviteCode ?? ''}
      setInviteCode={setInviteCode}
      error={props.error ?? ''}
      checking={props.checking ?? false}
      onSubmit={onSubmit}
    />
  )
  return { setInviteCode, onSubmit }
}

function setupClaim(props = {}) {
  const setUsername = jest.fn()
  const onSubmit = jest.fn((e) => e.preventDefault())
  render(
    <UrlClaimStep
      rootDomain="sepia.photo"
      username={props.username ?? ''}
      setUsername={setUsername}
      slug={props.slug ?? ''}
      error={props.error ?? ''}
      saving={false}
      onSubmit={onSubmit}
    />
  )
  return { setUsername, onSubmit }
}

describe('InviteGateStep', () => {
  it('renders an invite code field', () => {
    setupGate()
    expect(screen.getByLabelText(/invite code/i)).toBeInTheDocument()
  })

  it('typing an invite code calls setInviteCode', async () => {
    const { setInviteCode } = setupGate()
    await userEvent.type(screen.getByLabelText(/invite code/i), 'X')
    expect(setInviteCode).toHaveBeenCalled()
  })

  it('disables the door until a code is entered', () => {
    setupGate({ inviteCode: '' })
    expect(screen.getByRole('button', { name: /come in/i })).toBeDisabled()
  })

  it('enables the door when a code is present', () => {
    setupGate({ inviteCode: 'SEPIA-EARLY' })
    expect(screen.getByRole('button', { name: /come in/i })).toBeEnabled()
  })

  it('shows invite errors', () => {
    setupGate({ inviteCode: 'SEPIA-BAD', error: "That invite code isn't valid." })
    expect(screen.getByText(/isn't valid/i)).toBeInTheDocument()
  })
})

describe('UrlClaimStep', () => {
  it('no longer asks for an invite code (the gate handles it)', () => {
    setupClaim()
    expect(screen.queryByLabelText(/invite code/i)).not.toBeInTheDocument()
  })

  it('disables submit until a slug is present', () => {
    setupClaim({ slug: '' })
    expect(screen.getByRole('button', { name: /claim/i })).toBeDisabled()
  })

  it('enables submit with a slug alone', () => {
    setupClaim({ username: 'ann', slug: 'ann' })
    expect(screen.getByRole('button', { name: /claim/i })).toBeEnabled()
  })
})

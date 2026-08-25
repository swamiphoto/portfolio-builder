import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UrlClaimStep from '@/components/admin/onboarding/UrlClaimStep'

function setup(props = {}) {
  const setUsername = jest.fn()
  const setInviteCode = jest.fn()
  const onSubmit = jest.fn((e) => e.preventDefault())
  render(
    <UrlClaimStep
      rootDomain="sepia.photo"
      username={props.username ?? ''}
      setUsername={setUsername}
      slug={props.slug ?? ''}
      inviteCode={props.inviteCode ?? ''}
      setInviteCode={setInviteCode}
      error={props.error ?? ''}
      saving={false}
      onSubmit={onSubmit}
    />
  )
  return { setUsername, setInviteCode, onSubmit }
}

it('renders an invite code field', () => {
  setup()
  expect(screen.getByLabelText(/invite code/i)).toBeInTheDocument()
})

it('typing an invite code calls setInviteCode', async () => {
  const { setInviteCode } = setup()
  await userEvent.type(screen.getByLabelText(/invite code/i), 'X')
  expect(setInviteCode).toHaveBeenCalled()
})

it('disables submit until both slug and invite code are present', () => {
  setup({ slug: 'ann', inviteCode: '' })
  expect(screen.getByRole('button', { name: /claim/i })).toBeDisabled()
})

it('enables submit when slug and invite code are present', () => {
  setup({ username: 'ann', slug: 'ann', inviteCode: 'SEPIA-EARLY' })
  expect(screen.getByRole('button', { name: /claim/i })).toBeEnabled()
})

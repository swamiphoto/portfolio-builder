const sendMailInner = jest.fn().mockResolvedValue({ messageId: 'm1' })
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: sendMailInner })),
}))
import nodemailer from 'nodemailer'
import { sendMail } from '../../common/email/mailer'

const OLD = process.env
beforeEach(() => { jest.clearAllMocks(); process.env = { ...OLD } })
afterEach(() => { process.env = OLD })

describe('sendMail', () => {
  it('no-ops (does not throw) when SMTP is unconfigured', async () => {
    delete process.env.SMTP_USER; delete process.env.SMTP_PASS
    const out = await sendMail({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' })
    expect(out).toEqual({ sent: false })
    expect(nodemailer.createTransport).not.toHaveBeenCalled()
  })

  it('sends via nodemailer when configured', async () => {
    process.env.SMTP_USER = 'u@sepia.so'; process.env.SMTP_PASS = 'pw'
    const out = await sendMail({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' })
    expect(out).toEqual({ sent: true })
    expect(nodemailer.createTransport).toHaveBeenCalledTimes(1)
    expect(sendMailInner).toHaveBeenCalledWith(expect.objectContaining({ to: 'a@b.com', subject: 'Hi' }))
  })

  it('passes replyTo and a custom from through to the transport', async () => {
    process.env.SMTP_USER = 'u@sepia.so'; process.env.SMTP_PASS = 'pw'
    await sendMail({ to: 'a@b.com', subject: 'Hi', html: 'x', text: 'x', replyTo: '"Ada" <ada@x.com>', from: '"Sepia Portfolio" <u@sepia.so>' })
    expect(sendMailInner).toHaveBeenCalledWith(expect.objectContaining({
      replyTo: '"Ada" <ada@x.com>',
      from: '"Sepia Portfolio" <u@sepia.so>',
    }))
  })

  it('omits replyTo when not provided', async () => {
    process.env.SMTP_USER = 'u@sepia.so'; process.env.SMTP_PASS = 'pw'
    await sendMail({ to: 'a@b.com', subject: 'Hi', html: 'x', text: 'x' })
    const arg = sendMailInner.mock.calls[0][0]
    expect(arg).not.toHaveProperty('replyTo')
  })

  it('swallows transport errors and returns sent:false', async () => {
    process.env.SMTP_USER = 'u@sepia.so'; process.env.SMTP_PASS = 'pw'
    sendMailInner.mockRejectedValueOnce(new Error('smtp down'))
    const out = await sendMail({ to: 'a@b.com', subject: 'Hi', html: 'x', text: 'x' })
    expect(out).toEqual({ sent: false })
  })
})

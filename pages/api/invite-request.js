import { withAuth } from '../../common/withAuth'
import { sendMail } from '../../common/email/mailer'

// Invite requests go to the platform operator, not a tenant — resolve the
// recipient server-side from SEPIA_ADMIN_EMAILS so the client can't pick one.
function operatorEmail() {
  const first = (process.env.SEPIA_ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)[0]
  return first || 'swami108@gmail.com'
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default withAuth(async (req, res, user) => {
  if (req.method !== 'POST') return res.status(405).end()

  const body = req.body || {}
  // Coerce + cap at the trust boundary: object payloads would otherwise become
  // "[object Object]" subjects, and uncapped fields make each request a
  // megabyte-sized email.
  const field = (v, max) => String(v ?? '').slice(0, max).trim()
  const name = field(body.name, 120)
  const photographyType = field(body.photographyType, 300)
  const whySepia = field(body.whySepia, 2000)
  const currentPortfolio = field(body.currentPortfolio, 300)
  if (!name || !photographyType || !whySepia) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(500).json({ error: 'Email sending is not configured' })
  }

  // Identity comes from the session, not the form — the form's name is just
  // what they'd like to be called.
  const rows = [
    ['Name', name],
    ['Account email', user.email],
    ['Photography', photographyType],
    ['Why Sepia', whySepia],
    ['Current site', currentPortfolio || '(none given)'],
  ]

  const { sent } = await sendMail({
    to: operatorEmail(),
    from: process.env.MAIL_FROM || 'Sepia <no-reply@sepia.photo>',
    // Object form, not a formatted string: nodemailer escapes the display name,
    // so a quote-laden "name" can't smuggle a second reply-to address in.
    replyTo: user.email ? { name, address: user.email } : undefined,
    subject: `Sepia invite request from ${name}`,
    text: rows.map(([k, v]) => `${k}: ${v}`).join('\n'),
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 560px; color: #1a1410; line-height: 1.6;">
        ${rows.map(([k, v]) => `<p style="margin: 0 0 8px;"><strong>${k}:</strong> ${esc(v)}</p>`).join('')}
      </div>
    `,
  })

  if (!sent) return res.status(500).json({ error: 'Failed to send request' })
  res.status(200).json({ ok: true })
})

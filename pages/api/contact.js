import { sendMail } from '../../common/email/mailer'

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { name, email, subject, message, toEmail } = req.body || {}

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
  if (!toEmail) {
    return res.status(400).json({ error: 'No recipient email configured for this site' })
  }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(500).json({ error: 'Email sending is not configured' })
  }

  const safeMessage = esc(message).replace(/\n/g, '<br>')

  // From must be a verified sending address (e.g. no-reply@sepia.photo), NOT
  // SMTP_USER — with providers like Resend that value is a literal ("resend"),
  // not an email. Reply-to is the visitor so the photographer can just reply.
  const { sent } = await sendMail({
    to: toEmail,
    from: process.env.MAIL_FROM || 'Sepia <no-reply@sepia.photo>',
    replyTo: `"${name}" <${email}>`,
    subject: subject
      ? `${subject}: message from ${name}`
      : `Message from ${name} via your portfolio`,
    text: `Name: ${name}\nEmail: ${email}${subject ? `\nSubject: ${subject}` : ''}\n\n${message}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 560px; color: #1a1410; line-height: 1.6;">
        <p style="margin: 0 0 8px;"><strong>Name:</strong> ${esc(name)}</p>
        <p style="margin: 0 0 8px;"><strong>Email:</strong> <a href="mailto:${esc(email)}" style="color: #8b6f47;">${esc(email)}</a></p>
        ${subject ? `<p style="margin: 0 0 16px;"><strong>Subject:</strong> ${esc(subject)}</p>` : '<p style="margin-bottom: 16px;"></p>'}
        <hr style="border: none; border-top: 1px solid #e0d8cc; margin: 0 0 16px;">
        <p style="margin: 0; white-space: pre-wrap;">${safeMessage}</p>
      </div>
    `,
  })

  if (!sent) {
    return res.status(500).json({ error: 'Failed to send message' })
  }
  res.status(200).json({ ok: true })
}

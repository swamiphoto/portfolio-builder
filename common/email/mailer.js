// Best-effort transactional email. No-ops (never throws) when SMTP is
// unconfigured or the transport fails — email must not break fulfillment.
import nodemailer from 'nodemailer'

export async function sendMail({ to, subject, html, text, replyTo, from }) {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass) {
    console.warn('sendMail skipped: SMTP not configured')
    return { sent: false }
  }
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass },
    })
    await transport.sendMail({
      from: from || process.env.MAIL_FROM || `"Sepia" <${user}>`,
      to,
      subject,
      text,
      html,
      ...(replyTo ? { replyTo } : {}),
    })
    return { sent: true }
  } catch (err) {
    console.error('sendMail failed', err.message)
    return { sent: false }
  }
}

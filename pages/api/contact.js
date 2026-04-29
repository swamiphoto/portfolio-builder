import nodemailer from 'nodemailer'

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

  try {
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    const safeMessage = message
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')

    await transporter.sendMail({
      from: `"Sepia Portfolio" <${process.env.SMTP_USER}>`,
      replyTo: `"${name}" <${email}>`,
      to: toEmail,
      subject: subject
        ? `${subject} — message from ${name}`
        : `Message from ${name} via your portfolio`,
      text: `Name: ${name}\nEmail: ${email}${subject ? `\nSubject: ${subject}` : ''}\n\n${message}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 560px; color: #1a1410; line-height: 1.6;">
          <p style="margin: 0 0 8px;"><strong>Name:</strong> ${name}</p>
          <p style="margin: 0 0 8px;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #8b6f47;">${email}</a></p>
          ${subject ? `<p style="margin: 0 0 16px;"><strong>Subject:</strong> ${subject}</p>` : '<p style="margin-bottom: 16px;"></p>'}
          <hr style="border: none; border-top: 1px solid #e0d8cc; margin: 0 0 16px;">
          <p style="margin: 0; white-space: pre-wrap;">${safeMessage}</p>
        </div>
      `,
    })

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[contact] send error:', err)
    res.status(500).json({ error: 'Failed to send message' })
  }
}

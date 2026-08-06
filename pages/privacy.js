import LegalDoc from '../components/legal/LegalDoc'

export default function Privacy() {
  return (
    <LegalDoc title="Privacy Policy" lastUpdated="August 6, 2026">
      <p>
        This Privacy Policy explains how Sepia (&ldquo;Sepia,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) collects, uses, and
        shares information when you use our portfolio platform at sepia.photo and the sites we host for photographers
        (the &ldquo;Service&rdquo;). By using the Service, you agree to this policy.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li><strong>Account information.</strong> When you sign in with Google, we receive your name, email address, and profile image to create and identify your account.</li>
        <li><strong>Content you upload.</strong> Photographs, captions, page text, site settings, and any images you import from a URL you provide.</li>
        <li><strong>Order information.</strong> If you or a visitor buys a print, we process the buyer&rsquo;s name, email, shipping address, and order details. Card payments are handled by Stripe; we never receive full card numbers.</li>
        <li><strong>Usage data.</strong> Basic logs (IP address, browser, pages requested) needed to operate and secure the Service.</li>
        <li><strong>Analytics you enable.</strong> If a photographer adds their own Google Analytics or Plausible identifier, that provider collects visitor data on their site under the photographer&rsquo;s control.</li>
      </ul>

      <h2>How we use information</h2>
      <ul>
        <li>To provide, maintain, and improve the Service and host your published site.</li>
        <li>To process print orders, route payouts to photographers, and arrange printing and shipping.</li>
        <li>To send transactional email (order confirmations, shipping updates, and account or security notices).</li>
        <li>To detect, prevent, and respond to fraud, abuse, and security issues.</li>
      </ul>

      <h2>How we share information</h2>
      <p>We do not sell your personal information. We share it only with service providers that help us run the Service:</p>
      <ul>
        <li><strong>Stripe</strong> — payment processing and photographer payouts (Stripe Connect).</li>
        <li><strong>Prodigi</strong> — print production and fulfillment (receives the buyer&rsquo;s shipping details for the order).</li>
        <li><strong>Google</strong> — authentication (sign-in).</li>
        <li><strong>Cloudflare</strong> — image storage and delivery.</li>
        <li><strong>Vercel</strong> — application hosting.</li>
        <li><strong>Our email provider</strong> — delivery of transactional email.</li>
      </ul>
      <p>We may also disclose information if required by law or to protect the rights, property, or safety of Sepia, our users, or the public.</p>

      <h2>Cookies</h2>
      <p>
        We use cookies that are necessary to keep you signed in and to operate the Service. Individual photographer sites may
        load analytics the photographer has configured; those are governed by the respective analytics provider&rsquo;s policy.
      </p>

      <h2>Data retention</h2>
      <p>
        We keep your account and content for as long as your account is active. Order records are retained as needed to fulfill
        the order and to meet legal, tax, and accounting obligations. You may request deletion of your account and content as
        described below.
      </p>

      <h2>Security</h2>
      <p>
        We use industry-standard measures to protect your information, including encrypted connections and access controls. No
        method of transmission or storage is completely secure, so we cannot guarantee absolute security.
      </p>

      <h2>Your rights</h2>
      <p>
        You may access, correct, export, or delete your personal information by contacting us. Depending on where you live, you
        may have additional rights under applicable privacy laws (such as GDPR or CCPA). We will honor these requests as required
        by law.
      </p>

      <h2>Children</h2>
      <p>The Service is not directed to children under 13, and we do not knowingly collect their personal information.</p>

      <h2>International users</h2>
      <p>We operate from the United States. If you use the Service from elsewhere, you consent to processing your information in the United States.</p>

      <h2>Changes to this policy</h2>
      <p>We may update this policy from time to time. We will post the new version here and update the &ldquo;Last updated&rdquo; date above.</p>

      <h2>Contact</h2>
      <p>Questions about privacy? Email <a href="mailto:swami@swamiphoto.com">swami@swamiphoto.com</a>.</p>
    </LegalDoc>
  )
}

import LegalDoc from '../components/legal/LegalDoc'

export default function Terms() {
  return (
    <LegalDoc title="Terms of Service" lastUpdated="August 6, 2026">
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your use of Sepia (&ldquo;Sepia,&rdquo; &ldquo;we,&rdquo;
        &ldquo;us&rdquo;), the portfolio platform at sepia.photo and the sites we host on your behalf (the &ldquo;Service&rdquo;).
        By creating an account or using the Service, you agree to these Terms.
      </p>

      <h2>The service</h2>
      <p>
        Sepia lets photographers build and publish a portfolio site and, optionally, sell prints. We may add, change, or remove
        features over time.
      </p>

      <h2>Your account</h2>
      <p>
        You are responsible for your account and for keeping your login secure. You must provide accurate information and be at
        least 18 years old (or the age of majority where you live) to sell prints.
      </p>

      <h2>Your content</h2>
      <p>
        You retain all ownership of the photographs and content you upload. You grant Sepia a limited, non-exclusive license to
        host, store, reproduce, and display that content solely to operate the Service and publish your site. You represent that
        you own or have the rights to everything you upload, including anything you import from a URL, and that it does not
        infringe others&rsquo; rights or violate the law.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to use the Service to:</p>
      <ul>
        <li>post unlawful, infringing, or harmful content;</li>
        <li>import or upload content you don&rsquo;t have the right to use;</li>
        <li>attempt to disrupt, reverse engineer, or gain unauthorized access to the Service; or</li>
        <li>use the Service to send spam or engage in fraud.</li>
      </ul>

      <h2>Print sales and payments</h2>
      <p>
        If you enable the print store, payments are processed through <strong>Stripe Connect</strong>, and you (the photographer)
        are the seller of record for your prints. You must connect a Stripe account and comply with Stripe&rsquo;s terms.
        Prints are produced and shipped by our fulfillment partner, <strong>Prodigi</strong>. You set your markup; buyer prices,
        print costs, shipping, and any applicable taxes are calculated at checkout.
      </p>
      <p>
        Sepia charges a platform commission on each sale, disclosed in the app at the time you configure your store. The
        remaining proceeds, after print cost, payment processing, and commission, are paid out to your connected account by
        Stripe.
      </p>

      <h2>Refunds and returns</h2>
      <p>
        Prints are made to order. If an order arrives damaged, defective, or incorrect, contact us and we will arrange a
        reprint or refund consistent with our fulfillment partner&rsquo;s policy. Buyers should direct order issues to the
        photographer they purchased from, or to <a href="mailto:swami@swamiphoto.com">swami@swamiphoto.com</a>.
      </p>

      <h2>Termination</h2>
      <p>
        You may stop using the Service and delete your account at any time. We may suspend or terminate accounts that violate
        these Terms or that we reasonably believe create risk or legal exposure. On termination, your published site and content
        may be removed.
      </p>

      <h2>Disclaimers</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranties of any kind, whether
        express or implied, to the fullest extent permitted by law. We do not warrant that the Service will be uninterrupted or
        error-free.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, Sepia will not be liable for any indirect, incidental, special, consequential,
        or punitive damages, or for any loss of profits, data, or goodwill. Our total liability for any claim relating to the
        Service will not exceed the greater of the amounts you paid us in the 12 months before the claim or US $100.
      </p>

      <h2>Indemnification</h2>
      <p>
        You agree to indemnify and hold Sepia harmless from claims arising out of your content, your use of the Service, or your
        violation of these Terms or the rights of others.
      </p>

      <h2>Changes to these terms</h2>
      <p>We may update these Terms from time to time. Continued use of the Service after changes take effect means you accept the updated Terms.</p>

      <h2>Governing law</h2>
      <p>These Terms are governed by the laws of the State of California, without regard to its conflict-of-laws rules.</p>

      <h2>Contact</h2>
      <p>Questions about these Terms? Email <a href="mailto:swami@swamiphoto.com">swami@swamiphoto.com</a>.</p>
    </LegalDoc>
  )
}

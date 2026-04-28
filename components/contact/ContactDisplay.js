export default function ContactDisplay({ heading, subheading, contact }) {
  if (!contact) return null;
  const { email, instagram, facebook, twitter, tiktok, youtube, website } = contact;
  const hasSocial = !!(instagram || facebook || twitter || tiktok || youtube || website);
  if (!email && !hasSocial && !heading && !subheading) return null;

  const socialLink = (href, label, svgPath) => href ? (
    <a key={label} href={href.startsWith('http') ? href : `https://${href.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" aria-label={label} className="text-stone-600 hover:text-stone-900 transition-colors">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">{svgPath}</svg>
    </a>
  ) : null;

  return (
    <div className="contact-block max-w-2xl mx-auto px-8 py-16 text-center">
      {heading ? <h2 className="text-3xl md:text-4xl font-light text-stone-800 mb-4">{heading}</h2> : null}
      {subheading ? <p className="text-base md:text-lg text-stone-600 mb-8 leading-relaxed">{subheading}</p> : null}
      {email ? (
        <p className="mb-6">
          <a href={`mailto:${email}`} className="text-stone-800 underline underline-offset-4 decoration-stone-300 hover:decoration-stone-700 transition-colors">{email}</a>
        </p>
      ) : null}
      {hasSocial ? (
        <div className="flex justify-center gap-5">
          {socialLink(instagram, 'Instagram', <><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/></>)}
          {socialLink(facebook, 'Facebook', <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>)}
          {socialLink(twitter, 'Twitter', <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>)}
          {socialLink(tiktok, 'TikTok', <path d="M9 12a4 4 0 104 4V4a5 5 0 005 5"/>)}
          {socialLink(youtube, 'YouTube', <><path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></>)}
          {socialLink(website, 'Website', <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></>)}
        </div>
      ) : null}
    </div>
  );
}

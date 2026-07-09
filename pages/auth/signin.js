// pages/auth/signin.js
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { signIn } from 'next-auth/react'

// Google is the only provider, so there's nothing to choose here. This page
// bounces straight to Google OAuth on load and only renders a visible UI in the
// rare case NextAuth sends back an ?error (so we don't loop on a failed sign-in).
export default function SignIn() {
  const router = useRouter()
  const started = useRef(false)
  const error = typeof router.query.error === 'string' ? router.query.error : null
  const callbackUrl =
    typeof router.query.callbackUrl === 'string' ? router.query.callbackUrl : '/auth/post-login'

  useEffect(() => {
    if (!router.isReady || error || started.current) return
    started.current = true
    signIn('google', { callbackUrl })
  }, [router.isReady, error, callbackUrl])

  return (
    <div
      className="flex flex-col items-center justify-center h-screen font-sans"
      style={{ background: 'var(--desk, #e8e2d9)' }}
    >
      {error ? (
        <div className="flex flex-col items-center text-center" style={{ maxWidth: 340, padding: 24 }}>
          <h1 className="font-fraunces" style={{ fontSize: 22, color: '#2c2416', marginBottom: 8 }}>
            We couldn&rsquo;t sign you in
          </h1>
          <p style={{ fontSize: 14, color: '#7a6b55', marginBottom: 20, lineHeight: 1.5 }}>
            Something went wrong with Google sign-in. Please try again.
          </p>
          <button
            onClick={() => signIn('google', { callbackUrl })}
            style={{
              background: '#2c2416',
              color: '#f5ecd6',
              fontSize: 13,
              fontWeight: 500,
              padding: '10px 20px',
              borderRadius: 4,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Continue with Google
          </button>
        </div>
      ) : (
        <p
          style={{
            fontFamily: '"SF Mono", Menlo, Monaco, Consolas, monospace',
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#a8967a',
          }}
        >
          Signing you in&hellip;
        </p>
      )}
    </div>
  )
}

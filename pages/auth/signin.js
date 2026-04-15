// pages/auth/signin.js
import { signIn } from 'next-auth/react'

export default function SignIn() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: 32 }}>PhotoHub</h1>
      <button
        onClick={() => signIn('google', { callbackUrl: '/admin' })}
        style={{ padding: '12px 24px', fontSize: 16, cursor: 'pointer', background: '#000', color: '#fff', border: 'none', borderRadius: 6 }}
      >
        Sign in with Google
      </button>
    </div>
  )
}

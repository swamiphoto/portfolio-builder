// pages/auth/signin.js
import { signIn } from 'next-auth/react'

export default function SignIn() {
  return (
    <div className="flex flex-col items-center justify-center h-screen font-sans bg-white">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">PhotoHub</h1>
      <button
        onClick={() => signIn('google', { callbackUrl: '/auth/post-login' })}
        className="px-6 py-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
      >
        Sign in with Google
      </button>
    </div>
  )
}

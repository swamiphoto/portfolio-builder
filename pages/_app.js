// pages/_app.js
import { SessionProvider } from 'next-auth/react'
import { Cormorant_Garamond } from 'next/font/google'
import '../styles/globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
})

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <div className={cormorant.variable}>
        <Component {...pageProps} />
      </div>
    </SessionProvider>
  )
}

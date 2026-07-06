// pages/print/confirmation.js
import Head from 'next/head'

export default function PrintConfirmation() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4efe8', padding: 24 }}>
      <Head><title>Order confirmed</title></Head>
      <div style={{ maxWidth: 460, textAlign: 'center' }}>
        <p style={{ fontFamily: '"Fraunces", Georgia, serif', textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: 12, color: '#a8967a' }}>Order confirmed</p>
        <h1 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 34, color: '#2c2416', margin: '10px 0 14px' }}>Thank you — your print is on its way.</h1>
        <p style={{ color: '#5c4f3a', lineHeight: 1.6 }}>We emailed your receipt. Your print will be produced and shipped to the address you provided, and you'll get a tracking email when it ships.</p>
      </div>
    </div>
  )
}

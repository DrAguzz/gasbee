/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

const LOGO = 'https://dkxjykxvljppdiaekvwk.supabase.co/storage/v1/object/public/email-assets/gasbee-logo.png'

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Gasbee verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO} alt="Gasbee" style={logo} />
        <Text style={tagline}>BE READY · BEE DELIVERS</Text>
        <Heading style={h1}>Confirm it's you</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code expires shortly. If you didn't request it, you can safely
          ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', margin: 0, padding: '40px 16px' }
const container = { padding: '36px 32px', maxWidth: '480px', margin: '0 auto', backgroundColor: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '14px' }
const logo = { display: 'block', margin: '0 auto 12px', height: '44px' }
const tagline = { fontSize: '11px', color: '#f59e0b', textAlign: 'center' as const, fontWeight: '700' as const, letterSpacing: '2px', margin: '0 0 18px' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#0f172a', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 16px', textAlign: 'center' as const }
const codeStyle = { fontSize: '32px', fontWeight: '700' as const, letterSpacing: '8px', textAlign: 'center' as const, color: '#0f172a', backgroundColor: '#fef3c7', padding: '18px', borderRadius: '10px', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '24px 0 0', textAlign: 'center' as const }

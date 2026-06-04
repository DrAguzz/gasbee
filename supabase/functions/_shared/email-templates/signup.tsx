/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

const LOGO = 'https://dkxjykxvljppdiaekvwk.supabase.co/storage/v1/object/public/email-assets/gasbee-logo.png'

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email to start using {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO} alt={siteName} style={logo} />
        <Text style={tagline}>BE READY · BEE DELIVERS</Text>
        <Heading style={h1}>Confirm your email</Heading>
        <Text style={text}>
          Welcome to{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          ! Please confirm <strong>{recipient}</strong> to activate your account
          and start ordering LPG with a tap.
        </Text>
        <Section style={buttonWrap}>
          <Button style={button} href={confirmationUrl}>
            Confirm email
          </Button>
        </Section>
        <Text style={footer}>
          If you didn't sign up for Gasbee, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', margin: 0, padding: '40px 16px' }
const container = { padding: '36px 32px', maxWidth: '480px', margin: '0 auto', backgroundColor: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '14px' }
const logo = { display: 'block', margin: '0 auto 12px', height: '44px' }
const tagline = { fontSize: '11px', color: '#f59e0b', textAlign: 'center' as const, fontWeight: '700' as const, letterSpacing: '2px', margin: '0 0 18px' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#0f172a', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 16px' }
const link = { color: '#b45309', textDecoration: 'underline' }
const buttonWrap = { textAlign: 'center' as const, margin: '28px 0' }
const button = { backgroundColor: '#f59e0b', color: '#0f172a', fontSize: '15px', fontWeight: '600' as const, borderRadius: '10px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '24px 0 0', textAlign: 'center' as const }

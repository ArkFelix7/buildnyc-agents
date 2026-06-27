import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Section,
  Hr,
} from '@react-email/components';
import { ROLE_LABELS, type Role } from '@/lib/types';

export interface MatchIntroEmailProps {
  recipientName: string;
  matchName: string;
  matchRole: Role | null;
  matchBio: string | null;
  matchLookingFor: string | null;
  matchCode?: string | null;
  eventName?: string;
}

const styles = {
  body: {
    backgroundColor: '#0b0b12',
    color: '#e7e7ef',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    margin: 0,
    padding: '24px 0',
  } as React.CSSProperties,
  container: {
    backgroundColor: '#14141f',
    border: '1px solid #26263a',
    borderRadius: '16px',
    maxWidth: '480px',
    margin: '0 auto',
    padding: '32px',
  } as React.CSSProperties,
  heading: {
    color: '#ff5c8a',
    fontSize: '24px',
    fontWeight: 700,
    margin: '0 0 16px',
    lineHeight: '1.25',
  } as React.CSSProperties,
  text: {
    color: '#cfcfe0',
    fontSize: '15px',
    lineHeight: '1.6',
    margin: '0 0 14px',
  } as React.CSSProperties,
  card: {
    backgroundColor: '#1c1c2b',
    border: '1px solid #2e2e46',
    borderRadius: '12px',
    padding: '18px 20px',
    margin: '8px 0 18px',
  } as React.CSSProperties,
  matchName: {
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: 700,
    margin: '0 0 2px',
  } as React.CSSProperties,
  role: {
    color: '#ff8fb0',
    fontSize: '13px',
    fontWeight: 600,
    margin: '0 0 12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  } as React.CSSProperties,
  label: {
    color: '#8a8aa3',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    margin: '0 0 2px',
  } as React.CSSProperties,
  fieldText: {
    color: '#dcdce8',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: '0 0 12px',
  } as React.CSSProperties,
  callout: {
    color: '#22d39a',
    fontSize: '16px',
    fontWeight: 700,
    margin: '4px 0 16px',
  } as React.CSSProperties,
  codeBox: {
    backgroundColor: '#0f1f1a',
    border: '1px solid #22d39a',
    borderRadius: '12px',
    padding: '16px 20px',
    margin: '4px 0 18px',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  codeLabel: {
    color: '#7fe6c4',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    margin: '0 0 6px',
  } as React.CSSProperties,
  code: {
    color: '#22d39a',
    fontSize: '26px',
    fontWeight: 800,
    letterSpacing: '0.06em',
    fontFamily: "'SF Mono', ui-monospace, Menlo, monospace",
    margin: 0,
  } as React.CSSProperties,
  hr: {
    borderColor: '#26263a',
    margin: '20px 0 16px',
  } as React.CSSProperties,
  footer: {
    color: '#8a8aa3',
    fontSize: '13px',
    margin: 0,
  } as React.CSSProperties,
};

export function MatchIntroEmail({
  recipientName,
  matchName,
  matchRole,
  matchBio,
  matchLookingFor,
  matchCode,
  eventName = 'Orbit',
}: MatchIntroEmailProps) {
  const roleLabel = matchRole ? ROLE_LABELS[matchRole] : null;
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>You matched with {matchName} 🤝</Heading>

          <Text style={styles.text}>Hi {recipientName},</Text>
          <Text style={styles.text}>
            Great news — you and {matchName} both liked each other at {eventName}.
            Here&apos;s who you matched with:
          </Text>

          <Section style={styles.card}>
            <Text style={styles.matchName}>{matchName}</Text>
            {roleLabel ? <Text style={styles.role}>{roleLabel}</Text> : null}

            {matchBio ? (
              <>
                <Text style={styles.label}>About</Text>
                <Text style={styles.fieldText}>{matchBio}</Text>
              </>
            ) : null}

            {matchLookingFor ? (
              <>
                <Text style={styles.label}>Looking for</Text>
                <Text style={styles.fieldText}>{matchLookingFor}</Text>
              </>
            ) : null}
          </Section>

          <Text style={styles.callout}>You both liked each other. Go find them!</Text>

          {matchCode ? (
            <Section style={styles.codeBox}>
              <Text style={styles.codeLabel}>Your shared match code</Text>
              <Text style={styles.code}>{matchCode}</Text>
            </Section>
          ) : null}

          <Text style={styles.text}>
            {matchCode
              ? `Find ${matchName} at the event and say your code to confirm it's really you two.`
              : `Just reply to this email to connect — we'll make sure it reaches ${matchName}.`}
          </Text>

          <Hr style={styles.hr} />
          <Text style={styles.footer}>— {eventName} · powered by Orbit</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default MatchIntroEmail;

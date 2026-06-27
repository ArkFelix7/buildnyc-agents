import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Section,
  Link,
  Hr,
} from '@react-email/components';

export interface OrganizerEscalationEmailProps {
  question: string;
  replyUrl?: string;
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
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: 700,
    margin: '0 0 16px',
    lineHeight: '1.3',
  } as React.CSSProperties,
  text: {
    color: '#cfcfe0',
    fontSize: '15px',
    lineHeight: '1.6',
    margin: '0 0 14px',
  } as React.CSSProperties,
  questionCard: {
    backgroundColor: '#1c1c2b',
    borderLeft: '3px solid #ff5c8a',
    borderRadius: '8px',
    padding: '16px 18px',
    margin: '8px 0 18px',
  } as React.CSSProperties,
  questionText: {
    color: '#ffffff',
    fontSize: '16px',
    fontStyle: 'italic' as const,
    lineHeight: '1.5',
    margin: 0,
  } as React.CSSProperties,
  callout: {
    color: '#22d39a',
    fontSize: '14px',
    fontWeight: 600,
    margin: '0 0 14px',
  } as React.CSSProperties,
  link: {
    color: '#7c8cff',
    fontSize: '13px',
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

export function OrganizerEscalationEmail({
  question,
  replyUrl,
}: OrganizerEscalationEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>❓ Attendee question needs your answer</Heading>

          <Text style={styles.text}>An attendee asked something the concierge couldn&apos;t answer:</Text>

          <Section style={styles.questionCard}>
            <Text style={styles.questionText}>{question}</Text>
          </Section>

          <Text style={styles.callout}>
            Reply to this email with the answer and we&apos;ll post it back automatically.
          </Text>

          {replyUrl ? (
            <Text style={styles.text}>
              Or answer here:{' '}
              <Link href={replyUrl} style={styles.link}>
                {replyUrl}
              </Link>
            </Text>
          ) : null}

          <Hr style={styles.hr} />
          <Text style={styles.footer}>— BuildNYC Agents</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default OrganizerEscalationEmail;

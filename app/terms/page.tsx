import Link from 'next/link';

export const metadata = {
  title: 'RedInk — Terms of Use',
  description: 'Terms and disclaimers for the RedInk research tool.',
};

export default function Terms() {
  return (
    <main style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at center, #fdfcfa 0%, #f5f0eb 100%)',
      padding: '48px 24px 80px',
    }}>
      <div style={{
        maxWidth: 720,
        margin: '0 auto',
        background: '#fff',
        border: '1px solid #EAE4DD',
        borderRadius: 14,
        padding: '40px 44px',
        boxShadow: '0 1px 3px rgba(26, 24, 22, 0.04), 0 8px 24px rgba(26, 24, 22, 0.06)',
      }}>
        <Link href="/" style={{ fontSize: 12, color: '#C04830', textDecoration: 'none', fontWeight: 500 }}>
          ← Back to home
        </Link>

        <h1 style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: 32,
          fontWeight: 700,
          color: '#1A1816',
          margin: '18px 0 6px',
          letterSpacing: '-0.01em',
        }}>Terms of Use</h1>
        <div style={{ fontSize: 12, color: '#8F8880', marginBottom: 32 }}>
          Last updated: April 2026
        </div>

        <Section title="What RedInk is">
          RedInk is a personal research and learning project. It applies statistical anomaly
          detection to public SEC filings from constituents of the Nasdaq-100 (QQQ) index and
          surfaces quarters where a company&apos;s financial metrics diverged sharply from its own
          historical baseline and its peer group. Every flag links directly to the underlying
          filing on SEC EDGAR so users can verify the evidence themselves.
        </Section>

        <Section title="Not investment advice">
          Nothing on this site is investment, financial, tax, legal, or accounting advice. The
          anomaly flags, scores, drivers, and written explanations are provided for research and
          educational purposes only. They are not recommendations to buy, sell, hold, or take any
          other action with respect to any security. Always consult a licensed professional before
          making investment decisions.
        </Section>

        <Section title="No warranty">
          The service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind,
          express or implied. We do not warrant that the data, scores, or explanations are
          accurate, complete, current, or free from error. Data pipelines and scoring models can
          have bugs and blind spots. The user is responsible for independently verifying anything
          they act on.
        </Section>

        <Section title="Limitation of liability">
          To the fullest extent permitted by law, the operators of RedInk are not liable for any
          direct, indirect, incidental, consequential, or special damages arising out of or in
          connection with the use of, or inability to use, this site — including but not limited
          to trading losses, missed opportunities, or reliance on any information shown here.
        </Section>

        <Section title="Data sources and attribution">
          Filing data is sourced from the U.S. Securities and Exchange Commission&apos;s EDGAR system,
          which is a public-domain government resource. RedInk is not affiliated with, endorsed
          by, or sponsored by the SEC, Nasdaq, Invesco (the issuer of QQQ), or any company whose
          filings are shown. All company names, tickers, and trademarks are the property of their
          respective owners and are used here solely for factual identification.
        </Section>

        <Section title="Privacy">
          If you sign in, we store your Google display name, email address, and avatar URL in
          order to attribute the review comments you submit. Product analytics (anonymous event
          names and properties like anomaly ticker and score) are sent to PostHog. We do not
          sell your data and do not use it for anything beyond operating this tool.
        </Section>

        <Section title="Acceptable use">
          You agree not to use this site to (a) defame, harass, or make unsubstantiated
          accusations against any company, (b) present the output as professional investment
          advice, (c) repackage the data for resale, or (d) attempt to interfere with the
          service&apos;s operation.
        </Section>

        <Section title="Changes">
          These terms may be updated without notice. Continued use of the site after an update
          constitutes acceptance of the revised terms.
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2 style={{
        fontSize: 14,
        fontWeight: 600,
        color: '#1A1816',
        margin: '0 0 8px',
        letterSpacing: '-0.005em',
      }}>{title}</h2>
      <p style={{
        fontSize: 13,
        lineHeight: 1.65,
        color: '#4B4540',
        margin: 0,
      }}>{children}</p>
    </section>
  );
}

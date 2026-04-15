import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], weight: ['400','500','600','700'] });

export const metadata: Metadata = {
  title: 'RedInk — Financial Anomaly Detection',
  description: 'AI-powered SEC filing anomaly flags for equity analysts.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-gray-900 antialiased`} style={{ height: '100%', overflow: 'hidden' }}>{children}</body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Basenji vs Bears - Base Mini App',
  description: 'Survive the bear apocalypse! 🐻 A Base Mini App game with global leaderboards. Save your high scores on-chain!',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Basenji vs Bears 🧪',
    description: 'Survive the bear apocalypse! Compete for the top spot on the global leaderboard.',
    type: 'website',
    url: 'https://basenji-bears.vercel.app',
    images: [
      {
        url: 'https://basenji-bears.vercel.app/og.png',
        width: 1200,
        height: 630,
        alt: 'Basenji vs Bears - Base Mini App Game',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Basenji vs Bears 🧪',
    description: 'Survive the bear apocalypse! Compete for the top spot on the global leaderboard.',
    images: ['https://basenji-bears.vercel.app/og.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="base:app_id" content="699e9d4fdd7b569305bb09d6" />
        <meta name="fc:miniapp" content='{ "version":"next", "imageUrl":"https://basenji-bears.vercel.app/og.png", "button":{ "title":"Play Now", "action":{ "type":"launch_miniapp", "name":"Basenji vs Bears", "url":"https://basenji-bears.vercel.app" } } }' />
        <meta name="theme-color" content="#1e1b4b" />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

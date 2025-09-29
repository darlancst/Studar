import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Studar - Plataforma de Estudos',
  description: 'Organize e potencialize seus estudos com a técnica Pomodoro e revisão espaçada',
  manifest: '/manifest.json',
  themeColor: '#3b82f6',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Studar',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Studar',
    title: 'Studar - Plataforma de Estudos',
    description: 'Organize e potencialize seus estudos com a técnica Pomodoro e revisão espaçada',
  },
  twitter: {
    card: 'summary',
    title: 'Studar - Plataforma de Estudos',
    description: 'Organize e potencialize seus estudos com a técnica Pomodoro e revisão espaçada',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="application-name" content="Studar" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Studar" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#3b82f6" />

        <link rel="apple-touch-icon" href="/icons/touch-icon-iphone.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/touch-icon-ipad.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/touch-icon-iphone-retina.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/touch-icon-ipad-retina.png" />

        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="shortcut icon" href="/favicon.ico" />

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:url" content="https://studar.app" />
        <meta name="twitter:title" content="Studar" />
        <meta name="twitter:description" content="Organize e potencialize seus estudos com a técnica Pomodoro e revisão espaçada" />
        <meta name="twitter:image" content="https://studar.app/icons/android-chrome-192x192.png" />
        <meta name="twitter:creator" content="@studar" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Studar" />
        <meta property="og:description" content="Organize e potencialize seus estudos com a técnica Pomodoro e revisão espaçada" />
        <meta property="og:site_name" content="Studar" />
        <meta property="og:url" content="https://studar.app" />
        <meta property="og:image" content="https://studar.app/icons/apple-touch-icon.png" />
      </head>
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:text-gray-100">
          {children}
        </div>
      </body>
    </html>
  );
} 
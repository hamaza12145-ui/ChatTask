import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TaskCom - Communication & Task Management Platform',
  description: 'Enterprise WhatsApp-style team communication and task management platform',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    shortcut: '/favicon.svg',
    apple: '/icon.svg',
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
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#10b981" />
      </head>
      <body className="antialiased bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}

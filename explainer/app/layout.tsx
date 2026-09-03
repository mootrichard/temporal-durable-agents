import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SiteHeader } from '../components/site-header';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Durable agent repair · interview walkthrough',
    template: '%s · Durable agent repair',
  },
  description:
    'An interview walkthrough of process-owned orchestration and Temporal recovery.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}

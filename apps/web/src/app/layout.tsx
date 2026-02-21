import type { Metadata } from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vibe Store Intelligence | Expansion Reports',
  description:
    'Generate conversion-focused commercial pre-feasibility reports before opening your next location.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

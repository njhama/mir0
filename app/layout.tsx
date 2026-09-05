import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Whiteboard', description: 'A simple, spacious whiteboard with smooth panning and zooming.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

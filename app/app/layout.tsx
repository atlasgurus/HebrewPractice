import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata: Metadata = {
  title: 'Hebrew Practice',
  description: 'Practice Hebrew verb conjugation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-gray-900">
        <header className="h-[60px] flex-shrink-0 border-b border-gray-200 flex items-center px-6 gap-6">
          <Link href="/" className="font-bold text-lg tracking-tight text-gray-900 hover:text-blue-600">
            Hebrew Practice
          </Link>
          <nav className="flex gap-4 ml-auto text-sm text-gray-500">
            <Link href="/lessons" className="hover:text-gray-900">Lessons</Link>
          </nav>
        </header>
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}

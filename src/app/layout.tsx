import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Providers from '@/app/providers';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNavbar } from '@/components/layout/MobileNavbar';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Marcela | Finance',
  description: 'Control unificado de finanzas personales, servicios locales (Rosario, Santa Fe) y contratos de alquiler.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      style={{ colorScheme: 'dark' }}
    >
      <body className="min-h-full flex bg-zinc-950 text-zinc-50 font-sans">
        <Providers>
          {/* Left Sidebar for Desktop */}
          <Sidebar />

          {/* Main Content Container */}
          <div className="flex-1 flex flex-col md:pl-64 min-h-screen pb-20 md:pb-0">
            {/* Main Content */}
            <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
              {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-zinc-900 bg-zinc-950 py-6 text-center text-xs text-zinc-600">
              <p>© {new Date().getFullYear()} Marcela | Finance. Todos los derechos reservados.</p>
            </footer>
          </div>

          {/* Bottom Nav Bar for Mobile */}
          <MobileNavbar />
        </Providers>
      </body>
    </html>
  );
}


import type { Metadata } from 'next';
import { Outfit, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'INDOR Desk - Sistema de Gestão',
  description: 'Sistema de gestão para clínica de avaliação infantil - Instituto Dra. Olzeni Ribeiro',
  icons: {
    icon: 'https://sprmtggtqctxusgsamxp.supabase.co/storage/v1/object/public/publico/favico-removebg-preview.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${outfit.variable} ${plusJakarta.variable}`}>
      <body className="font-sans">
        {children}
      </body>
    </html>
  );
}

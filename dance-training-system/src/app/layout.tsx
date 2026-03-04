import './globals.css'
import { Cinzel, Jost } from 'next/font/google'

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '700'],
})

const jost = Jost({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600'],
})

export const metadata = {
  title: 'BitDance',
  description: 'AI-powered dance trainer with pose guidance and avatar feedback',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${cinzel.variable} ${jost.variable} artdeco-bg text-zinc-100`}>{children}</body>
    </html>
  )
}

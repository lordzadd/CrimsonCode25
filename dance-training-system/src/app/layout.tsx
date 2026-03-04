import './globals.css'

export const metadata = {
  title: 'BitDance',
  description: 'AI-powered dance trainer with pose guidance and avatar feedback',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-zinc-100">{children}</body>
    </html>
  )
}

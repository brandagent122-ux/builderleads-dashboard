import './globals.css'
import AuthGuard from '@/components/AuthGuard'

export const metadata = {
  title: 'BuilderLeads | Palisades Fire Intel',
  description: 'Permit intelligence for Palisades fire rebuild',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  )
}
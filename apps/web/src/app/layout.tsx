import "./globals.css"
import type { Metadata } from "next"
import { Providers } from "@/components/providers"

export const metadata: Metadata = {
  title: "Cognita — AI Learning & Assessment Platform",
  description:
    "Cognita turns your documents into tutors, study aids, and intelligent assessments. Learn faster, teach smarter — powered by AI.",
}

// Inline script runs before React hydrates — prevents flash of wrong theme.
const themeScript = `(function(){
  try {
    var t = localStorage.getItem('cognita-theme') || 'dark';
    if (t === 'light') document.documentElement.classList.add('light');
  } catch(e) {}
})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

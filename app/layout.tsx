import type { Metadata, Viewport } from "next"
import { Geist_Mono, Outfit } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { BottomNav, Header } from "@/components/nav"
import { themeScript } from "@/components/theme"
import { FeedbackPrompt } from "@/components/feedback-prompt"
import { ChoiceNotifier } from "@/components/choice-notifier"

const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: { default: "Date Planner", template: "%s · Date Planner" },
  description: "Rencanakan, jalani, dan simpan kenangan setiap kencan.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fbf9f9",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${outfit.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Providers>
          <Header />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:px-6 md:pt-10 md:pb-16">
            {children}
          </main>
          <BottomNav />
          <FeedbackPrompt />
          <ChoiceNotifier />
        </Providers>
      </body>
    </html>
  )
}

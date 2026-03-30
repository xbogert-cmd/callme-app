import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BackgroundDecor from "@/components/BackgroundDecor";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CallMe — AI Reminder Calls",
  description: "Set reminders and get an AI phone call to check in on your tasks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <script
        dangerouslySetInnerHTML={{
          __html: `try { if (localStorage.getItem('callme_theme') === 'dark') { document.documentElement.classList.add('dark'); } } catch(e) {}`,
        }}
      />
      <body className="min-h-full flex flex-col">
        <BackgroundDecor />
        {children}
      </body>
    </html>
  );
}

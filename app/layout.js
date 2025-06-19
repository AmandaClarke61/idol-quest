import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LogoutButton from '../components/LogoutButton'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "SM练习生：星光之路",
  description: "一个练习生养成游戏",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-50`}
      >
        <LogoutButton />
        {children}
      </body>
    </html>
  );
}

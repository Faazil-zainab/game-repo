import type { Metadata } from "next";
import { Amatic_SC, Nunito } from "next/font/google";
import "./globals.css";

const amatic = Amatic_SC({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-amatic",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mohamed Faazil — AI & Full Stack Developer",
  description:
    "An interactive 3D portfolio by Mohamed Faazil: drive through projects, skills, experience and the AI Lab.",
  openGraph: {
    title: "Mohamed Faazil — AI & Full Stack Developer",
    description:
      "An interactive 3D portfolio by Mohamed Faazil: drive through projects, skills, experience and the AI Lab.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${amatic.variable} ${nunito.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}

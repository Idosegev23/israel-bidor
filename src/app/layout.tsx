import type { Metadata } from "next";
import { Heebo, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const heebo = Heebo({ 
  subsets: ["hebrew"],
  variable: "--font-hebrew" 
});

const plusJakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  variable: "--font-display" 
});

export const metadata: Metadata = {
  title: "Israel Bidur - העוזר החכם",
  description: "העוזר החכם שלך לעולם הבידור בישראל",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${plusJakarta.variable}`}>
      <body className="antialiased bg-zinc-50 dark:bg-zinc-950 min-h-screen">
        {children}
        <Toaster 
          position="bottom-center"
          toastOptions={{
            className: 'font-hebrew',
            duration: 3000,
          }}
        />
      </body>
    </html>
  );
}

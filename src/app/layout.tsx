import type { Metadata, Viewport } from "next";
import { Heebo, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const heebo = Heebo({ 
  subsets: ["hebrew"],
  variable: "--font-hebrew",
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  variable: "--font-display",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "ישראל בידור AI | העוזר החכם שלך",
  description: "הבוט החכם לכל מה שקורה אצל ישראל בידור - פוסטים, סרטונים והייליטס. שאל אותי כל דבר!",
};

// הגדרות תצוגה חשובות למובייל ולצבעי מערכת
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // קריטי: מונע זום אוטומטי בהקלדה במובייל
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${plusJakarta.variable}`}>
      <body className="antialiased bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 min-h-screen selection:bg-indigo-500/30 dark:selection:bg-indigo-400/30">
        {children}
        
        <Toaster 
          position="top-center" // שונה ללמעלה כדי לא להסתיר את תיבת הטקסט בצ'אט
          toastOptions={{
            className: 'font-hebrew',
            duration: 3500,
            style: {
              background: 'var(--color-slate-50)', // נופל חזרה לצבע בהיר אם ה-glass לא עובד
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              color: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              boxShadow: '0 10px 40px -10px rgba(79, 70, 229, 0.2)', // צל אינדיגו עדין
              borderRadius: '99px', // כפתור עגול לחלוטין (Pill)
              padding: '12px 24px',
              fontWeight: '600',
              fontSize: '14px',
            },
          }}
        />
      </body>
    </html>
  );
}
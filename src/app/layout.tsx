import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";

// DS-6 — pengganti bebas untuk Euclid Circular A dan Canela yang berbayar.
// Ganti di sini saja kalau klien membeli lisensi font aslinya.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500"], // DS-7 — bobot tipis hanya untuk ukuran ≥ 36px
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Booking Kelas Pilates",
  description: "Pesan kelas, kelola kredit, lihat jadwal studio.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${jakarta.variable} ${instrument.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

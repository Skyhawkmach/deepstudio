import "./globals.css";

export const metadata = {
  title: "DeepStudio — Channel Planner",
  description: "AI-powered YouTube content planner for deep house music channels.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
import "./globals.css";

export const metadata = {
  title: "UI Feedback Agent Demo",
  description: "Minimal demo app for quickly testing element picking and prompt export."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

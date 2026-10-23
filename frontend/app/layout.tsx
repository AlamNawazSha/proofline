import "./globals.css";
export const metadata = {
  title: "Proofline — evidence before approval",
  description:
    "Review content against approved brand knowledge. Human control, exact-version approval.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

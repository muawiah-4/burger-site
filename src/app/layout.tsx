import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/cart-context";
import { ProductModalProvider } from "@/context/product-modal-context";
import { FlyToCartProvider } from "@/context/fly-to-cart-context";
import { AccountModalProvider } from "@/context/account-modal-context";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Mascot } from "@/components/layout/Mascot";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { ProductModal } from "@/components/product/ProductModal";
import { AccountModal } from "@/components/account/AccountModal";
import { MotionProvider } from "@/components/providers/MotionProvider";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Ember — Big Flavor. Zero Boring Bites.",
  description:
    "Order premium burgers, pizza, crispy chicken, sides and shakes from Ember. Fast delivery or pickup, made fresh when you order.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} ${inter.variable} antialiased`}>
        <MotionProvider>
          <CartProvider>
            <FlyToCartProvider>
              <ProductModalProvider>
                <AccountModalProvider>
                  <Navbar />
                  <main>{children}</main>
                  <Footer />
                  <CartDrawer />
                  <ProductModal />
                  <AccountModal />
                  <Mascot />
                </AccountModalProvider>
              </ProductModalProvider>
            </FlyToCartProvider>
          </CartProvider>
        </MotionProvider>
      </body>
    </html>
  );
}

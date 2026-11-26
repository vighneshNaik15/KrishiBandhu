import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Navbar />
      <main id="public-content" tabIndex={-1} className="min-w-0 flex-1">{children}</main>
      <Footer />
    </>
  );
}

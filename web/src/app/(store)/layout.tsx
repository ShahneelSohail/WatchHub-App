import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10 md:px-8">{children}</main>
      <Footer />
    </div>
  );
}

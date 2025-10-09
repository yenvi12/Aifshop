import Header from '@/components/Header';
import Hero from '@/components/Hero';
import ProductCard from '@/components/ProductCard';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <section className="max-w-5xl mx-auto px-6 py-12 grid gap-8 md:grid-cols-2">
          <ProductCard price={200} />
          <ProductCard price={120} />
        </section>
      </main>
      <Footer />
    </>
  );
}
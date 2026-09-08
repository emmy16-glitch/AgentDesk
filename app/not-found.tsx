import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-white">
      <Navbar />
      <main className="detail-shell flex min-h-[calc(100vh-58px)] items-center justify-center py-16">
        <section className="max-w-xl rounded-2xl border border-[#233545] bg-gradient-to-br from-[#0c1721] to-[#08121a] p-8 text-center shadow-[0_20px_80px_rgba(0,0,0,.45)]">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#f2bd3e]">
            AgentDesk
          </p>
          <h1 className="mb-4 text-4xl font-extrabold tracking-[-0.04em]">
            Page not found
          </h1>
          <p className="mx-auto max-w-md text-sm leading-6 text-[#aab4bf]">
            The page you requested does not exist in this marketplace.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="gold-button min-w-36"
            >
              Return home
            </Link>
            <Link
              href="/#agents"
              className="dark-button min-w-36"
            >
              Browse agents
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
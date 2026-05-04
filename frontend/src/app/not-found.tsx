import Link from "next/link";

const quickLinks = [
  {
    href: "/",
    title: "Home",
    description: "Return to the main landing page and current highlights.",
  },
  {
    href: "/competitions",
    title: "Competitions",
    description: "Browse current announcements and upcoming events.",
  },
  {
    href: "/users",
    title: "Community",
    description: "Open participant profiles, ratings, and public activity.",
  },
];

export default function NotFound() {
  return (
    <main className="relative overflow-hidden bg-[#0f0f14] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(125,57,235,0.35),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(198,255,51,0.18),_transparent_30%)]" />
      <div className="absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-[#7D39EB]/20 blur-3xl" />

      <section className="relative mx-auto flex min-h-[calc(100vh-10rem)] max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid w-full gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#C6FF33]">
              <span className="h-2 w-2 rounded-full bg-[#C6FF33]" />
              Lost Route
            </div>

            <div className="mb-6 flex items-end gap-3">
              <span className="text-[5rem] font-black leading-none text-transparent bg-gradient-to-b from-[#C6FF33] to-[#7D39EB] bg-clip-text sm:text-[7rem]">
                404
              </span>
              <span className="mb-3 hidden h-1 w-24 rounded-full bg-[#C6FF33] shadow-[0_0_24px_rgba(198,255,51,0.45)] sm:block" />
            </div>

            <h1 className="max-w-2xl text-3xl font-black uppercase leading-tight sm:text-5xl">
              This page dropped out of the bracket
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
              The address may be outdated, moved, or entered with a typo. You can jump back to the main flow,
              open active competitions, or continue through the community section.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full bg-[#C6FF33] px-7 py-4 text-sm font-bold uppercase tracking-[0.18em] text-[#111111] transition-all hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(198,255,51,0.28)]"
              >
                Go Home
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </Link>

              <Link
                href="/competitions"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white transition-all hover:-translate-y-1 hover:border-white/40 hover:bg-white hover:text-[#7D39EB]"
              >
                Find Events
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C6FF33]">Quick Recovery</p>
                  <h2 className="mt-2 text-2xl font-black uppercase">Where to go next</h2>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7D39EB] shadow-[0_0_30px_rgba(125,57,235,0.35)]">
                  <svg className="h-7 w-7 text-[#C6FF33]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12A9 9 0 113 12a9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>

              <div className="space-y-4">
                {quickLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group block rounded-2xl border border-white/10 bg-black/20 p-5 transition-all hover:-translate-y-1 hover:border-[#C6FF33]/40 hover:bg-[#7D39EB]/20"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold uppercase tracking-[0.14em] text-white">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-white/65">{item.description}</p>
                      </div>
                      <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-colors group-hover:border-[#C6FF33] group-hover:text-[#C6FF33]">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-black/20 p-5 text-sm leading-6 text-white/60">
                Tip: if you opened a saved link, the page may have been moved after an update. Start from the main
                sections above and continue from there.
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

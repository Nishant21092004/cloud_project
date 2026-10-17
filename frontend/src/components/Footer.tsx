export function Footer() {
  return (
    <footer className="mt-16 border-t border-cream-300 bg-forest-800 text-cream-200">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <img src="/images/logo.svg" alt="" className="h-8 w-8 rounded-lg" />
            <span className="font-display text-lg font-semibold text-cream-50">BloomNest</span>
          </div>
          <p className="mt-3 text-sm text-cream-200/80">
            Farm-fresh flowers, hand-tied bouquets and easy-going plants — delivered across Delhi NCR.
          </p>
        </div>
        <div className="text-sm">
          <p className="mb-2 font-semibold uppercase tracking-wide text-cream-100/70">Shop</p>
          <ul className="space-y-1.5">
            <li><a className="hover:text-white" href="/flowers">Flowers by stem</a></li>
            <li><a className="hover:text-white" href="/bouquets">Ready bouquets</a></li>
            <li><a className="hover:text-white" href="/plants">Plants</a></li>
            <li><a className="hover:text-white" href="/builder">Build your own</a></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-2 font-semibold uppercase tracking-wide text-cream-100/70">Good to know</p>
          <ul className="space-y-1.5 text-cream-200/80">
            <li>Delivery in 3 slots, 7 days ahead</li>
            <li>Cash on Delivery & UPI/cards</li>
            <li>All prices include GST — no surprises</li>
            <li>Demonstration store built for a course project</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-forest-700 py-4 text-center text-xs text-cream-200/60">
        © {new Date().getFullYear()} BloomNest · A cloud computing course project · PostgreSQL · Express · React · Docker
      </div>
    </footer>
  );
}

# 5-Minute Evaluation Demo Script

Start everything 5 minutes before the evaluator arrives:

```bash
./scripts/rebuild.sh            # build + restart + seed + health wait + product counts
bash scripts/smoke-test.sh      # show 8/8 PASS as a warm-up
```

Photos are fetched live from Wikimedia Commons, so **open the demo on a machine with
internet**; on a hotel WiFi demo the cards fall back to drawn artwork (still per-product,
never broken) — say so up front rather than letting the evaluator notice.

Open two browser windows side by side: `http://` (customer) and `http:///admin` (admin).
Log in: customer `demo@bloomnest.test / Demo@1234`, admin `admin@bloomnest.test / Admin@1234`.

| Time | Do | Say (Hinglish) |
|---|---|---|
| 0:00–0:40 | Homepage scroll → `/flowers` → **hover a card** so the photo strip slides out → open a product and click the lightbox | "Storefront React + Tailwind hai. Har product ki photo usi species ki real photograph hai — Wikimedia Commons se botanical name se search karke aati hai, photographer + licence credit ke saath. Hover par usi phool ke 3–4 frames khulte hain. Catalogue: 146 phool, 193 paudhe, 24 bouquets — sab database me, JSON me hard-code nahi." |
| 0:40–1:10 | Open a plant → select a different pot/size → price & stock change → add to cart | "Plants variants ke saath bikte hain — har pot-size ka apna price aur apna stock hai." |
| 1:10–2:20 | **Bouquet builder**: add 5 roses + 3 lilies, pick wrapping + ribbon, type a message, show the 2D preview updating and the itemized bill; show total = ₹460 example math; add to cart | "Ye main feature hai. Har stem ka price server pe calculate hota hai — client bheja hua total kabhi trust nahi hota. Preview live SVG hai." |
| 2:20–2:45 | Search `unicorn daisy` in the navbar | "Catalogue me na ho to 404 nahi deta — Out of stock page deta hai, us phool ki photos aur 'sabse qareeb in-stock' alternatives ke saath. Search ek merchandising surface hai." |
| 2:45–3:25 | `/delivery` (state-wise) → Cart → checkout → address with PIN **395007 Surat** → slot → **UPI/cards/netbanking (demo)** → **show the PRICE_CHANGED confirmation flow** → place order → receipt with order number | "Delivery India-wide hai, sirf Delhi nahi — har PIN ka apna circle, fee aur ETA server se aata hai; `0…`/`9…` refuse ho jaate hain. Ye demo simulation hai, courier integration nahi. Online payment simulated hai isliye order `DEMO_PAID` dikhega, `PAID` nahi — paisa nahi katta. Prices aur stock server dobara verify karta hai; beech me price badla to naya total confirm karwata hai. Place order button disabled ho to uske neeche reason likha aata hai." |
| 3:25–4:00 | Admin window: dashboard (orders today, revenue, low stock) → Orders → open the new order → click Confirm → Preparing → Out for delivery → Delivered; show COD auto-collected | "Admin dashboard se fulfilment strict sequence mein chalti hai — koi step skip nahi ho sakta. COD cash delivery pe auto-collect ho jata hai." |
| 4:00–4:25 | Customer window: My Orders → order detail → timeline events visible → cancel a SECOND order placed earlier → show stock restored (admin low-stock/flower stock before-after) | "Cancellation pe stock exactly ek baar restore hota hai — status-transition guard iske liye hai." |
| 4:25–4:45 | Terminal: test-suite result and `docker compose ps` | "Automated tests checkout, concurrency, payment signatures aur catalogue data cover karte hain — `docs/TESTING.md` me pura ledger hai, jo chala aur jo is sandbox me nahi chal sakta. Poora system Docker me chal raha hai." |
| 4:45–5:00 | `docker compose down && docker compose up -d` → refresh customer orders page → order still there | "Volumes persistence dikhate hain — container recreate karo, data safe rehta hai. Ye cloud computing ka core concept hai." |

Contingencies:

- If they ask about online payment: open `/api/payments/config` → `{enabled:false, demoOnline:{enabled:true}}` → "Checkout ke payment options server se aate hain, hard-coded nahi. Demo online gateway bina keys ke chalega (simulated, `DEMO_PAID`). Razorpay test keys .env mein daalte hi real checkout.js flow enable ho jata hai — verify + webhook path automated tests mein covered hai."
- If they ask "photo kaunsi hai ye / copyright?": `docs/IMAGES.md` — Commons CC-licensed photos, author + licence credited under each frame, admin upload always overrides, aur offline par project ka own artwork.
- If a photo grid looks generic: the species mapping is one line in `SPECIES_TERMS` (`photos.ts`) — say you would add the cultivar, or upload a real photo in the admin panel.
- If a page feels slow on first load: it's the container cold start; click again — assets are cached.
- Never demo on `docker compose down -v` (that wipes the database).

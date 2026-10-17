# 5-Minute Evaluation Demo Script

Start everything 5 minutes before the evaluator arrives:

```bash
docker compose up --build -d
docker compose exec backend npm run seed     # only on a fresh database
bash scripts/smoke-test.sh                   # show 8/8 PASS as a warm-up
```

Open two browser windows side by side: `http://` (customer) and `http:///admin` (admin).
Log in: customer `demo@bloomnest.test / Demo@1234`, admin `admin@bloomnest.test / Admin@1234`.

| Time | Do | Say (Hinglish) |
|---|---|---|
| 0:00–0:30 | Homepage scroll; flowers → bouquets → plants pages | "Ye humara storefront hai — React + Tailwind, fully responsive. Teeno categories ke paas live stock hai jo database se aa raha hai." |
| 0:30–1:00 | Open a plant → select a different pot/size → price & stock change → add to cart | "Plants variants ke saath bikte hain — har pot-size ka apna price aur apna stock hai." |
| 1:00–2:15 | **Bouquet builder**: add 5 roses + 3 lilies, pick wrapping + ribbon, type a message, show the 2D preview updating and the itemized bill; show total = ₹460 example math; add to cart | "Ye main feature hai. Har stem ka price server pe calculate hota hai — client bheja hua total kabhi trust nahi hota. Preview live SVG hai." |
| 2:15–3:00 | Cart: edit the custom bouquet, change stems, remove a line; checkout → pick address → 110001 Delhi → slot → COD → **show the PRICE_CHANGED confirmation flow** → place order → receipt with order number | "Checkout pe server prices aur stock dobara verify karta hai. Agar beech mein price badla to system naya total confirm karwata hai." |
| 3:00–3:45 | Admin window: dashboard (orders today, revenue, low stock) → Orders → open the new order → click Confirm → Preparing → Out for delivery → Delivered; show COD auto-collected | "Admin dashboard se fulfilment strict sequence mein chalti hai — koi step skip nahi ho sakta. COD cash delivery pe auto-collect ho jata hai." |
| 3:45–4:15 | Customer window: My Orders → order detail → timeline events visible → cancel a SECOND order placed earlier → show stock restored (admin low-stock/flower stock before-after) | "Cancellation pe stock exactly ek baar restore hota hai — status-transition guard iske liye hai." |
| 4:15–4:45 | Terminal: run the test suite result (`46 passed`) and `docker compose ps` | "46 automated tests hain — concurrency, idempotency, payment signatures, sab covered. Pure system Docker mein chal raha hai." |
| 4:45–5:00 | `docker compose down && docker compose up -d` → refresh customer orders page → order still there | "Volumes persistence dikhate hain — container recreate karo, data safe rehta hai. Ye cloud computing ka core concept hai." |

Contingencies:

- If they ask about online payment: open `/api/payments/config` → `{"enabled":false}` → "Razorpay test keys .env mein daalte hi checkout.js wala flow enable ho jata hai; uska poora verify/webhook path automated tests mein covered hai."
- If a page feels slow on first load: it's the container cold start; click again — assets are cached.
- Never demo on `docker compose down -v` (that wipes the database).

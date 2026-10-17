# 10 Likely Viva Questions — simple Hinglish answers

**Q1. Cloud computing kaise use kiya is project mein? (deployment model?)**
Sir, humne IaaS-style deployment kiya hai — ek Linux VM pe Docker chala ke poora stack containers mein daala hai. Frontend Nginx container hai, backend Node.js API container hai, aur database PostgreSQL container. Teeno ek private Docker network pe hain, sirf Nginx ka port 80 bahar exposed hai — ye least-privilege exposure hai. Data ke liye named volumes hain, config ke liye environment variables — ye 12-factor app ka principle hai. Aage ke liye documented hai ki managed database (RDS jaisa) aur multiple instances kaise lag sakte hain.

**Q2. Docker containers vs virtual machines — difference kya hai?**
VM mein poora guest OS hota hai, har VM GBs leta hai, boot minutes leta hai. Container sirf OS ka kernel share karta hai — image MBs mein hota hai aur seconds mein start hota hai. Isliye containers lightweight, portable aur fast-scale hote hain. Humara poora project 3 containers mein hai jo kisi bhi Docker machine pe `docker compose up` se same chalega — ye portability ka fayda hai.

**Q3. Custom bouquet ka price kaise calculate hota hai — kaise pata client manipulate nahi kar raha?**
Price sirf server pe banta hai. Ek pure pricing engine hai jo database se flower ka per-stem price, wrapping, ribbon, extras uthata hai — client ka bheja hua total kabhi use nahi hota. Cart load hone pe bhi re-pricing hoti hai, aur checkout pe ek fingerprint check hota hai: agar customer ke quote ke baad price badal gaya, to server `PRICE_CHANGED` 409 deta hai naye quote ke saath — customer ko confirm karna padta hai. Sab paisa integer paise mein hai, float nahi — rounding errors zero.

**Q4. Do customers ek saath last item kharidein to kya hota hai? (overselling?)**
Oversell impossible hai. Checkout ek database transaction mein hota hai jisme stock conditional decrement hota hai: `UPDATE ... SET stock = stock - n WHERE stock >= n`. Jo query 1 row update kar pati hai woh jeet jaati hai, baaki ka transaction rollback aur unhe 409 OUT_OF_STOCK milta hai. Ye humne test mein verify kiya — 4 parallel checkouts, stock 1: exactly 1 order bana.

**Q5. Payment verification kaise hoti hai? Kya browser ka "success" trust karte ho?**
Bilkul nahi. Razorpay se aane wale callback pe pehle HMAC-SHA256 signature verify hota hai (order_id|payment_id key secret ke saath). Phir server khud Razorpay API se payment fetch karke confirm karta hai ki wo captured hai, amount sahi hai aur usi order ka hai. Webhook mein raw body ka HMAC hota hai. Order sirf tab PAID hota hai jab verified confirmation mile — guarded update `WHERE paymentStatus = 'PENDING'` se duplicates bhi safe hain.

**Q6. Idempotency ka kya matlab hai, aur aapne kaise handle kiya?**
Matlab — same request do baar aaye to do baar effect na ho. Network retry ya double-click se duplicate orders nahi banne chahiye. Humne checkout pe `Idempotency-Key` header liya — key database mein unique hoti hai, pehle claim hoti hai, order banne pe usse link ho jaati hai. Same key dobara aaye to wahi order wapas milta hai, naya order nahi banta. Payment verify aur webhook bhi idempotent hain — guarded transitions aur WebhookEvent dedup table se.

**Q7. Cancellation pe stock wapas kaise aata hai — double restore kyun nahi hota?**
Cancel ek status-transition guard ke saath hota hai: `UPDATE orders SET status='CANCELLED' WHERE id=? AND status IN ('PLACED','CONFIRMED','PREPARING')`. Sirf wahi request jisko 1 row milti hai, stock restore karti hai. Dobara cancel karne pe row nahi milti → 409. Isliye stock "exactly once" restore hota hai — ye bhi test covered hai. Historical order lines snapshot use karte hain, isliye catalogue badalne ke baad bhi sahi stems wapas aate hain.

**Q8. Aapka database design explain karo — stock kahan store hota hai?**
Stock leaf level pe hai: `Flower.stockStems` (per stem) aur `PlantVariant.stock` (har pot-size ka alag). Bouquets ka apna stock nahi — unka recipe hota hai (BouquetItem: kaunsa flower, kitne stems), availability compute hoti hai min(stock ÷ recipe stems). Order ke andar OrderItem hota hai jisme price + composition ka JSON snapshot hota hai — isse history immutable rehti hai. Kul 22 tables hain — users, addresses, cart, custom bouquets, orders, payments, webhook events, idempotency keys.

**Q9. Nginx kyun lagaya? Direct Node kyun nahi?**
Nginx teen kaam karta hai: (1) React ka built bundle serve karta hai with SPA fallback and asset caching, (2) `/api` aur `/uploads` ko backend pe reverse-proxy karta hai — isse same-origin milta hai, CORS nahi lagna padta, (3) ye hi TLS termination point hai jab HTTPS lagayenge. Isse backend container ko bahar se direct expose hi nahi karte.

**Q10. Single VM ki limitations kya hain? Production mein kya badlogoge?**
Single VM single point of failure hai, vertical scale hi kar sakte hain. In-memory rate limiting per-instance hai, sweeper bhi backend ke andar chalta hai. Production mein: 2+ backend replicas load balancer ke peeche, managed PostgreSQL (RDS) automated backups ke saath, images ke liye S3-jaisa object storage + CDN, Redis for rate limiting/sessions, CI/CD pipeline registry ke saath, aur centralized logging/monitoring (Prometheus-Grafana). Ye sab DEPLOYMENT.md mein documented hai — implemented vs future clearly alag kiya hua hai.

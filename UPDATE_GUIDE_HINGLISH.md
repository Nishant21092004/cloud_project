# BloomNest — October update (Hinglish guide)

Yeh guide sirf 8 cheezon ke baare me hai jo aapne maangi thi: real flower
photos, hover par 3–4 images, kam se kam 100 phool + 100 paudhe, "not found"
ki jagah **Out of stock**, checkout me online payment option, Delhi ki jagah
poora India, aur **Place order** jo actually chale.

## 1. Kya-kya badla

| Aapki problem | Ab kya hoga |
|---|---|
| Phool ke card par drawing dikh rahi thi | Ab har card **Wikimedia Commons** se usi species ki original photo laata hai (botanical name se search: `Tagetes erecta marigold orange`). Photo ke neeche photographer + licence credit bhi aata hai |
| Hover par kuch nahi | Card par hover/focus karte hi usi phool ke **3–4 alag photos** side me khulte hain aur 1.5s me badalte rehte hain. Product page par same gallery lightbox ke saath |
| Catalogue chhota tha | Ab seed ke baad **146 phool (38 families) + 193 paudhe (498 pot variants) + 24 bouquet recipes** = 363 listings |
| Search "not found" deta tha | Jo item hamare paas nahi, us par **"Out of stock"** page khulta hai — us phool ki photos, estimate price, "notify me" aur "sabse qareeb in-stock" alternatives. Dead end nahi |
| Sirf Cash on Delivery | Checkout me ab **COD + Demo online payment (UPI/card/netbanking, simulated — paisa nahi katta) + Razorpay** (jab `.env` me test keys hon). Kaunsa option dikhega yeh server decide karta hai: `GET /api/payments/config` |
| Delivery sirf Delhi | Ab **poora India** — PIN ka pehla digit 1–8 ho to serviceable (metro hub sasta, north-east/remote mehnga, ₹39 floor), `0…`/`9…` refuse. `/delivery` page par state-wise list. Admin ke PIN rows hamesha override karte hain |
| Place order dab hi nahi raha tha | Button ab **disabled hone ka karan** button ke neeche list karta hai (adhoori address, cart khaali, price badal gaya, slot expire). Ek baar sab sahi → order banega, idempotency key ke saath, aur usi order par redirect hoga (pehle "latest order" dhoondhne ki galat koshish hoti thi) |

## 2. `D:\cc_project` me changes kaise lagayein

Sabse aasan — repo root se ek command:

```powershell
cd D:\cc_project
powershell -ExecutionPolicy Bypass -File .\REBUILD.ps1 -Seed
```

`REBUILD.ps1` build karta hai, stack restart karta hai, `/health/ready` ka wait karta
hai, seed chalata hai, aur ant me bataata hai ki DB me kitne products hain.
`-SeedOnly` = sirf dobara seed (jab aap `backend/prisma/data/*` badlein).
`-Full` = `--no-cache` rebuild (Docker purani cache kha raha ho tab).

Manual tareeqa, yahi order follow karein:

```powershell
docker compose down
docker compose build --no-cache
docker compose up -d
docker compose exec backend npm run seed
```

Uske baad browser me **Ctrl+Shift+R** (hard refresh) — purana bundle cache me atak
jata hai, isliye aksar "kuch change nahi dikha" wali shikayat yahin hoti hai.

`.env` aur Docker volumes ko haath mat lagana: seed idempotent hai, aapke
manually badle hue price/stock/upload kiye photos ko overwrite **nahi** karta.
`docker compose down -v` se database delete ho jayega — wo mat karna.

## 3. Browser me verify karne ki checklist

1. `http://localhost/flowers` → kisi bhi card par hover: side me 3–4 photos khulni chahiye. (Browser ko internet chahiye — `commons.wikimedia.org` block/offline hoga to card apne aap project-drawn artwork par chale jayega, phir bhi har product ka apna rang-dulaara chitra, koi toota icon nahi.)
2. `http://localhost/flowers?q=unicorn daisy` → **Out of stock** page, "not found" nahi.
3. `http://localhost/plants` → 193 paudhe, "Showing 24 of 193" + Show more.
4. `http://localhost/delivery` → state-wise coverage aur PIN `395007` (Surat) ka demo charge ₹45, ETA 1–2 din. `999999` → serviceable nahi.
5. Cart → Checkout → mobile `09876543210` type karein: ab valid hai.
6. Payment section me **"UPI / cards / netbanking" (Prepaid)** select karke Place order → order `DEMO_PAID` dikhega (`PAID` nahi, kyunki asli paisa nahi kata). Razorpay keys ke bina wo option disabled rahega aur reason dikhega.
7. Sold-out phool (jaise search se milega) ke page par "In stock, closest to this" alternatives dikhenge.
8. Admin (`admin@bloomnest.test` / `Admin@1234`) → Products → kisi phool me `Upload image` se apni photo daalo → storefront par wahin image aayegi (Commons lookup skip ho jayega). Yehi tareeqa real shop ke liye sahi hai.

## 4. Jo abhi bhi "classroom only" hai (viva me ye bolna safe hai)

- Delivery estimate aur `DEMO_ONLINE` payment **simulation** hai — koi courier API ya payment gateway settle nahi hota. Real fulfilment ke liye India Post/Delhivery/Shadowfax API + merchant onboarding chahiye.
- Commons photos **us species** ki hain, "aapke cold store ke phool" ki nahi. Licence CC BY/CC BY-SA/CC0 hai isliye attribution line hatana nahi chahiye (details: `docs/IMAGES.md`).
- Uploaded photos Docker volume me hote hain — volume delete = photos bhi gayab. Backup: `scripts/backup.sh`.
- `/api/admin/uploads` ke alawa koi image CDN nahi; production me aapko apna bucket/CDN chahiye hoga.

## 5. GitHub par daalne se pehle (zaroor padho)

Aapke paas GitHub par **`Nishant21092004/cloud_project`** (private) hai — `cc_project` naam ka koi repo nahi mila. Isliye repo ka **naam** badalne ki koshish mat karo, sirf contents update karo:

```powershell
cd D:\cc_project
git status                       # pehle dekho kya-kya badla
git add -A
git commit -m "BloomNest: real photos, 363 listings, all-India delivery, working checkout"
git push origin main             # reject ho to: git pull --rebase origin main, phir push
```

Ya repo script se: `powershell -ExecutionPolicy Bypass -File .\SYNC_TO_GITHUB.ps1`
(warning padh kar `REPLACE` type karna — yeh `main` ke contents force-with-lease
se replace karta hai, repo ka naam nahi).

**Note:** is workspace (Arena sandbox) se `git push` abhi **403** deta hai —
permission/role ki wajah se. Matlab code yahan ready hai lekin push aapko apne
machine se karna hoga. Aur `D:\cc_project` mere sandbox me accessible nahi hai,
isliye wahan ki file-copy aapko hi karni hogi.

# BloomNest — October update (Hinglish)

1. Existing project ko update karo, `.env` ko preserve karna (ZIP me secrets intentionally nahi hain).
2. `docker compose up -d --build` chalao. Migrations startup par automatically apply hongi.
3. **Zaroor** `docker compose exec backend npm run seed` dobara chalao. Isse purane products delete nahi honge; 152 sample listings aayengi.
4. `http://localhost/flowers` ya apne WEB_PORT par dekho, hover gallery test karo.
5. Search `unicorn daisy` karo: Out of stock with illustrative reference image.
6. Checkout: 0-prefixed Indian mobile number bhi valid hoga; missing fields button ke neeche explain honge.
7. PIN `395007` se India-wide **DEMO** delivery charge check karo. PIN `999999` invalid hai. Real shipping abhi integrated nahi hai.
8. Payment: Cash on Delivery kaam karega; "Online payment — demo" se **fake/simulated** payment (no charge) order banega. Razorpay test mode ke liye `.env` me proper test keys configure karo, real payment keys ko GitHub par kabhi upload mat karna.
9. `My orders` me status check karo. Demo payment ko **DEMO_PAID** dikhaayega, real `PAID` nahi.
10. Production launch se pehle accurate licensed images, third-party payment configuration, real courier API and availability admin se verify karni hogi.

## Existing GitHub `cloud_project` repository ko replace karne ke commands

Pehle local BloomNest folder ka backup le lo. Updated ZIP ka `cc_project` folder `D:\cc_project` me copy karo, **`.env` aur existing database volumes ko preserve** karo. PowerShell me:

```powershell
cd D:\cc_project
git status
git remote remove origin  # agar 'No such remote' kahe to ignore karo
git remote add origin https://github.com/Nishant21092004/cloud_project.git
git fetch origin main
git add -A
git commit -m "Replace ShopSense with updated BloomNest"  # agar nothing to commit ho to ignore
# Sirf jab poora BloomNest source ready aur test ho; yeh purane ShopSense main ko replace karega:
git push --force-with-lease origin main
```

Repo ka naam **cloud_project** hi rahega; ye contents replace karega. Remote push abhi ChatGPT sandbox se nahi hua hai.

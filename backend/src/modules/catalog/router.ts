import { Router } from "express";
import { z } from "zod";
import { parse, pincodeSchema } from "../../lib/validate.js";
import { checkServiceability, getActiveSlots, getBuilderOptions, getProductBySlug, listBouquets, listFlowers, listPlants, type CatalogFilters } from "./service.js";
import { priceCustomBouquet } from "./pricing.js";
import { loadConfigFromInput } from "../cart/service.js";

export const catalogRouter = Router();

function filtersFromQuery(query: Record<string, unknown>): CatalogFilters {
  return {
    q: typeof query.q === "string" && query.q.trim() ? query.q.trim() : undefined,
    color: typeof query.color === "string" && query.color.trim() ? query.color.trim() : undefined,
    minPrice: query.minPrice !== undefined ? Number(query.minPrice) : undefined,
    maxPrice: query.maxPrice !== undefined ? Number(query.maxPrice) : undefined,
    inStock: query.inStock === "true" || query.inStock === "1",
    sort: typeof query.sort === "string" && ["price_asc", "price_desc", "name", "newest"].includes(query.sort)
      ? (query.sort as CatalogFilters["sort"])
      : undefined,
  };
}

catalogRouter.get("/flowers", async (req, res, next) => {
  try { res.json({ flowers: await listFlowers(filtersFromQuery(req.query)) }); } catch (e) { next(e); }
});

catalogRouter.get("/bouquets", async (req, res, next) => {
  try { res.json({ bouquets: await listBouquets(filtersFromQuery(req.query)) }); } catch (e) { next(e); }
});

catalogRouter.get("/plants", async (req, res, next) => {
  try { res.json({ plants: await listPlants(filtersFromQuery(req.query)) }); } catch (e) { next(e); }
});

catalogRouter.get("/products/:slug", async (req, res, next) => {
  try { res.json({ product: await getProductBySlug(req.params.slug) }); } catch (e) { next(e); }
});

catalogRouter.get("/options", async (_req, res, next) => {
  try { res.json(await getBuilderOptions()); } catch (e) { next(e); }
});

catalogRouter.get("/delivery-slots", async (_req, res, next) => {
  try { res.json({ slots: await getActiveSlots() }); } catch (e) { next(e); }
});

catalogRouter.get("/serviceability/:pincode", async (req, res, next) => {
  try {
    const { pincode } = parse(z.object({ pincode: pincodeSchema }), req.params);
    res.json(await checkServiceability(pincode));
  } catch (e) { next(e); }
});

/**
 * Live bouquet preview — the builder posts the config on every change and
 * gets the SAME server-side price the cart and checkout will compute.
 * The server response is the single source of truth for the displayed ₹.
 */
catalogRouter.post("/bouquet/preview", async (req, res, next) => {
  try {
    const body = parse(
      z.object({
        flowers: z.array(z.object({ flowerId: z.string().min(1), stems: z.number().int().min(0).max(50) })).max(12),
        wrappingId: z.string().nullish(),
        ribbonId: z.string().nullish(),
        extraIds: z.array(z.string()).max(6).optional(),
        greetingMessage: z.string().max(300).nullish(),
      }),
      req.body,
    );
    const config = await loadConfigFromInput({
      flowers: body.flowers.filter((f) => f.stems > 0),
      wrappingId: body.wrappingId ?? null,
      ribbonId: body.ribbonId ?? null,
      extraIds: body.extraIds ?? [],
      greetingMessage: body.greetingMessage ?? null,
    });
    const result = priceCustomBouquet(config);
    res.json({ pricing: result });
  } catch (e) { next(e); }
});

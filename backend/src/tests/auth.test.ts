/** Registration, login and admin authorization checks. */
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { agent, app, closeDb, mkCustomer, resetDb, seedBase } from "./helpers.js";

beforeEach(resetDb);
afterEach(() => void 0);
afterAll(closeDb);

describe("registration & login", () => {
  it("registers a new customer and sets an httpOnly session cookie", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Aditi", email: "aditi@test.local", password: "Sup3rSecret!", phone: "9876543210",
    });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("CUSTOMER");
    const cookie = (res.headers["set-cookie"] as unknown as string[])[0];
    expect(cookie).toMatch(/^bn_session=/);
    expect(cookie).toContain("HttpOnly");
  });

  it("never lets public registration create an ADMIN", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Sneaky", email: "sneaky@test.local", password: "Sup3rSecret!", role: "ADMIN",
    });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("CUSTOMER");
  });

  it("rejects duplicate emails", async () => {
    const body = { name: "Dup", email: "dup@test.local", password: "Sup3rSecret!" };
    expect((await request(app).post("/api/auth/register").send(body)).status).toBe(201);
    const again = await request(app).post("/api/auth/register").send(body);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("logs in with correct credentials and rejects wrong ones with the same error", async () => {
    await request(app).post("/api/auth/register").send({ name: "Log", email: "login@test.local", password: "RightPass1!" });
    const ok = await request(app).post("/api/auth/login").send({ email: "login@test.local", password: "RightPass1!" });
    expect(ok.status).toBe(200);
    expect(ok.body.user.email).toBe("login@test.local");

    const bad = await request(app).post("/api/auth/login").send({ email: "login@test.local", password: "WrongPass1!" });
    expect(bad.status).toBe(401);
    const ghost = await request(app).post("/api/auth/login").send({ email: "ghost@test.local", password: "RightPass1!" });
    expect(ghost.status).toBe(401);
    // uniform error → no account enumeration
    expect(bad.body.error.code).toBe(ghost.body.error.code);
  });
});

describe("authorization", () => {
  it("blocks anonymous access to admin endpoints", async () => {
    const res = await request(app).get("/api/admin/stats");
    expect(res.status).toBe(401);
  });

  it("blocks customers from admin endpoints (403, server-side role check)", async () => {
    const { cookie } = await mkCustomer("Plain Customer");
    const res = await agent(cookie).get("/api/admin/stats");
    expect(res.status).toBe(403);
  });

  it("allows admins through", async () => {
    const { cookie } = await mkCustomer("Boss", "ADMIN");
    const res = await agent(cookie).get("/api/admin/stats");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalOrders");
  });

  it("requires auth for carts and orders", async () => {
    await seedBase();
    expect((await request(app).get("/api/cart")).status).toBe(401);
    expect((await request(app).get("/api/orders")).status).toBe(401);
  });
});

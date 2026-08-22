import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { requireAuth, requireRole, optionalAuth, isAdmin } from "../middleware/auth";
import { recordAudit } from "../lib/audit";

export const housingRouter = Router();

housingRouter.get("/", async (req, res, next) => {
  try {
    const querySchema = z.object({
      city: z.string().optional(),
      country: z.string().optional(),
      max_rent: z.coerce.number().positive().optional(),
      currency: z.string().length(3).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(60),
      // Housing had limit but no offset, so everything past the first page was
      // unreachable — and ordering by rating DESC meant new listings from
      // landlords with no rating yet were the ones nobody could ever see.
      offset: z.coerce.number().int().min(0).default(0),
    });
    const { city, country, max_rent, currency, limit, offset } = querySchema.parse(req.query);
    const filters: string[] = [`status = 'active'`];
    const values: unknown[] = [];
    let i = 1;

    if (city) { filters.push(`city ILIKE $${i++}`); values.push(city); }
    if (country) { filters.push(`country ILIKE $${i++}`); values.push(country); }
    if (currency) { filters.push(`currency = $${i++}`); values.push(currency); }
    // Listings are priced in different currencies (CAD/EUR/GBP/...) with no
    // exchange-rate conversion in this app, so "rent_amount <= max_rent" only
    // means something when every row being compared shares one currency.
    // Without a currency filter too, this comparison would mix e.g. a GBP
    // listing that's actually far more expensive with a cheaper CAD one just
    // because their raw numbers happen to be close — real money, real budgets,
    // so silently dropping the filter here is safer than silently misleading.
    if (max_rent !== undefined && currency) { filters.push(`rent_amount <= $${i++}`); values.push(max_rent); }

    const rows = await query(
      `SELECT hl.id, hl.title, hl.city, hl.country, hl.rent_amount, hl.currency,
              hl.bedrooms, hl.bathrooms, hl.furnished, hl.photos, hl.rating,
              hl.created_at, u.full_name AS landlord_name, u.verification_status AS landlord_status
       FROM housing_listings hl
       JOIN users u ON u.id = hl.landlord_id
       WHERE ${filters.join(" AND ")}
       ORDER BY hl.rating DESC, hl.created_at DESC
       LIMIT $${i++} OFFSET $${i++}`,
      [...values, limit, offset]
    );
    res.set("Cache-Control", "public, max-age=60");
    res.json({ listings: rows });
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().max(5000).optional(),
  city: z.string().min(1).max(100),
  country: z.string().min(1).max(100),
  address: z.string().max(300).optional(),
  rent_amount: z.number().positive(),
  currency: z.string().length(3),
  bedrooms: z.number().int().min(0).max(50).optional(),
  bathrooms: z.number().int().min(0).max(50).optional(),
  furnished: z.boolean().optional(),
  near_university: z.string().max(200).optional(),
  photos: z.array(z.string().url()).max(20).optional(),
  virtual_tour_url: z.string().url().optional(),
});

// New listings default to pending_review (DB column default) so they go
// through admin moderation via GET /admin/pending before appearing publicly.
housingRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const b = createSchema.parse(req.body);
    const listing = await queryOne(
      `INSERT INTO housing_listings
        (landlord_id, title, description, city, country, address, rent_amount, currency,
         bedrooms, bathrooms, furnished, near_university, photos, virtual_tour_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [
        req.user!.sub, b.title, b.description ?? null, b.city, b.country, b.address ?? null,
        b.rent_amount, b.currency, b.bedrooms ?? null, b.bathrooms ?? null, b.furnished ?? false,
        b.near_university ?? null, b.photos ?? null, b.virtual_tour_url ?? null,
      ]
    );
    res.status(201).json({ listing });
  } catch (err) { next(err); }
});

const updateSchema = createSchema.partial();

// Owner can edit their own listing (admins can edit any). Editing an active
// listing sends it back through moderation rather than silently changing
// what's already live.
housingRouter.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const existing = await queryOne<{ landlord_id: string; status: string }>(
      `SELECT landlord_id, status FROM housing_listings WHERE id = $1`,
      [req.params.id]
    );
    if (!existing) return res.status(404).json({ error: "Listing not found" });
    if (existing.landlord_id !== req.user!.sub && !["admin", "super_admin"].includes(req.user!.role)) {
      return res.status(403).json({ error: "Not your listing" });
    }

    const b = updateSchema.parse(req.body);
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    for (const [k, v] of Object.entries(b)) {
      if (v === undefined) continue;
      fields.push(`${k} = $${i++}`);
      values.push(v);
    }
    if (existing.status === "active") {
      fields.push(`status = $${i++}`);
      values.push("pending_review");
    }
    if (!fields.length) return res.status(400).json({ error: "No fields to update" });

    values.push(req.params.id);
    const listing = await queryOne(
      `UPDATE housing_listings SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );
    res.json({ listing });
  } catch (err) { next(err); }
});

// Owner can remove their own listing (admins can remove any).
housingRouter.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const existing = await queryOne<{ landlord_id: string }>(
      `SELECT landlord_id FROM housing_listings WHERE id = $1`,
      [req.params.id]
    );
    if (!existing) return res.status(404).json({ error: "Listing not found" });
    if (existing.landlord_id !== req.user!.sub && !["admin", "super_admin"].includes(req.user!.role)) {
      return res.status(403).json({ error: "Not your listing" });
    }
    await query(`DELETE FROM housing_listings WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Admin: listings awaiting review (must be before "/:id")
// Pending-review listings AND anything reported since going live — both need
// an admin's attention, not just new intake.
housingRouter.get("/admin/pending", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT hl.id, hl.title, hl.city, hl.country, hl.rent_amount, hl.currency,
              hl.bedrooms, hl.bathrooms, hl.furnished, hl.photos, hl.status, hl.created_at,
              u.full_name AS landlord_name, u.verification_status AS landlord_status,
              COALESCE(r.report_count, 0)::int AS report_count
       FROM housing_listings hl
       JOIN users u ON u.id = hl.landlord_id
       LEFT JOIN (
         SELECT target_id, COUNT(*) AS report_count FROM reports
         WHERE target_type = 'listing' AND status = 'pending'
         GROUP BY target_id
       ) r ON r.target_id = hl.id
       WHERE hl.status = 'pending_review' OR r.report_count > 0
       ORDER BY r.report_count DESC NULLS LAST, hl.created_at ASC
       LIMIT 100`
    );
    res.json({ listings: rows });
  } catch (err) {
    next(err);
  }
});

// The list filters on status='active' but this route did not, so a listing an
// admin had archived — a confirmed scam, say — stayed fully readable at its
// direct URL, address and all, to anyone who already had the link. Moderation
// was cosmetic. optionalAuth keeps anonymous browsing of active listings while
// letting the owner and admins still see their own non-active ones.
housingRouter.get("/:id", optionalAuth, async (req, res, next) => {
  try {
    const listing = await queryOne<{ status: string; landlord_id: string } & Record<string, unknown>>(
      `SELECT hl.id, hl.landlord_id, hl.title, hl.description, hl.city, hl.country, hl.address,
              hl.rent_amount, hl.currency, hl.bedrooms, hl.bathrooms, hl.furnished,
              hl.near_university, hl.photos, hl.virtual_tour_url, hl.rating, hl.status,
              hl.created_at, u.full_name AS landlord_name, u.verification_status AS landlord_status,
              u.avatar_url AS landlord_avatar
       FROM housing_listings hl
       JOIN users u ON u.id = hl.landlord_id
       WHERE hl.id = $1`,
      [req.params.id]
    );
    if (!listing) return res.status(404).json({ error: "Listing not found" });

    const viewer = req.user;
    const maySeeNonActive =
      !!viewer && (viewer.sub === listing.landlord_id || isAdmin(viewer.role));
    // 404 rather than 403: whether a withdrawn listing ever existed is itself
    // information, and the list route already behaves as though it does not.
    if (listing.status !== "active" && !maySeeNonActive) {
      return res.status(404).json({ error: "Listing not found" });
    }
    res.status(200).json({ listing });
  } catch (err) {
    next(err);
  }
});

const statusSchema = z.object({
  // Matches the real Postgres listing_status enum exactly — it has no
  // "rejected" value, only these five.
  status: z.enum(["draft", "pending_review", "active", "rented", "archived"]),
});

// Admin: change a listing's status (activate / reject / archive)
housingRouter.patch("/:id/status", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { status } = statusSchema.parse(req.body);
    const listing = await queryOne(
      `UPDATE housing_listings SET status = $1 WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    // Clear any pending reports against this listing — otherwise it would
    // stay stuck in the admin "needs review" queue forever after being acted on.
    await query(
      `UPDATE reports SET status = 'resolved', resolved_by = $1, resolved_at = NOW()
       WHERE target_type = 'listing' AND target_id = $2 AND status = 'pending'`,
      [req.user!.sub, req.params.id]
    );
    await recordAudit({
      adminId: req.user!.sub,
      action: "listing.status",
      targetType: "listing",
      targetId: String(req.params.id),
      metadata: { status },
    });
    res.json({ listing });
  } catch (err) {
    next(err);
  }
});

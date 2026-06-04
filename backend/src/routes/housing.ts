import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";

export const housingRouter = Router();

housingRouter.get("/", async (req, res, next) => {
  try {
    const querySchema = z.object({
      city: z.string().optional(),
      country: z.string().optional(),
      max_rent: z.coerce.number().positive().optional(),
      currency: z.string().length(3).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
    });
    const { city, country, max_rent, currency, limit } = querySchema.parse(req.query);
    const filters: string[] = [`status = 'active'`];
    const values: unknown[] = [];
    let i = 1;

    if (city) { filters.push(`city ILIKE $${i++}`); values.push(city); }
    if (country) { filters.push(`country ILIKE $${i++}`); values.push(country); }
    if (max_rent !== undefined) { filters.push(`rent_amount <= $${i++}`); values.push(max_rent); }
    if (currency) { filters.push(`currency = $${i++}`); values.push(currency); }

    const rows = await query(
      `SELECT hl.id, hl.title, hl.city, hl.country, hl.rent_amount, hl.currency,
              hl.bedrooms, hl.bathrooms, hl.furnished, hl.photos, hl.rating,
              hl.created_at, u.full_name AS landlord_name, u.verification_status AS landlord_status
       FROM housing_listings hl
       JOIN users u ON u.id = hl.landlord_id
       WHERE ${filters.join(" AND ")}
       ORDER BY hl.rating DESC, hl.created_at DESC
       LIMIT $${i++}`,
      [...values, Number(limit) || 60]
    );
    res.set("Cache-Control", "public, max-age=60");
    res.json({ listings: rows });
  } catch (err) {
    next(err);
  }
});

// Admin: listings awaiting review (must be before "/:id")
housingRouter.get("/admin/pending", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT hl.id, hl.title, hl.city, hl.country, hl.rent_amount, hl.currency,
              hl.bedrooms, hl.bathrooms, hl.furnished, hl.photos, hl.status, hl.created_at,
              u.full_name AS landlord_name, u.verification_status AS landlord_status
       FROM housing_listings hl
       JOIN users u ON u.id = hl.landlord_id
       WHERE hl.status = 'pending_review'
       ORDER BY hl.created_at ASC
       LIMIT 100`
    );
    res.json({ listings: rows });
  } catch (err) {
    next(err);
  }
});

housingRouter.get("/:id", async (req, res, next) => {
  try {
    const listing = await queryOne(
      `SELECT hl.id, hl.title, hl.description, hl.city, hl.country, hl.address,
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
    res.status(200).json({ listing });
  } catch (err) {
    next(err);
  }
});

const statusSchema = z.object({
  status: z.enum(["active", "rejected", "archived", "pending_review"]),
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
    res.json({ listing });
  } catch (err) {
    next(err);
  }
});

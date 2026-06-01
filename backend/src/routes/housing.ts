import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";

export const housingRouter = Router();

housingRouter.get("/", async (req, res, next) => {
  try {
    const { city, country, max_rent, currency, limit } = req.query;
    const filters: string[] = [`status = 'active'`];
    const values: unknown[] = [];
    let i = 1;

    if (city) { filters.push(`city ILIKE $${i++}`); values.push(city); }
    if (country) { filters.push(`country ILIKE $${i++}`); values.push(country); }
    if (max_rent) { filters.push(`rent_amount <= $${i++}`); values.push(Number(max_rent)); }
    if (currency) { filters.push(`currency = $${i++}`); values.push(currency); }

    const rows = await query(
      `SELECT hl.*, u.full_name AS landlord_name, u.verification_status AS landlord_status
       FROM housing_listings hl
       JOIN users u ON u.id = hl.landlord_id
       WHERE ${filters.join(" AND ")}
       ORDER BY hl.rating DESC, hl.created_at DESC
       LIMIT $${i++}`,
      [...values, Number(limit) || 60]
    );
    res.json({ listings: rows });
  } catch (err) {
    next(err);
  }
});

// Admin: listings awaiting review (must be before "/:id")
housingRouter.get("/admin/pending", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT hl.*, u.full_name AS landlord_name, u.verification_status AS landlord_status
       FROM housing_listings hl
       JOIN users u ON u.id = hl.landlord_id
       WHERE hl.status = 'pending_review'
       ORDER BY hl.created_at ASC`
    );
    res.json({ listings: rows });
  } catch (err) {
    next(err);
  }
});

housingRouter.get("/:id", async (req, res, next) => {
  try {
    const listing = await queryOne(
      `SELECT hl.*, u.full_name AS landlord_name, u.verification_status AS landlord_status,
              u.avatar_url AS landlord_avatar
       FROM housing_listings hl
       JOIN users u ON u.id = hl.landlord_id
       WHERE hl.id = $1`,
      [req.params.id]
    );
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    res.json({ listing });
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  title: z.string().min(5),
  description: z.string().optional(),
  city: z.string(),
  country: z.string(),
  address: z.string().optional(),
  rent_amount: z.number().positive(),
  currency: z.string().length(3),
  bedrooms: z.number().int().optional(),
  bathrooms: z.number().int().optional(),
  furnished: z.boolean().optional(),
  near_university: z.string().optional(),
  photos: z.array(z.string().url()).optional(),
  virtual_tour_url: z.string().url().optional(),
});

housingRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const listing = await queryOne(
      `INSERT INTO housing_listings (landlord_id, title, description, city, country, address,
         rent_amount, currency, bedrooms, bathrooms, furnished, near_university, photos, virtual_tour_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        req.user!.sub,
        body.title,
        body.description,
        body.city,
        body.country,
        body.address,
        body.rent_amount,
        body.currency,
        body.bedrooms,
        body.bathrooms,
        body.furnished ?? false,
        body.near_university,
        body.photos,
        body.virtual_tour_url,
      ]
    );
    res.json({ listing });
  } catch (err) {
    next(err);
  }
});

housingRouter.post("/roommate-match", requireAuth, async (req, res, next) => {
  try {
    const matches = await query(
      `SELECT u.id, u.full_name, u.avatar_url, u.country_of_origin, rp.*
       FROM roommate_preferences rp
       JOIN users u ON u.id = rp.user_id
       WHERE rp.looking_for_roommate = TRUE AND rp.user_id != $1
       LIMIT 20`,
      [req.user!.sub]
    );
    res.json({ matches });
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

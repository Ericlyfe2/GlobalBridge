import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";

export const opportunitiesRouter = Router();

opportunitiesRouter.get("/", async (req, res, next) => {
  try {
    const querySchema = z.object({
      type: z.enum(["scholarship", "work_study", "exchange", "internship", "job"]).optional(),
      country: z.string().optional(),
      search: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      offset: z.coerce.number().int().min(0).default(0),
    });
    const { type, country, search, limit, offset } = querySchema.parse(req.query);
    const filters: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (type) {
      filters.push(`type = $${i++}`);
      values.push(type);
    }
    if (country) {
      filters.push(`country ILIKE $${i++}`);
      values.push(country);
    }
    if (search) {
      filters.push(`(title ILIKE $${i} OR description ILIKE $${i})`);
      values.push(`%${search}%`);
      i++;
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    values.push(Number(limit), Number(offset));

    const rows = await query(
      `SELECT id, type, title, description, country, institution, field_of_study,
              funding_amount, currency, eligibility, deadline, sponsors_visa,
              view_count, created_at
       FROM opportunities ${where}
       ORDER BY deadline ASC NULLS LAST, created_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      values
    );
    res.set("Cache-Control", "public, max-age=60");
    res.json({ opportunities: rows });
  } catch (err) {
    next(err);
  }
});

opportunitiesRouter.get("/:id", async (req, res, next) => {
  try {
    const opp = await queryOne(
      `UPDATE opportunities SET view_count = view_count + 1 WHERE id = $1
       RETURNING id, type, title, description, country, institution, field_of_study,
                 funding_amount, currency, eligibility, application_url, deadline,
                 sponsors_visa, view_count, created_at, posted_by`,
      [req.params.id]
    );
    if (!opp) return res.status(404).json({ error: "Not found" });
    res.json({ opportunity: opp });
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  type: z.enum(["scholarship", "work_study", "exchange", "internship", "job"]),
  title: z.string().min(5),
  description: z.string().min(20),
  country: z.string(),
  institution: z.string().optional(),
  field_of_study: z.string().optional(),
  funding_amount: z.number().optional(),
  currency: z.string().optional(),
  eligibility: z.string().optional(),
  application_url: z.string().url().optional(),
  deadline: z.string().optional(),
  sponsors_visa: z.boolean().optional(),
});

opportunitiesRouter.post(
  "/",
  requireAuth,
  requireRole("mentor", "admin", "employer"),
  async (req, res, next) => {
    try {
      const body = createSchema.parse(req.body);
      const opp = await queryOne(
        `INSERT INTO opportunities (posted_by, type, title, description, country, institution,
           field_of_study, funding_amount, currency, eligibility, application_url, deadline, sponsors_visa)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [
          req.user!.sub,
          body.type,
          body.title,
          body.description,
          body.country,
          body.institution,
          body.field_of_study,
          body.funding_amount,
          body.currency,
          body.eligibility,
          body.application_url,
          body.deadline,
          body.sponsors_visa ?? false,
        ]
      );
      res.status(201).json({ opportunity: opp });
    } catch (err) {
      next(err);
    }
  }
);

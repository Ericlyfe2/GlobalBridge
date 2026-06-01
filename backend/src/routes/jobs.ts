import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";

export const jobsRouter = Router();

// Jobs are opportunities of type 'job' or 'internship', joined with employer info.
const JOB_TYPES = `('job','internship')`;

// GET /api/jobs — visa-sponsor-aware job board
jobsRouter.get("/", async (req, res, next) => {
  try {
    const querySchema = z.object({
      search: z.string().optional(),
      country: z.string().optional(),
      type: z.enum(["job", "internship"]).optional(),
      sponsors_visa: z.enum(["true", "false"]).optional(),
    });
    const { search, country, type, sponsors_visa } = querySchema.parse(req.query);
    const filters: string[] = [`o.type IN ${JOB_TYPES}`];
    const values: unknown[] = [];
    let i = 1;

    if (type) {
      filters.push(`o.type = $${i++}`);
      values.push(type);
    }
    if (country) { filters.push(`o.country ILIKE $${i++}`); values.push(`%${country}%`); }
    if (sponsors_visa === "true") { filters.push(`o.sponsors_visa = TRUE`); }
    if (search) {
      filters.push(`(o.title ILIKE $${i} OR o.description ILIKE $${i} OR o.institution ILIKE $${i})`);
      values.push(`%${search}%`);
      i++;
    }

    const jobs = await query(
      `SELECT o.*,
              ep.company_name, ep.industry, ep.company_size,
              ep.sponsors_visas AS employer_sponsors_visas
       FROM opportunities o
       LEFT JOIN employer_profiles ep ON ep.user_id = o.posted_by
       WHERE ${filters.join(" AND ")}
       ORDER BY o.sponsors_visa DESC, o.deadline ASC NULLS LAST, o.created_at DESC
       LIMIT 80`,
      values
    );
    res.set("Cache-Control", "public, max-age=60");
    res.json({ jobs });
  } catch (err) {
    next(err);
  }
});

// GET /api/jobs/sponsors — companies that sponsor visas (sponsorship tracker)
jobsRouter.get("/sponsors", async (req, res, next) => {
  try {
    const { country } = req.query;
    const filters: string[] = ["ep.sponsors_visas = TRUE"];
    const values: unknown[] = [];
    let i = 1;
    if (country) { filters.push(`$${i++} = ANY(ep.visa_sponsorship_countries)`); values.push(country); }

    const sponsors = await query(
      `SELECT ep.user_id, ep.company_name, ep.industry, ep.company_size,
              ep.company_website, ep.visa_sponsorship_countries,
              COUNT(o.id)::int AS open_roles
       FROM employer_profiles ep
       LEFT JOIN opportunities o
         ON o.posted_by = ep.user_id AND o.type IN ('job','internship')
       WHERE ${filters.join(" AND ")}
       GROUP BY ep.user_id, ep.company_name, ep.industry, ep.company_size,
                ep.company_website, ep.visa_sponsorship_countries
       ORDER BY open_roles DESC, ep.company_name ASC
       LIMIT 100`,
      values
    );
    res.json({ sponsors });
  } catch (err) {
    next(err);
  }
});

// GET /api/jobs/:id
jobsRouter.get("/:id", async (req, res, next) => {
  try {
    const job = await queryOne(
      `SELECT o.*,
              ep.company_name, ep.industry, ep.company_size, ep.company_website,
              ep.sponsors_visas AS employer_sponsors_visas, ep.visa_sponsorship_countries
       FROM opportunities o
       LEFT JOIN employer_profiles ep ON ep.user_id = o.posted_by
       WHERE o.id = $1 AND o.type IN ('job','internship')`,
      [req.params.id]
    );
    if (!job) return res.status(404).json({ error: "Job not found" });
    await query(`UPDATE opportunities SET view_count = view_count + 1 WHERE id = $1`, [req.params.id]);
    res.json({ job });
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  type: z.enum(["job", "internship"]),
  title: z.string().min(5),
  description: z.string().min(20),
  country: z.string(),
  institution: z.string().optional(),     // company name on the listing
  field_of_study: z.string().optional(),
  funding_amount: z.number().optional(),  // salary / stipend
  currency: z.string().optional(),
  eligibility: z.string().optional(),
  application_url: z.string().url().optional(),
  deadline: z.string().optional(),
  sponsors_visa: z.boolean().optional(),
});

// POST /api/jobs — employers/admins post a job or internship
jobsRouter.post("/", requireAuth, requireRole("employer", "admin"), async (req, res, next) => {
  try {
    const b = createSchema.parse(req.body);
    const job = await queryOne(
      `INSERT INTO opportunities (posted_by, type, title, description, country, institution,
         field_of_study, funding_amount, currency, eligibility, application_url, deadline, sponsors_visa)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        req.user!.sub,
        b.type,
        b.title,
        b.description,
        b.country,
        b.institution,
        b.field_of_study,
        b.funding_amount,
        b.currency,
        b.eligibility,
        b.application_url,
        b.deadline,
        b.sponsors_visa ?? false,
      ]
    );
    res.status(201).json({ job });
  } catch (err) {
    next(err);
  }
});

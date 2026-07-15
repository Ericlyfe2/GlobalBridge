import "dotenv/config";
import "./env";
import bcrypt from "bcrypt";
import { query, queryOne } from "./db";
import { adminAuth } from "./lib/firebase-admin";

const SUPER_ADMIN_EMAIL = "admin@gmail.com";
const SUPER_ADMIN_PASSWORD = "Admin@12345";
const SUPER_ADMIN_NAME = "Super Administrator";

async function seedSuperAdmin() {
  console.log("Seeding Super Admin account...");

  try {
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM users WHERE email = $1`,
      [SUPER_ADMIN_EMAIL]
    );

    if (existing) {
      const row = await queryOne<{ role: string }>(
        `SELECT role FROM users WHERE id = $1`,
        [existing.id]
      );
      if (row && row.role !== "super_admin") {
        await query(
          `UPDATE users SET role = 'super_admin', verification_status = 'verified', updated_at = NOW() WHERE id = $1`,
          [existing.id]
        );
        console.log("Existing user promoted to super_admin");
      } else {
        console.log("Super Admin already exists");
      }
      return;
    }

    const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);

    const user = await queryOne<{ id: string }>(
      `INSERT INTO users (email, password_hash, full_name, role, verification_status, preferred_language)
       VALUES ($1, $2, $3, 'super_admin', 'verified', 'en')
       RETURNING id`,
      [SUPER_ADMIN_EMAIL, passwordHash, SUPER_ADMIN_NAME]
    );

    if (!user) throw new Error("Failed to create super admin user");

    try {
      const firebaseUser = await adminAuth.createUser({
        email: SUPER_ADMIN_EMAIL,
        password: SUPER_ADMIN_PASSWORD,
        displayName: SUPER_ADMIN_NAME,
        emailVerified: true,
      });
      await adminAuth.setCustomUserClaims(firebaseUser.uid, { role: "super_admin" });

      await query(
        `UPDATE users SET firebase_uid = $1 WHERE id = $2`,
        [firebaseUser.uid, user.id]
      );

      console.log(`Super Admin created with Firebase UID: ${firebaseUser.uid}`);
    } catch (firebaseErr: unknown) {
      const fbErr = firebaseErr as Error;
      if (fbErr.message?.includes("uid")) {
        const firebaseUser = await adminAuth.getUserByEmail(SUPER_ADMIN_EMAIL);
        await query(
          `UPDATE users SET firebase_uid = $1 WHERE id = $2`,
          [firebaseUser.uid, user.id]
        );
        await adminAuth.setCustomUserClaims(firebaseUser.uid, { role: "super_admin" });
        console.log("Linked existing Firebase user to super admin");
      } else {
        console.warn("Firebase user creation skipped (optional):", fbErr.message);
      }
    }

    console.log("Super Admin seeded successfully!");
    console.log(`Email: ${SUPER_ADMIN_EMAIL}`);
    console.log(`Password: ${SUPER_ADMIN_PASSWORD}`);
  } catch (err) {
    console.error("Failed to seed super admin:", err);
    process.exit(1);
  }
}

seedSuperAdmin().then(() => {
  process.exit(0);
});

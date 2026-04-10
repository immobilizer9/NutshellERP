/**
 * Zod schemas for API input validation.
 * Import the schema and call schema.safeParse(body) in route handlers.
 */
import { z } from "zod";

// ── Auth ──────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email:    z.string().email("Invalid email address").max(254),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
});

// ── Content Topics ────────────────────────────────────────────────────────────

export const createTopicSchema = z.object({
  title:        z.string().min(1).max(500).trim(),
  description:  z.string().max(2000).optional().nullable(),
  productType:  z.enum(["ANNUAL", "PAPERBACKS_PLAINS", "PAPERBACKS_HILLS", "ONLINE"]),
  classFrom:    z.number().int().min(1).max(12),
  classTo:      z.number().int().min(1).max(12),
  assignedToId: z.string().uuid(),
  dueDate:      z.string().optional().nullable(),
  bookNumber:   z.number().int().min(1).max(4).optional().nullable(),
  year:         z.number().int().min(2020).max(2100).optional().nullable(),
});

export const patchTopicSchema = z.object({
  id:           z.string().uuid(),
  status:       z.enum(["OPEN", "IN_PROGRESS", "COMPLETED"]).optional(),
  assignedToId: z.string().uuid().optional(),
  title:        z.string().min(1).max(500).trim().optional(),
  description:  z.string().max(2000).optional().nullable(),
  dueDate:      z.string().optional().nullable(),
  bookNumber:   z.number().int().min(1).max(4).optional().nullable(),
  year:         z.number().int().min(2020).max(2100).optional().nullable(),
});

// ── Content Documents ─────────────────────────────────────────────────────────

export const createDocSchema = z.object({
  topicId: z.string().uuid(),
  title:   z.string().min(1).max(500).trim(),
  body:    z.string().max(5_000_000).optional(),
});

export const patchDocSchema = z.object({
  id:                z.string().uuid(),
  action:            z.enum(["submit","approve","reject","send_to_design","publish","resubmit","upload_design"]).optional(),
  title:             z.string().min(1).max(500).trim().optional(),
  docBody:           z.string().max(5_000_000).optional(),
  body:              z.string().max(5_000_000).optional(),
  adminComment:      z.string().max(2000).optional().nullable(),
  designedFileUrl:   z.string().url().optional().nullable(),
  designedFileName:  z.string().max(500).optional().nullable(),
  wordCount:         z.number().int().min(0).optional(),
  charCount:         z.number().int().min(0).optional(),
});

// ── Orders ────────────────────────────────────────────────────────────────────

export const createOrderSchema = z.object({
  schoolId:    z.string().uuid(),
  productType: z.enum(["ANNUAL","PAPERBACKS_PLAINS","PAPERBACKS_HILLS","NUTSHELL_ANNUAL","NUTSHELL_PAPERBACKS"]),
  type:        z.enum(["ORIGINAL","ADDITIONAL"]).optional(),
  items:       z.array(z.object({
    className: z.string().min(1).max(50),
    quantity:  z.number().int().min(1).max(100000),
    mrp:       z.number().min(0),
    unitPrice: z.number().min(0),
  })).min(1, "At least one order item is required"),
  grossAmount: z.number().min(0),
  netAmount:   z.number().min(0),
  schoolEmail: z.string().email().optional().nullable(),
  schoolPhone: z.string().max(20).optional().nullable(),
  address1:    z.string().max(500).optional().nullable(),
  address2:    z.string().max(500).optional().nullable(),
  pincode:     z.string().max(10).optional().nullable(),
  orderDate:   z.string().optional().nullable(),
  pocs:        z.array(z.object({
    role:  z.string().max(100),
    name:  z.string().max(200).optional().nullable(),
    phone: z.string().max(20).optional().nullable(),
    email: z.string().email().optional().nullable(),
  })).optional(),
});

// ── Admin create/update user ──────────────────────────────────────────────────

export const createUserSchema = z.object({
  name:     z.string().min(1).max(200).trim(),
  email:    z.string().email().max(254),
  password: z.string().min(8).max(128),
  roles:    z.array(z.string().min(1)).min(1, "At least one role is required"),
  phone:    z.string().max(20).optional().nullable(),
  managerId:z.string().uuid().optional().nullable(),
});

/**
 * Helper: returns a 400 JSON response with validation errors, or null if valid.
 * Usage:
 *   const err = validateBody(createTopicSchema, body);
 *   if (err) return err;
 */
export function validateBody(schema: z.ZodTypeAny, data: unknown) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((e: any) => `${e.path.join(".")}: ${e.message}`).join("; ");
    return Response.json({ error: `Validation failed: ${errors}` }, { status: 400 });
  }
  return null;
}

import { z } from "zod";

export const memberSchema = z.object({
  full_name: z.string()
    .min(1, "Full name is required")
    .max(200, "Full name must be less than 200 characters")
    .trim(),
  
  father_name: z.string()
    .max(200, "Father's name must be less than 200 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  
  mother_name: z.string()
    .max(200, "Mother's name must be less than 200 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  
  email: z.string()
    .max(255, "Email must be less than 255 characters")
    .trim()
    .optional()
    .or(z.literal(""))
    .transform(val => val === "" ? undefined : val)
    .refine(val => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), "Invalid email address"),
  
  mobile: z.string()
    .max(20, "Mobile number must be less than 20 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  
  nid: z.string()
    .max(50, "NID must be less than 50 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  
  date_of_birth: z.string()
    .optional()
    .or(z.literal(""))
    .transform(val => val === "" ? null : val),
  
  gender: z.enum(["male", "female", "other"])
    .optional()
    .or(z.literal(""))
    .transform(val => val === "" ? null : val),
  
  blood_group: z.string()
    .max(10, "Blood group must be less than 10 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  
  religion: z.string()
    .max(50, "Religion must be less than 50 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  
  nationality: z.string()
    .max(100, "Nationality must be less than 100 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  
  present_address: z.string()
    .max(500, "Present address must be less than 500 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  
  permanent_address: z.string()
    .max(500, "Permanent address must be less than 500 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  
  profession: z.string()
    .max(200, "Profession must be less than 200 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  
  education: z.string()
    .max(200, "Education must be less than 200 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  
  member_type: z.enum(["founding", "general"]),
  
  share_quantity: z.union([
    z.number().int("Share quantity must be a whole number").min(0, "Share quantity cannot be negative").max(1000000, "Share quantity exceeds maximum"),
    z.string().transform((val) => parseInt(val) || 0)
  ]).transform(val => typeof val === 'string' ? parseInt(val) || 0 : val),
  
  form_no: z.string()
    .max(50, "Form number must be less than 50 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  
  nominee_name: z.string()
    .max(200, "Nominee name must be less than 200 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  
  nominee_relation: z.string()
    .max(100, "Nominee relation must be less than 100 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  
  nominee_nid: z.string()
    .max(50, "Nominee NID must be less than 50 characters")
    .trim()
    .optional()
    .or(z.literal("")),
});

export type MemberFormData = z.infer<typeof memberSchema>;
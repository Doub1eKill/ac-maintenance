---
name: zod
description: Schema validation, TypeScript type inference, and form input validation with Zod. Triggers on "zod", "z.object", "z.string", "zod validation", "infer".
---

# Zod Schema Validation Skill Guide

## Overview
Zod is a TypeScript-first schema declaration and validation library with zero dependencies, providing static type inference and runtime safety.

## Patterns & Usage
1. **Defining Schemas**:
```typescript
import { z } from 'zod';

export const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['super_admin', 'org_admin', 'technician']),
  age: z.number().int().positive().optional(),
});

export type UserInput = z.infer<typeof userSchema>;
```

2. **Validation Methods**:
   - `schema.parse(data)`: Parses and returns data or throws `ZodError`.
   - `schema.safeParse(data)`: Returns `{ success: true, data }` or `{ success: false, error }`.

3. **Custom Refinements & Transformations**:
```typescript
const passwordConfirmSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
```

4. **Integration**:
   - Use with `react-hook-form` via `@hookform/resolvers/zod`.
   - Use in Next.js Server Actions / API Route validation handlers.

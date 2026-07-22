<!-- BEGIN:nextjs-agent-rules -->
# Next.js 16 & Architectural Rules for ac-maintenance

## 1. Next.js 16 Proxy Convention
- Next.js 16 deprecated `middleware.ts` in favor of `proxy.ts` (`src/proxy.ts`).
- Route protection logic (`/admin/*` for `org_admin`, `/tech/*` for `technician`) MUST use `src/lib/auth.config.ts`.
- Server Actions & Route Handlers must independently re-validate role/tenant authorization.

## 2. Prisma 7 Database & Driver Adapter
- Prisma 7 requires driver adapter `@prisma/adapter-mariadb` passed into `PrismaClient({ adapter })` in `src/lib/prisma.ts`.
- `datasource.url` in `schema.prisma` is not used at runtime; database URL is loaded via `prisma.config.ts` and `src/lib/prisma.ts`.

## 3. Multi-Tenant Boundary & RBAC
- Tenant boundary is `university_id` (`University` -> `Building` -> `Room` -> `AirConditioner`).
- `super_admin`: Platform-level account (`universityId: null`).
- `org_admin`: Organization-level admin (`/admin/*`).
- `technician`: Field technician (`/tech/*`).

## 4. Auth & User Status
- Null `password` field doubles as "must reset password" flag.
- Accounts with `status !== 'active'` (`pending` or `suspended`) must be blocked from accessing protected routes.
<!-- END:nextjs-agent-rules -->

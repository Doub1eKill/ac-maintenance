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

# Superpowers Skill Primary Framework & Multi-Agent Role Pipeline
- **Primary Framework:** `superpowers` (`C:\Users\LENOVO\.gemini\config\skills\superpowers\skills\using-superpowers\SKILL.md`) MUST be the primary process framework for all requests, ideation, problem solving, bug fixing, task breakdown, and sub-agent coordination.
- **Hierarchy:** Superpowers process skills (`brainstorming`, `systematic-debugging`, `writing-plans`, `executing-plans`, `subagent-driven-development`, `dispatching-parallel-agents`, `test-driven-development`, `verification-before-completion`) take precedence over all domain/secondary skills. Domain-specific skills (e.g., UI styling, Prisma, Next.js) are secondary tools invoked *under* the Superpowers process guidance.

## Multi-Agent Step-by-Step Pipeline (Role Delegation)
Never attempt to execute complex multi-step tasks in a single monolithic action. Always partition work across specialized sub-agent roles:

1. **🧑‍💻 Role 1: Brainstormer & Architect (`superpowers:brainstorming`)**
   - **Task:** Analyzes user prompts/requirements, expands ideas, explores context, and establishes design choices before code modification.
2. **📋 Role 2: Task Planner (`superpowers:writing-plans`)**
   - **Task:** Breaks down the design into clear, bite-sized implementation sub-tasks and identifies parallel execution streams.
3. **👷 Role 3: Parallel Developer Agents (`superpowers:subagent-driven-development` / `superpowers:dispatching-parallel-agents`)**
   - **Task:** Executes sub-tasks concurrently. Dispatches independent Developer sub-agents for non-interdependent files/modules in parallel.
4. **🕵️ Role 4: Code Reviewer Agent (`superpowers:requesting-code-review` / `superpowers:receiving-code-review`)**
   - **Task:** Conducts strict peer code reviews on developer changes, checking for edge cases, RBAC security, and code quality.
5. **✅ Role 5: Empirical Verifier (`superpowers:verification-before-completion`)**
   - **Task:** Runs automated build/test commands and verifies real runtime evidence before delivering final results.

## Automatic Prompt Enhancement & Refinement Rule
- **Prompt Refinement Skill (`prompt-refinement`):** Automatically refines and expands raw, brief, or voice-prompt inputs from the user into high-fidelity, structured master prompts (Role, Context, Objective, Step-by-Step Requirements, Technical Constraints, Acceptance Criteria).
- Combine `prompt-refinement` with `superpowers:brainstorming` to ensure every user idea is transformed into a clear specification before plan execution.





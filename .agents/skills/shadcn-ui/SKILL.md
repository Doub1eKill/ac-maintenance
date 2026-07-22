---
name: shadcn-ui
description: Best practices for installing, configuring, and building UI components with shadcn/ui, Tailwind CSS v4, and Radix UI primitives. Triggers on "shadcn", "shadcn-ui", "components.json", "add component", "radix-ui".
---

# shadcn/ui Skill Guide

## Overview
shadcn/ui provides re-usable components that you can copy and paste into your apps. Accessible, customizable, open source.

## Component Architecture & Conventions
1. **Installation & Setup**:
   - Initialize via CLI: `npx shadcn@latest init`
   - Config file: `components.json`
   - Styles: Tailwind CSS with CSS variables (`globals.css` / `app.css`)
   - Utility helper: `cn()` from `@/lib/utils` combining `clsx` and `tailwind-merge`.

2. **Adding Components**:
   - `npx shadcn@latest add button card dialog dropdown-menu input label select table toast`

3. **Key Components & Usage**:
   - **Button**: Variant (`default`, `destructive`, `outline`, `secondary`, `ghost`, `link`), Size (`default`, `sm`, `lg`, `icon`).
   - **Dialog / Sheet**: Controlled via `open` state and `onOpenChange`.
   - **Form Integration**: Integrates seamlessly with `react-hook-form` and `zod` via `@hookform/resolvers/zod`.
   - **Theme Provider**: Dark/light mode support using `next-themes`.

4. **Best Practices**:
   - Do not edit original primitives directly unless customizing design token styles.
   - Keep components modular, accessible (aria attributes supported out-of-the-box by Radix UI), and typed with TypeScript.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Strict UI Icon Standard (No Emojis Allowed)
- ALWAYS use vector SVG icons from `lucide-react` or clean SVG elements for all UI components, buttons, navigation headers, metric cards, status pills, tables, and modal dialogs.
- NEVER use emojis (e.g. 🛠️, 🏫, 👑, 📋, ❄️, 🧼, 🟡, 🟢, 🔴, 📷) in any user-facing UI component, text label, button, or notification under any circumstances.
- All status indicators and action buttons MUST render clean `lucide-react` icons.

# ReUI Design System Integration
- The primary UI framework for this project is **ReUI** (built on shadcn/ui and Tailwind CSS).
- You MUST review the `.agents/skills/reui-integration/SKILL.md` skill guidelines before designing or modifying UI components.
- Do NOT build custom standard components from scratch. Always fetch or construct components that align with the ReUI registry and aesthetic.

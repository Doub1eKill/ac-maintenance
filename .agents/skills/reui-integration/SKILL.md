---
name: reui-integration
description: Essential guidelines for using the ReUI Design System, including components, styling, and strict icon usage for the AC Maintenance project.
---

# ReUI Integration & Design System Guidelines

You are working on the AC Maintenance system, which strictly uses **ReUI** (built on top of shadcn/ui and Tailwind CSS v4) as its core Design System.

## 1. Component Discovery & Usage
- **ALWAYS** prioritize using ReUI components before attempting to build custom UI elements from scratch.
- If you need a new component (e.g., Data Grid, Event Calendar, Timeline), check the ReUI registry first.
- ReUI components are installed via shadcn CLI or by directly copying the code from `https://mcp.reui.io` / `https://reui.io/components`.
- Do not use generic, unstyled HTML elements for complex UI components.

## 2. Styling Rules (Tailwind CSS v4)
- Maintain the premium, modern aesthetic of ReUI.
- Use `text-slate-900`, `text-slate-500`, etc., for typography to match the existing theme.
- Utilize semantic color tokens where applicable.
- For layouts, prefer CSS Grid and Flexbox with appropriate gaps and padding (`p-4`, `p-6`, `gap-4`).
- Add subtle micro-interactions (`transition-colors`, `hover:bg-slate-50`) to interactive elements.

## 3. Strict UI Icon Standard
- **NEVER** use emojis (e.g. 🛠️, 🏫, 👑, 📋) in any user-facing UI component, text label, button, or notification under any circumstances.
- **ALWAYS** use vector SVG icons from `lucide-react` or clean SVG elements.
- Ensure all icons share consistent sizes and stroke widths (e.g., `h-4 w-4`, `h-5 w-5`) to match ReUI's premium feel.

## 4. MCP Server Workflow
- As Antigravity, if you have access to the ReUI MCP server (`mcp.reui.io`), you can use its tools to search the registry, fetch component APIs, and retrieve installation commands.
- If the ReUI MCP tools are not natively available in your current session, you must manually fetch or construct components that adhere strictly to the ReUI style guidelines.

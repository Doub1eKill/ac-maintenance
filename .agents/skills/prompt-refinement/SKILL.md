---
name: prompt-refinement
description: Converts brief, spoken, or raw user prompts into high-quality, structured, professional AI prompts with clear context, role definitions, technical constraints, and acceptance criteria.
---

# Prompt Refinement & Enhancement Skill

Use this skill whenever the user asks to refine, improve, or structure a prompt, or when raw/spoken user input needs to be expanded into a professional AI specification prompt.

## Workflow

1. **Analyze Raw Input**: Extract the core intent, desired features, domain context, and target stack from the user's message or audio prompt.
2. **Expand & Structure**: Transform the input into an optimized, high-fidelity prompt structured as follows:

```markdown
### 🎯 Refined Master Prompt

**Role & Persona:** [Specialized Agent Role]
**Context:** [Project stack, architecture, relevant files]
**Objective:** [Clear, single sentence goal]

#### 📋 Step-by-Step Requirements
1. [Task 1]
2. [Task 2]
3. [Task 3]

#### 🛡️ Constraints & Standards
- [Tech Stack Constraints]
- [Security & RBAC Boundary]
- [UI/UX & Icon Standards]

#### ✅ Expected Deliverables & Verification
- [Measurable Output 1]
- [Verification Test Command]
```

3. **Present & Confirm**: Present the refined prompt to the user and ask if they would like to execute it immediately or make adjustments.

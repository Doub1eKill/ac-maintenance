---
name: codegraph
description: CodeGraph semantic code intelligence, AST dependency graphing, symbol navigation, impact analysis, and surgical context retrieval. Triggers on "codegraph", "code graph", "AST", "impact analysis", "symbol resolution".
---

# CodeGraph Skill Guide

## Overview
CodeGraph provides high-performance, local semantic code intelligence, AST parsing, symbol indexing, and impact analysis for AI coding agents.

## Core Capabilities
1. **Semantic Code Search & Symbol Indexing**:
   - Locates precise symbol definitions, caller/callee graphs, and cross-file references across TypeScript, JavaScript, Rust, Python, Go, and SQL.
2. **Impact Analysis**:
   - Analyzes potential side effects before modifying core functions or data models.
3. **Surgical Context Retrieval**:
   - Eliminates context window bloat by pulling only relevant type definitions and dependent AST nodes.

## Usage Patterns
- Run symbol queries or impact checks prior to refactoring shared modules or core APIs.
- Trace data flow from Server Actions / API endpoints down to database models.

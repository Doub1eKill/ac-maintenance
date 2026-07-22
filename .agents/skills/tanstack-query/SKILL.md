---
name: tanstack-query
description: Guide and patterns for asynchronous state management, server state fetching, caching, mutation, and optimistic updates using TanStack Query (React Query v5). Triggers on "tanstack query", "react query", "useQuery", "useMutation", "queryClient".
---

# TanStack Query (React Query) Skill Guide

## Overview
TanStack Query provides powerful asynchronous state management, caching, background data synchronization, and optimistic UI updates for Web apps.

## Key Principles & Setup
1. **QueryClient Provider**:
   - Wrap application with `QueryClientProvider` and `QueryClient`.
   - Configure default `staleTime` and `gcTime` (formerly `cacheTime`).

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 mins
      refetchOnWindowFocus: false,
    },
  },
});
```

2. **Fetching Data (`useQuery`)**:
   - Query Keys must be serializable arrays (e.g. `['todos', userId]`).
   - Query Functions must return a Promise.

```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ['maintenance-logs', airConditionerId],
  queryFn: () => fetchLogs(airConditionerId),
});
```

3. **Mutations & Invalidation (`useMutation`)**:
   - Perform side-effects and invalidate query caches upon success.

```tsx
const mutation = useMutation({
  mutationFn: updateStatus,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['maintenance-logs'] });
  },
});
```

4. **Optimistic Updates**:
   - Use `onMutate` to snapshot previous state, set optimistic data, and rollback on error in `onError`.

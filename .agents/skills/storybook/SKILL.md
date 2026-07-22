---
name: storybook
description: Component-driven UI development, isolated story testing, doc generation, and Storybook configuration. Triggers on "storybook", "stories", "Meta", "StoryObj", ".stories.tsx".
---

# Storybook Skill Guide

## Overview
Storybook is a frontend workshop for building UI components and pages in isolation. It streamlines UI development, testing, and documentation.

## Setup & Story Writing
1. **Component Story Format 3 (CSF 3)**:
```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    children: 'Click me',
    variant: 'default',
  },
};

export const Destructive: Story = {
  args: {
    children: 'Delete Item',
    variant: 'destructive',
  },
};
```

2. **Interactivity & Play Functions**:
```tsx
import { userEvent, within, expect } from '@storybook/test';

export const InteractiveTest: Story = {
  args: { label: 'Submit' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');
    await userEvent.click(button);
    await expect(button).toBeInTheDocument();
  },
};
```

3. **Running Storybook**:
   - Dev mode: `npm run storybook`
   - Build static docs: `npm run build-storybook`

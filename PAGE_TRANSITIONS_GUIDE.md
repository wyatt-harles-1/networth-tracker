# Page Transitions Guide

Complete guide for implementing consistent page loading animations across all pages in the app.

---

## Overview

The page transition system provides a consistent 5-phase loading experience across all pages:

1. **Loading State** - Centered spinner while data loads
2. **Empty State** - User-friendly message when no data exists
3. **Page Container** - Fade-in transition for the page
4. **Content Grid** - Cascading card animations with stagger effect
5. **Detail View** - Animated header and content sections

---

## Quick Start

### Basic Page Structure

```tsx
import {
  PageLoading,
  PageEmptyState,
  PageContainer,
  PageHeader,
  GridContainer,
  GridCard,
  ContentSection,
} from '@/components/ui/page-transitions';

function MyPage() {
  const { data, loading } = useMyData();

  // Phase 1: Loading
  if (loading) {
    return <PageLoading message="Loading your data..." />;
  }

  // Phase 2: Empty State
  if (!data || data.length === 0) {
    return (
      <PageEmptyState
        icon={<MyIcon className="w-8 h-8 text-blue-600" />}
        title="No Data Yet"
        description="Get started by adding your first item."
        action={<button>Add Item</button>}
      />
    );
  }

  // Phase 3-5: Main Content
  return (
    <PageContainer>
      <PageHeader
        title="My Page"
        subtitle="Description of what this page does"
      />

      <GridContainer columns={2}>
        {items.map((item, index) => (
          <GridCard key={item.id} index={index} onClick={() => handleClick(item)}>
            {/* Your card content */}
          </GridCard>
        ))}
      </GridContainer>
    </PageContainer>
  );
}
```

---

## Component Reference

### 1. PageLoading

**Purpose:** Phase 1 loading state with spinner

```tsx
<PageLoading message="Loading portfolio..." />
```

**Props:**
- `message?: string` - Optional loading message below spinner

---

### 2. PageEmptyState

**Purpose:** Phase 2 empty state with icon and message

```tsx
<PageEmptyState
  icon={<TrendingUp className="w-8 h-8 text-blue-600" />}
  title="No Holdings Yet"
  description="Start by adding your first investment holding."
  action={<Button>Add Holding</Button>}
/>
```

**Props:**
- `icon: ReactNode` - Icon to display (typically lucide-react icon)
- `title: string` - Main heading
- `description: string` - Explanatory text
- `action?: ReactNode` - Optional call-to-action button

---

### 3. PageContainer

**Purpose:** Phase 3 wrapper with fade transition

```tsx
<PageContainer isTransitioning={isLoading}>
  {/* Your content */}
</PageContainer>
```

**Props:**
- `children: ReactNode` - Page content
- `isTransitioning?: boolean` - Set to true to fade out (default: false)
- `className?: string` - Additional Tailwind classes

**Features:**
- Automatic fade-in on mount (200ms)
- Fade-out when transitioning (200ms)
- Standard padding (p-4 pb-20)

---

### 4. PageHeader

**Purpose:** Consistent page header with optional animation

```tsx
<PageHeader
  title="Portfolio"
  subtitle="Track your investment performance"
  action={<Button>Sync Now</Button>}
  animated={true}
/>
```

**Props:**
- `title: string` - Page title
- `subtitle?: string` - Optional description
- `action?: ReactNode` - Optional action button/component
- `backButton?: ReactNode` - Optional back navigation
- `animated?: boolean` - Enable slide-down animation (default: false)

---

### 5. GridContainer

**Purpose:** Responsive grid layout for cards

```tsx
<GridContainer columns={3}>
  {/* Grid items */}
</GridContainer>
```

**Props:**
- `children: ReactNode` - Grid items (typically GridCard components)
- `columns?: 1 | 2 | 3 | 4` - Number of columns (default: 2)
- `className?: string` - Additional classes

**Responsive Behavior:**
- `columns={1}` - Always 1 column
- `columns={2}` - 1 col mobile, 2 cols desktop (default)
- `columns={3}` - 1 col mobile, 2 cols tablet, 3 cols desktop
- `columns={4}` - 1 col mobile, 2 cols tablet, 4 cols desktop

---

### 6. GridCard

**Purpose:** Phase 3 animated card with cascade effect

```tsx
<GridCard
  index={0}
  onClick={() => handleClick()}
  hover={true}
>
  <div className="flex items-center gap-3">
    <Icon className="w-6 h-6 text-blue-600" />
    <h3 className="font-semibold">Card Title</h3>
  </div>
</GridCard>
```

**Props:**
- `children: ReactNode` - Card content
- `onClick?: () => void` - Click handler
- `index?: number` - Card position for stagger delay (default: 0)
- `className?: string` - Additional classes
- `hover?: boolean` - Enable hover effects (default: true)

**Features:**
- **Fade-in + slide-up animation** (500ms)
- **Stagger delay:** 50ms × index
  - Card 0: 0ms
  - Card 1: 50ms
  - Card 2: 100ms
  - Card 3: 150ms, etc.
- **Hover effects** (when onClick is provided):
  - Border turns blue
  - Shadow expands
  - Scales to 1.02
  - Shimmer effect sweeps across

**Example Timeline:**
```
Card 0: 0ms   → 500ms  ━━━━━━━━━━━━━━
Card 1: 50ms  → 550ms    ━━━━━━━━━━━━━━
Card 2: 100ms → 600ms      ━━━━━━━━━━━━━━
Card 3: 150ms → 650ms        ━━━━━━━━━━━━━━
```

---

### 7. ContentSection

**Purpose:** Phase 5 animated content wrapper

```tsx
<ContentSection delay={100}>
  {/* Your detailed content */}
</ContentSection>
```

**Props:**
- `children: ReactNode` - Content to animate in
- `delay?: number` - Animation delay in ms (default: 100)
- `className?: string` - Additional classes

**Features:**
- Fade-in animation (400ms)
- Slide-up from bottom (16px)
- Configurable delay for sequential reveals

---

### 8. BackButton

**Purpose:** Consistent back navigation

```tsx
import { ArrowLeft } from 'lucide-react';

<BackButton
  onClick={handleBack}
  label="Back to Dashboard"
  icon={<ArrowLeft className="h-4 w-4" />}
/>
```

**Props:**
- `onClick: () => void` - Click handler
- `label?: string` - Button text (default: "Back")
- `icon?: ReactNode` - Optional icon

**Features:**
- Blue text with hover effect
- Gap expands on hover (2px → 12px)
- Smooth transition (200ms)

---

## Usage Examples

### Example 1: Simple Page with Cards

```tsx
import { useState } from 'react';
import {
  PageLoading,
  PageEmptyState,
  PageContainer,
  PageHeader,
  GridContainer,
  GridCard,
} from '@/components/ui/page-transitions';
import { Wallet } from 'lucide-react';

function AccountsPage() {
  const { accounts, loading } = useAccounts();
  const [isTransitioning, setIsTransitioning] = useState(false);

  if (loading) {
    return <PageLoading message="Loading accounts..." />;
  }

  if (accounts.length === 0) {
    return (
      <PageEmptyState
        icon={<Wallet className="w-8 h-8 text-blue-600" />}
        title="No Accounts Yet"
        description="Add your first investment account to get started."
      />
    );
  }

  return (
    <PageContainer isTransitioning={isTransitioning}>
      <PageHeader
        title="Accounts"
        subtitle="Manage your investment accounts"
      />

      <GridContainer columns={2}>
        {accounts.map((account, index) => (
          <GridCard
            key={account.id}
            index={index}
            onClick={() => handleAccountClick(account)}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{account.name}</h3>
                <p className="text-sm text-gray-600">{account.type}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">${account.balance}</p>
              </div>
            </div>
          </GridCard>
        ))}
      </GridContainer>
    </PageContainer>
  );
}
```

---

### Example 2: Page with Grid → Detail View

```tsx
import { useState } from 'react';
import {
  PageLoading,
  PageContainer,
  PageHeader,
  GridContainer,
  GridCard,
  ContentSection,
  BackButton,
} from '@/components/ui/page-transitions';
import { ArrowLeft, TrendingUp } from 'lucide-react';

function AnalyticsPage() {
  const [selectedView, setSelectedView] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { data, loading } = useAnalytics();

  const handleViewSelect = (viewId: string) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedView(viewId);
      setIsTransitioning(false);
    }, 200);
  };

  const handleBack = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedView(null);
      setIsTransitioning(false);
    }, 200);
  };

  if (loading) {
    return <PageLoading />;
  }

  // Grid view
  if (!selectedView) {
    return (
      <PageContainer isTransitioning={isTransitioning}>
        <PageHeader
          title="Analytics"
          subtitle="Choose an analysis view"
        />

        <GridContainer columns={3}>
          {views.map((view, index) => (
            <GridCard
              key={view.id}
              index={index}
              onClick={() => handleViewSelect(view.id)}
            >
              <div className="flex items-center gap-3">
                <view.icon className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="font-semibold">{view.name}</h3>
                  <p className="text-xs text-gray-600">{view.description}</p>
                </div>
              </div>
            </GridCard>
          ))}
        </GridContainer>
      </PageContainer>
    );
  }

  // Detail view
  return (
    <PageContainer isTransitioning={isTransitioning}>
      <PageHeader
        title="Performance Analysis"
        subtitle="Detailed metrics and insights"
        backButton={
          <BackButton
            onClick={handleBack}
            label="Back to Analytics"
            icon={<ArrowLeft className="h-4 w-4" />}
          />
        }
        animated={true}
      />

      <ContentSection delay={100}>
        {/* Your detailed content here */}
        <div className="space-y-6">
          {/* Charts, tables, etc. */}
        </div>
      </ContentSection>
    </PageContainer>
  );
}
```

---

### Example 3: Multi-Step Content Reveal

```tsx
<PageContainer>
  <PageHeader title="Dashboard" subtitle="Overview of your portfolio" />

  {/* First section - immediate */}
  <ContentSection delay={0}>
    <StatsCards />
  </ContentSection>

  {/* Second section - 100ms delay */}
  <ContentSection delay={100}>
    <PerformanceChart />
  </ContentSection>

  {/* Third section - 200ms delay */}
  <ContentSection delay={200}>
    <RecentTransactions />
  </ContentSection>
</PageContainer>
```

---

## Animation Timing Reference

| Element | Animation | Duration | Delay | Total Time |
|---------|-----------|----------|-------|------------|
| Page fade-in | Opacity 0→1 | 200ms | 0ms | 200ms |
| Grid Card 1 | Fade + slide up | 500ms | 0ms | 500ms |
| Grid Card 2 | Fade + slide up | 500ms | 50ms | 550ms |
| Grid Card 3 | Fade + slide up | 500ms | 100ms | 600ms |
| Grid Card 4 | Fade + slide up | 500ms | 150ms | 650ms |
| Header (animated) | Fade + slide down | 300ms | 0ms | 300ms |
| Content Section | Fade + slide up | 400ms | 100ms | 500ms |
| Page transition | Fade out → in | 200ms + 200ms | 0ms | 400ms |

---

## Best Practices

### 1. Always Use Loading State
```tsx
// ✅ Good
if (loading) {
  return <PageLoading message="Loading..." />;
}

// ❌ Bad - No loading state
return (
  <div>
    {loading ? <Spinner /> : <Content />}
  </div>
);
```

### 2. Handle Empty States
```tsx
// ✅ Good
if (data.length === 0) {
  return <PageEmptyState ... />;
}

// ❌ Bad - Just show empty page
return <div>No data</div>;
```

### 3. Use Index for Stagger
```tsx
// ✅ Good - Cards cascade in
{items.map((item, index) => (
  <GridCard key={item.id} index={index}>
    ...
  </GridCard>
))}

// ❌ Bad - All cards animate at once
{items.map((item) => (
  <GridCard key={item.id}>
    ...
  </GridCard>
))}
```

### 4. Coordinate Transitions
```tsx
// ✅ Good - Wait for fade-out before changing content
const handleTransition = () => {
  setIsTransitioning(true);
  setTimeout(() => {
    setContent(newContent);
    setIsTransitioning(false);
  }, 200); // Match fade-out duration
};

// ❌ Bad - Content changes instantly
const handleTransition = () => {
  setContent(newContent);
};
```

### 5. Use ContentSection for Delays
```tsx
// ✅ Good - Staged reveal
<ContentSection delay={0}><Header /></ContentSection>
<ContentSection delay={100}><Main /></ContentSection>
<ContentSection delay={200}><Footer /></ContentSection>

// ❌ Bad - Everything at once
<div>
  <Header />
  <Main />
  <Footer />
</div>
```

---

## Troubleshooting

### Cards Don't Animate
**Problem:** Cards appear instantly without animation

**Solution:** Make sure:
1. Global CSS animations are loaded (`index.css`)
2. `index` prop is passed to GridCard
3. Parent has no conflicting animations

### Animation Feels Jerky
**Problem:** Animations stutter or jump

**Solution:**
1. Ensure `animationFillMode: 'both'` is set
2. Check for conflicting CSS transitions
3. Reduce number of simultaneous animations

### Content Flashes on Load
**Problem:** Content appears briefly before animating

**Solution:**
1. Use `isTransitioning` state properly
2. Ensure PageContainer wraps content
3. Check that loading state is shown first

---

## Migration Checklist

To update an existing page to use these animations:

- [ ] Import page transition components
- [ ] Replace loading div with `<PageLoading />`
- [ ] Replace empty state with `<PageEmptyState />`
- [ ] Wrap content in `<PageContainer>`
- [ ] Replace page title with `<PageHeader>`
- [ ] Convert cards to `<GridCard>` with index prop
- [ ] Wrap card sections in `<GridContainer>`
- [ ] Add `<ContentSection>` for delayed content
- [ ] Implement transition state for view changes
- [ ] Test animations in browser

---

## Summary

These components provide:
- ✅ **Consistent UX** across all pages
- ✅ **Professional animations** with minimal code
- ✅ **Easy to use** - just replace existing elements
- ✅ **Customizable** - props for timing, behavior, styling
- ✅ **Performant** - CSS animations, no JavaScript overhead
- ✅ **Responsive** - works on all screen sizes

Use these components on every page for a polished, unified experience! 🎨✨

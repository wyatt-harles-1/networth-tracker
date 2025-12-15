# Smart Allocation Advisor + AI Insights - Implementation Plan

## Overview
Combining **Smart Allocation Advisor (Option 2)** with **AI-Powered Insights (Option 3)** to create an intelligent, personalized allocation recommendation system.

---

## Feature Set

### 1. Target Allocation System
**User can define their ideal portfolio allocation**

- Pre-built templates:
  - **Conservative** (20% stocks, 50% bonds, 20% cash, 10% other)
  - **Moderate** (60% stocks, 30% bonds, 5% cash, 5% other)
  - **Aggressive** (80% stocks, 15% bonds, 5% other)
  - **Age-Based** (Formula: 110 - age = % stocks, rest in bonds/cash)
  - **Custom** (User sets their own percentages)

- Stored in database per user
- Can edit/update anytime

### 2. AI-Powered Analysis Engine
**Automatically analyzes portfolio and generates insights**

#### Analysis Categories:

**A. Diversification Analysis**
- Concentration risk score (0-100)
- Number of asset classes held
- Herfindahl Index (measures concentration)
- Recommendations:
  - "Your portfolio is 95% in one asset class - high concentration risk"
  - "Well diversified across 6 asset classes"

**B. Risk Profile Assessment**
- Current risk level: Conservative/Moderate/Aggressive
- Based on stock/bond ratio
- Volatility estimate
- Recommendations:
  - "Your 90% stock allocation is aggressive for typical investors"
  - "Consider 70/30 stocks/bonds to reduce volatility by ~20%"

**C. Age-Based Analysis** (if user age available)
- Compare to age-appropriate allocation
- Traditional: (110 - age) = % stocks
- Recommendations:
  - "At age 35, consider 75% stocks vs your current 95%"
  - "Your allocation is appropriate for your age"

**D. Tax Efficiency Analysis**
- Detects suboptimal account placement
- Checks:
  - Bonds in taxable accounts (should be in tax-deferred)
  - Growth stocks in tax-deferred (should be in Roth/taxable)
  - High-dividend stocks in taxable (should be tax-deferred)
- Recommendations:
  - "Move $15k bonds from Taxable to IRA - save ~$450/year in taxes"
  - "Your tax-free accounts hold $0 - consider opening a Roth IRA"

**E. Rebalancing Analysis**
- Calculates drift from target
- Priority levels (High/Medium/Low)
- Dollar amounts needed
- Recommendations:
  - "Buy $5,200 bonds to reach 30% target (currently 18%)"
  - "Sell $3,800 stocks to reduce from 82% to 70%"

**F. Sector Overlap Detection** (future)
- Analyzes sector concentration across holdings
- Recommendations:
  - "40% of your portfolio is in Technology sector - consider diversifying"

### 3. Visual Components

#### A. Stats Dashboard (Always Visible)
```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Diversification  │ Risk Level       │ Drift from       │ Tax Efficiency   │
│     Score        │                  │ Target           │     Score        │
│                  │                  │                  │                  │
│   85/100 ✅      │ Moderate 📊      │ 8.5% 🟡         │  72/100 🟡       │
│   Well mixed     │ 65% stocks       │ Rebal. suggested │ Room to optimize │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

#### B. Target Allocation Setup (Collapsible)
```
┌─────────────────────────────────────────────────────────────────┐
│ 🎯 Set Target Allocation                          [Save Target] │
├─────────────────────────────────────────────────────────────────┤
│ Template: [Conservative] [Moderate ✓] [Aggressive] [Age-Based] │
│           [Custom]                                               │
├─────────────────────────────────────────────────────────────────┤
│ Stocks:     [60%] ████████████░░░░░░░░                          │
│ Bonds:      [30%] ██████░░░░░░░░░░░░░░                          │
│ Cash:       [ 5%] █░░░░░░░░░░░░░░░░░░░                          │
│ Real Estate:[ 5%] █░░░░░░░░░░░░░░░░░░░                          │
│                                              Total: 100% ✓       │
└─────────────────────────────────────────────────────────────────┘
```

#### C. Actual vs Target Comparison
```
┌─────────────────────────────────────────────────────────────────┐
│ 📊 Actual vs Target Allocation                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Asset Class    Target    Actual    Difference    Action        │
│  ────────────────────────────────────────────────────────────── │
│  Stocks         60%       75%       +15% 🔴       Sell $12,500  │
│  Bonds          30%       15%       -15% 🔴       Buy $12,500   │
│  Cash            5%        5%         0% ✅       No change     │
│  Real Estate     5%        5%         0% ✅       No change     │
│                                                                  │
│  [Side-by-side pie charts showing Target vs Actual]            │
└─────────────────────────────────────────────────────────────────┘
```

#### D. AI Recommendations Panel (Toggle ON/OFF)
```
┌─────────────────────────────────────────────────────────────────┐
│ 🤖 AI-Powered Recommendations                   [Toggle: ON ✓] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 🔴 HIGH PRIORITY - Rebalancing Needed                           │
│ Your allocation has drifted 15% from target. Consider          │
│ rebalancing to reduce risk.                                     │
│                                                                  │
│ Actions:                                                         │
│ • Sell $12,500 stocks (reduce from 75% → 60%)                  │
│ • Buy $12,500 bonds (increase from 15% → 30%)                  │
│                                                                  │
│ Expected impact: Reduce volatility by ~18%                     │
│ [Generate Rebalancing Plan]                                     │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ 🟡 MEDIUM PRIORITY - Tax Optimization                           │
│ You have $18,000 bonds in Taxable accounts. Moving to          │
│ Tax-Deferred (IRA/401k) could save ~$540/year in taxes.        │
│                                                                  │
│ Current: Bonds in Taxable account @ 3% yield                   │
│ Optimized: Bonds in IRA, growth stocks in Taxable              │
│ Tax savings: $540/year (assuming 3% rate, 25% tax bracket)     │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ 🟢 LOW PRIORITY - Diversification Opportunity                   │
│ You have no Real Estate exposure. Consider adding REITs         │
│ or real estate funds to diversify.                             │
│                                                                  │
│ Suggested: Allocate 5-10% to VNQ (Vanguard Real Estate ETF)    │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ 💡 INSIGHT - Risk Profile                                       │
│ Your 75% stock allocation is "Moderate-Aggressive". This       │
│ allocation has historically returned 8-10% annually with        │
│ 15-20% volatility.                                              │
│                                                                  │
│ If you moved to your 60/30 target:                              │
│ • Expected return: 7-9% (slightly lower)                        │
│ • Expected volatility: 12-15% (more stable)                     │
│ • Better suited for medium-term goals (5-10 years)              │
└─────────────────────────────────────────────────────────────────┘
```

#### E. Risk Heatmap
```
┌─────────────────────────────────────────────────────────────────┐
│ 🌡️ Risk Assessment                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Volatility Risk        ████████████░░░░░░░░  60/100  Medium    │
│ (Stock-heavy portfolios have higher price swings)               │
│                                                                  │
│ Concentration Risk     ██████░░░░░░░░░░░░░░  30/100  Low       │
│ (Well diversified across asset classes)                         │
│                                                                  │
│ Tax Efficiency         ██████████░░░░░░░░░░  50/100  Medium    │
│ (Some improvements possible with account placement)             │
│                                                                  │
│ Overall Risk Score:    ███████████░░░░░░░░░  55/100  Moderate  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Table: `allocation_targets`
```sql
CREATE TABLE allocation_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  template_name text, -- 'conservative', 'moderate', 'aggressive', 'age_based', 'custom'

  -- Target percentages for each asset class (stored as JSON or individual columns)
  targets jsonb NOT NULL,
  -- Example: {"Stocks": 60, "Bonds": 30, "Cash": 5, "Real Estate": 5}

  rebalance_threshold numeric DEFAULT 5.0, -- Trigger warning at X% drift

  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  UNIQUE(user_id) -- One target allocation per user
);
```

### Table: `allocation_recommendations` (Optional - for tracking)
```sql
CREATE TABLE allocation_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  recommendation_type text NOT NULL, -- 'rebalance', 'tax_optimize', 'diversify', etc.
  priority text NOT NULL, -- 'high', 'medium', 'low'
  title text NOT NULL,
  description text NOT NULL,
  action_items jsonb, -- Specific steps to take

  is_dismissed boolean DEFAULT false,
  dismissed_at timestamptz,

  created_at timestamptz DEFAULT now() NOT NULL
);
```

---

## Implementation Steps

### Phase 1: Database & Data Layer (Step 1-2)
1. ✅ Create migration for `allocation_targets` table
2. ✅ Create migration for `allocation_recommendations` table
3. Create `useAllocationTargets` hook (CRUD operations)
4. Create `useAllocationRecommendations` hook

### Phase 2: Analysis Engine (Step 3-5)
5. Create `allocationAnalysisService.ts`:
   - `calculateDiversificationScore()`
   - `calculateRiskLevel()`
   - `calculateDrift()`
   - `calculateTaxEfficiency()`
   - `generateRecommendations()`

6. Create recommendation generators:
   - `generateRebalanceRecommendations()`
   - `generateTaxOptimizationRecommendations()`
   - `generateDiversificationRecommendations()`
   - `generateRiskRecommendations()`

### Phase 3: UI Components (Step 6-10)
7. Create `AllocationStatsCards.tsx` (4 metric cards)
8. Create `TargetAllocationEditor.tsx` (template picker + sliders)
9. Create `ActualVsTargetChart.tsx` (comparison view)
10. Create `RecommendationsPanel.tsx` (collapsible recommendations)
11. Create `RiskHeatmap.tsx` (risk visualization)
12. Integrate all into `AllocationsView.tsx`

### Phase 4: Polish & Testing (Step 11-12)
13. Add animations/transitions
14. Test all recommendation logic
15. Add user preferences (save dismissed recommendations)

---

## Calculation Formulas

### Diversification Score (0-100)
```typescript
// Using Herfindahl Index (HHI)
// Lower HHI = more diversified
const HHI = assetClasses.reduce((sum, ac) => {
  const percentage = ac.value / totalValue;
  return sum + (percentage * percentage);
}, 0);

// Convert to 0-100 score (inverted so higher = better)
const diversificationScore = Math.round((1 - HHI) * 100);

// With adjustments:
// 90-100: Excellent (5+ classes, no single >30%)
// 70-89: Good (4+ classes, no single >50%)
// 50-69: Fair (3+ classes or one class >60%)
// 0-49: Poor (1-2 classes or one class >80%)
```

### Risk Level
```typescript
const stockPercentage = getAssetClassPercentage('Stocks');

if (stockPercentage >= 80) return 'Aggressive';
if (stockPercentage >= 60) return 'Moderate-Aggressive';
if (stockPercentage >= 40) return 'Moderate';
if (stockPercentage >= 20) return 'Conservative-Moderate';
return 'Conservative';
```

### Drift Calculation
```typescript
const drift = Object.keys(targets).reduce((maxDrift, assetClass) => {
  const targetPct = targets[assetClass];
  const actualPct = getActualPercentage(assetClass);
  const difference = Math.abs(actualPct - targetPct);
  return Math.max(maxDrift, difference);
}, 0);

// Trigger rebalance warning if drift > threshold (default 5%)
const needsRebalance = drift > rebalanceThreshold;
```

### Tax Efficiency Score (0-100)
```typescript
let score = 100;
let penalties = 0;

// Check for bonds in taxable accounts (penalty: -20 per $10k)
const bondsInTaxable = getBondsInTaxableAccounts();
penalties += (bondsInTaxable / 10000) * 20;

// Check for growth stocks in tax-deferred (penalty: -10 per $10k)
const growthInDeferred = getGrowthStocksInTaxDeferred();
penalties += (growthInDeferred / 10000) * 10;

// Check for unused tax-advantaged space (penalty: -15)
if (taxFreeAccountsTotal === 0) penalties += 15;

const taxEfficiencyScore = Math.max(0, Math.min(100, score - penalties));
```

---

## Color Coding

- 🔴 **Red/High Priority**: Immediate action needed (drift >10%, high risk)
- 🟡 **Yellow/Medium Priority**: Should address soon (drift 5-10%, tax savings available)
- 🟢 **Green/Low Priority**: Nice to have (small optimizations)
- 🔵 **Blue/Info**: Educational insights, no action needed

---

## User Settings (Optional Future)

```typescript
interface AllocationSettings {
  age?: number; // For age-based recommendations
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
  investmentHorizon?: 'short' | 'medium' | 'long'; // <5yr, 5-10yr, >10yr
  autoRebalanceNotifications?: boolean;
  taxBracket?: number; // For tax savings estimates
}
```

---

## Next Steps

1. **Review this plan** - Any changes/additions?
2. **Implement Phase 1** - Database tables and hooks
3. **Implement Phase 2** - Analysis engine and recommendation logic
4. **Implement Phase 3** - UI components
5. **Test and iterate**

---

**Estimated Time:**
- Phase 1: 1-2 hours
- Phase 2: 3-4 hours
- Phase 3: 4-5 hours
- Phase 4: 1-2 hours
**Total: ~10-13 hours**

Ready to start implementation?

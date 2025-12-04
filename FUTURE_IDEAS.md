# NetWorth Tracker - Future Ideas & Enhancements

This document tracks potential features and improvements for future development.

---

## 🏆 TOP 5 PRIORITY FEATURES (Best ROI for Portfolio)

### 1. Dark Mode 🌙
**Status:** Not Started
**Priority:** HIGH
**Estimated Effort:** 2-3 hours

**Description:**
- Toggle between light/dark themes
- Persist user preference
- Smooth theme transitions

**Benefits:**
- Easy win, looks professional
- Modern UX expectation
- next-themes library already installed

**Implementation Notes:**
- Use existing next-themes package
- Update tailwind config for dark mode classes
- Add theme toggle in settings

---

### 2. Export Portfolio Reports 📄
**Status:** Not Started
**Priority:** HIGH
**Estimated Effort:** 4-6 hours

**Description:**
- Generate PDF reports (monthly/quarterly/yearly)
- Include charts, performance metrics, tax summaries
- Downloadable and shareable

**Benefits:**
- Tangible value for users
- Shows PDF generation skills
- Great for demos
- Professional feature

**Implementation Notes:**
- Use react-pdf or jsPDF
- Include chart snapshots
- Add date range selector

**Libraries:**
- react-pdf or jsPDF
- recharts for chart rendering

---

### 3. Dividend Tracking Dashboard 💰
**Status:** Not Started
**Priority:** HIGH
**Estimated Effort:** 3-4 hours

**Description:**
- Dedicated dividend income tracking page
- Show yield, payment dates, projections
- Monthly/yearly dividend income charts
- Dividend calendar

**Benefits:**
- Data already exists in database
- Just needs visualization
- Valuable for income-focused investors

**Implementation Notes:**
- Create new Dividends page
- Chart dividend income over time
- Calculate yield percentages
- Upcoming dividend calendar

---

### 4. Benchmark Comparison 📈
**Status:** Not Started
**Priority:** HIGH
**Estimated Effort:** 4-6 hours

**Description:**
- Compare portfolio performance to S&P 500, NASDAQ, or custom indices
- Show "alpha" (outperformance/underperformance)
- Overlay benchmark on performance chart

**Benefits:**
- Professional feature
- Shows data analysis skills
- Helps users understand relative performance

**Implementation Notes:**
- Fetch S&P 500 historical data
- Calculate relative performance
- Add benchmark overlay to charts
- Show alpha/beta metrics

**APIs:**
- Alpha Vantage for index data
- Yahoo Finance (free)

---

### 5. Tax Loss Harvesting Suggestions 💡
**Status:** Not Started
**Priority:** MEDIUM
**Estimated Effort:** 6-8 hours

**Description:**
- Identify positions with losses for tax optimization
- Show potential tax savings
- Suggest wash sale avoidance
- Year-end tax planning

**Benefits:**
- Demonstrates domain knowledge
- Complex business logic
- Great interview topic: "Tell me about a complex feature you built"

**Implementation Notes:**
- Calculate unrealized losses
- Identify positions eligible for tax loss harvesting
- Consider wash sale rules (30-day window)
- Calculate tax savings based on user's bracket

---

## 📊 Data & Analytics

### Background Price Sync Jobs (Phase 3) 🚀
**Status:** Not Started
**Priority:** Low (Nice to have for large portfolios)
**Estimated Effort:** 6-8 hours
**Prerequisite:** Phase 1 & 2 already implemented ✅

**Description:**
- Move price sync to background server jobs (Supabase Edge Functions)
- Sync continues even if user closes browser
- Store job progress in database for persistent state
- Real-time progress polling (every 2-3 seconds)
- Handle large portfolios (100+ symbols) without timeouts
- Job queue system to process multiple syncs
- Browser and email notifications when complete

**Benefits:**
- No browser dependency - sync runs on server
- Can handle hours-long syncs for large portfolios
- Resume capability if interrupted
- Better reliability - no network interruptions
- Full audit trail of all sync operations
- Enable scheduled daily/weekly automatic syncs
- Professional enterprise-grade feature
- Great talking point: "I built a distributed job queue system"

**Implementation Notes:**
1. **Database Schema:**
   ```sql
   CREATE TABLE sync_jobs (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES auth.users(id),
     account_id UUID,
     status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
     total_symbols INT,
     processed_symbols INT,
     current_symbol TEXT,
     progress_percent INT,
     prices_added INT,
     started_at TIMESTAMP DEFAULT NOW(),
     completed_at TIMESTAMP,
     error_message TEXT,
     metadata JSONB
   );
   ```

2. **Supabase Edge Function:**
   - Create `supabase/functions/sync-prices/index.ts`
   - Accept `{ userId, accountId, jobId }` payload
   - Update job status in real-time as sync progresses
   - Use HistoricalPriceService.smartSync() with progress callbacks
   - Handle errors and update job status accordingly

3. **Frontend Job Management:**
   - `startSyncJob()` - Create job record, invoke edge function
   - `pollJobProgress()` - Check database every 2-3 seconds
   - `cancelJob()` - Set status to 'cancelled'
   - Job history UI to view past syncs

4. **Notifications:**
   - Service Worker for push notifications
   - Browser Notification API when sync completes
   - Optional: Email via Supabase (Resend integration)

5. **Job Queue (Advanced):**
   - Process jobs one at a time per user
   - Priority queue (manual > scheduled)
   - Retry failed jobs with exponential backoff

**Architecture:**
```
User clicks "Sync Prices"
    ↓
Create job record in database (status: pending)
    ↓
Invoke Edge Function with jobId
    ↓
Edge Function updates status to 'running'
    ↓
For each symbol:
    - Fetch prices
    - Update job progress in database
    - Frontend polls and shows progress
    ↓
Complete: Update status to 'completed'
    ↓
Send notification to user
```

**When to Implement:**
- Portfolio grows to 50+ symbols (> 10 minutes to sync)
- Users request scheduled daily syncs
- Expanding to commercial product
- Need to sync overnight without keeping browser open
- Want job history and audit trail

**Cost Considerations:**
- Edge Function invocations: ~$0.002 per sync
- Database storage: Minimal (~1KB per job)
- Worth it for large portfolios, overkill for small ones

**Interview Talking Points:**
- "Distributed system design with job queues"
- "Asynchronous background processing"
- "Real-time progress updates via database polling"
- "Scalable architecture for handling long-running operations"
- "Graceful error handling and retry logic"

---

### Intraday Price Updates (1D Timespan)
**Status:** On Hold
**Priority:** Medium
**Estimated Effort:** 6-8 hours

**Description:**
- Add 15-minute intraday price updates for the 1D timespan only
- Store rolling 24-hour window of intraday data
- Auto-delete data older than 24 hours
- Continue using daily closing prices for all other timespans (1W, 1M, etc.)

**Benefits:**
- See real-time portfolio movements throughout the day
- Minimal storage impact (~150-200 records)
- Good portfolio piece to demonstrate data lifecycle management
- Shows understanding of hybrid data storage strategies

**Implementation Notes:**
- Use free API: Finnhub or Yahoo Finance
- Only fetch during market hours (9:30am-4pm ET)
- Background job to cleanup old intraday data
- Add auto-refresh every 15 minutes

**Considerations:**
- API rate limits
- Battery usage on mobile
- Not critical for manual portfolio tracking

---

### Multi-Currency Support 🌍
**Status:** Not Started
**Priority:** Low
**Estimated Effort:** 6-8 hours

**Description:**
- Track international holdings in their native currency
- Show portfolio value in preferred currency
- Real-time exchange rate conversion

**Benefits:**
- Shows internationalization skills
- Useful for international investors
- Currency conversion logic

**Implementation Notes:**
- Add currency field to holdings/accounts
- Fetch exchange rates (free API)
- Convert all values to base currency
- Allow user to set preferred display currency

---

### What-If Scenarios 🔮
**Status:** Not Started
**Priority:** Medium
**Estimated Effort:** 6-8 hours

**Description:**
- "What if I invest $500/month for 10 years?"
- Compound interest calculator
- Retirement planning projections
- Goal achievement timeline

**Benefits:**
- Planning tool
- Shows calculation/projection skills
- Interactive and engaging

**Implementation Notes:**
- Create scenario builder UI
- Calculate compound returns
- Chart future projections
- Compare multiple scenarios

---

## 📈 Portfolio Features

### Portfolio Rebalancing Recommendations ⚖️
**Status:** Not Started
**Priority:** Medium
**Estimated Effort:** 8-10 hours

**Description:**
- Show when asset allocation drifts from target
- Suggest which positions to buy/sell to rebalance
- Calculate optimal trade amounts
- Minimize tax impact

**Benefits:**
- Shows algorithmic thinking
- Complex optimization problem
- Practical value

**Implementation Notes:**
- Let users set target allocation percentages
- Calculate current vs target drift
- Suggest rebalancing trades
- Consider tax implications

---

### Goal Tracking 🎯
**Status:** Not Started
**Priority:** Medium
**Estimated Effort:** 6-8 hours

**Description:**
- Set financial goals ("Save $50k by 2026", "Retire with $2M")
- Visual progress tracking
- Projection: "At current rate, you'll reach goal by..."
- Milestone celebrations

**Benefits:**
- Motivational feature
- Goal-based investing
- Progress visualization

**Implementation Notes:**
- Add goals table to database
- Calculate progress based on historical growth
- Project future balance
- Show multiple goals simultaneously

---

### Account Notes/Tags 🏷️
**Status:** Not Started
**Priority:** Low
**Estimated Effort:** 2-3 hours

**Description:**
- Add notes to accounts ("401k from previous employer")
- Tag accounts by goal ("Retirement", "House Down Payment", "Emergency Fund")
- Filter/group accounts by tags

**Benefits:**
- Better organization
- Context for accounts
- Simple but useful

**Implementation Notes:**
- Add notes and tags columns to accounts table
- Create tag management UI
- Filter accounts by tags

---

## 🎨 UI/UX Improvements

### Onboarding Flow 👋
**Status:** Not Started
**Priority:** Medium
**Estimated Effort:** 4-6 hours

**Description:**
- Welcome screen for new users
- Guided tour of features
- Sample data to explore
- Quick setup wizard

**Benefits:**
- Better first impression
- Reduces learning curve
- Professional touch

**Implementation Notes:**
- Create onboarding component
- Use react-joyride or similar
- Add sample data generator
- Skip button for experienced users

---

### Loading Skeletons ⏳
**Status:** Not Started
**Priority:** Low
**Estimated Effort:** 3-4 hours

**Description:**
- Smooth loading states instead of spinners
- Skeleton screens that match content layout
- Perceived performance improvement

**Benefits:**
- Modern UX pattern
- Better user experience
- Professional polish

**Implementation Notes:**
- Create skeleton components
- Replace spinners with skeletons
- Match actual content layout

---

### Empty States 📭
**Status:** Not Started
**Priority:** Low
**Estimated Effort:** 2-3 hours

**Description:**
- Better messaging when no data exists
- Suggestions for next steps
- Helpful illustrations/icons

**Benefits:**
- Guides new users
- Better UX
- Professional polish

**Implementation Notes:**
- Create empty state components
- Add helpful messaging
- Include call-to-action buttons

---

### Keyboard Shortcuts ⌨️
**Status:** Not Started
**Priority:** Low
**Estimated Effort:** 3-4 hours

**Description:**
- Quick add transaction (Ctrl+T)
- Navigate between pages (Ctrl+1-5)
- Search (Ctrl+K)
- Command palette

**Benefits:**
- Power user feature
- Shows attention to UX
- Improves efficiency

**Implementation Notes:**
- Use react-hotkeys-hook
- Create keyboard shortcut modal (press ? to show)
- Add command palette

---

### Accessibility (a11y) ♿
**Status:** Not Started
**Priority:** Medium
**Estimated Effort:** 6-8 hours

**Description:**
- Screen reader support
- Keyboard navigation
- ARIA labels
- Color contrast compliance
- Focus management

**Benefits:**
- Shows you care about all users
- Professional standard
- WCAG compliance

**Implementation Notes:**
- Audit with axe DevTools
- Add ARIA labels
- Test with screen reader
- Ensure keyboard navigation works

---

## 📱 Mobile Experience

### Offline Mode Improvements 📶
**Status:** Not Started
**Priority:** Medium
**Estimated Effort:** 4-6 hours

**Description:**
- Show offline indicator
- Queue actions when offline
- Sync when connection restored
- Conflict resolution

**Benefits:**
- Better mobile experience
- Shows understanding of offline-first
- PWA best practice

**Implementation Notes:**
- Detect online/offline state
- Queue mutations in IndexedDB
- Sync on reconnect
- Handle conflicts gracefully

---

### Mobile Gestures 📲
**Status:** Not Started
**Priority:** Low
**Estimated Effort:** 3-4 hours

**Description:**
- Swipe to delete transactions
- Pull to refresh
- Swipe between tabs
- Long press for actions

**Benefits:**
- Native app feel
- Better mobile UX
- Touch-optimized

**Implementation Notes:**
- Use react-swipeable or similar
- Add haptic feedback
- Smooth animations

---

## 🔧 Technical Improvements

### Data Import/Export 📥📤
**Status:** Not Started
**Priority:** Medium
**Estimated Effort:** 4-6 hours

**Description:**
- Import transactions from CSV
- Export portfolio to CSV/Excel
- Backup/restore functionality
- Bulk import

**Benefits:**
- Data portability
- Shows file handling skills
- Useful for users

**Implementation Notes:**
- CSV parsing library (papaparse)
- Excel export (xlsx)
- Validate imported data
- Handle errors gracefully

---

### Transaction Search/Filter 🔍
**Status:** Not Started
**Priority:** Medium
**Estimated Effort:** 3-4 hours

**Description:**
- Search by symbol, date range, amount
- Advanced filtering
- Save filter presets
- Full-text search

**Benefits:**
- Better data navigation
- Useful as transaction count grows
- Search implementation

**Implementation Notes:**
- Add search UI component
- Filter transactions client-side
- Consider server-side search for large datasets
- Debounce search input

---

### Undo/Redo for Transactions ↩️↪️
**Status:** Not Started
**Priority:** Low
**Estimated Effort:** 2-3 hours

**Description:**
- Quick undo for accidental deletions
- Redo capability
- Undo history

**Benefits:**
- Better UX
- Foundation already exists (undoRedoService.ts)
- Error recovery

**Implementation Notes:**
- Use existing undoRedoService
- Add UI notifications
- Keyboard shortcuts (Ctrl+Z, Ctrl+Y)

---

### API for Third-Party Access 🔌
**Status:** Not Started
**Priority:** Low
**Estimated Effort:** 10-12 hours

**Description:**
- Build REST API
- OAuth authentication
- Rate limiting
- API documentation

**Benefits:**
- Shows backend API design skills
- Enables integrations
- Portfolio piece

**Implementation Notes:**
- Create API routes
- Implement OAuth 2.0
- Add rate limiting middleware
- Generate OpenAPI docs
- Supabase RLS for security

---

## 🤖 Automation

### Recurring Transactions 🔄
**Status:** Not Started
**Priority:** Medium
**Estimated Effort:** 4-6 hours

**Description:**
- Set up automatic monthly investments
- Auto-create dividend transactions
- Recurring deposits/withdrawals
- Schedule one-time future transactions

**Benefits:**
- Shows automation skills
- Scheduled jobs
- Practical value

**Implementation Notes:**
- Add recurring transaction template table
- Create background job/cron
- Use Supabase Edge Functions or Vercel Cron
- Email confirmations

---

### Notifications/Alerts 🔔
**Status:** Not Started
**Priority:** Medium
**Estimated Effort:** 6-8 hours

**Description:**
- Price alerts ("notify when AAPL hits $150")
- Portfolio milestone alerts ("You hit $100k!")
- Dividend payment reminders
- Rebalancing suggestions

**Benefits:**
- Real-time features
- Push notifications
- Engagement

**Implementation Notes:**
- Use Web Push API (PWA)
- Store alert rules in database
- Background job to check conditions
- Email fallback

---

### Auto-Categorization 🏷️
**Status:** Not Started
**Priority:** Low
**Estimated Effort:** 4-6 hours

**Description:**
- Automatically categorize transactions
- Learn from past categorization
- Suggest categories for new transactions

**Benefits:**
- ML/AI application
- Reduces manual work
- Pattern recognition

**Implementation Notes:**
- Simple rule-based system first
- ML model later (optional)
- User can override and train

---

## 📊 Reporting

### Budget vs Actual Spending 📊
**Status:** Not Started
**Priority:** Medium
**Estimated Effort:** 8-10 hours

**Description:**
- Set monthly budgets by category
- Track spending against budgets
- Variance analysis
- Budget alerts

**Benefits:**
- Extends beyond investments
- Personal finance feature
- Budgeting logic

**Implementation Notes:**
- Add budget table
- Create budget UI
- Track spending by category
- Visual budget vs actual charts

---

### Tax Summary Report 📝
**Status:** Not Started
**Priority:** Medium
**Estimated Effort:** 6-8 hours

**Description:**
- Generate year-end tax summary
- Capital gains/losses by lot
- Dividend income summary
- Export to tax software format

**Benefits:**
- Practical value
- Tax calculation logic
- Shows domain expertise

**Implementation Notes:**
- Calculate short-term vs long-term gains
- Group by tax year
- Export to TurboTax/CSV format
- Include wash sale adjustments

---

### Performance Attribution 📊
**Status:** Not Started
**Priority:** Low
**Estimated Effort:** 6-8 hours

**Description:**
- Break down returns by asset class, sector, holding
- Show what contributed to gains/losses
- Time-weighted return calculation

**Benefits:**
- Advanced analytics
- Investment analysis
- Professional feature

**Implementation Notes:**
- Calculate contribution of each position
- Sector/asset class grouping
- Visual breakdown charts

---

## 🌐 Integrations

### Plaid Integration 🏦
**Status:** Not Started
**Priority:** Low
**Estimated Effort:** 12-15 hours

**Description:**
- Connect bank/brokerage accounts
- Auto-sync transactions
- Balance updates

**Benefits:**
- Professional feature
- Shows API integration skills
- Real-world use case

**Considerations:**
- Plaid costs money after development
- Complex authentication
- Data privacy concerns

**Implementation Notes:**
- Plaid SDK
- Store access tokens securely
- Scheduled sync jobs
- Transaction matching logic

---

### AI Portfolio Insights 🤖
**Status:** Not Started
**Priority:** Medium
**Estimated Effort:** 6-8 hours

**Description:**
- Natural language portfolio analysis using AI
- "Your portfolio is heavily weighted in tech stocks"
- Personalized recommendations
- Chat with your portfolio data

**Benefits:**
- Hot topic - AI integration
- Shows you can integrate modern APIs
- Engaging feature

**Implementation Notes:**
- OpenAI API integration
- Send portfolio data as context
- Prompt engineering
- Cost management (cache responses)

**APIs:**
- OpenAI GPT-4
- Anthropic Claude
- Google Gemini

---

### Social Features 👥
**Status:** Not Started
**Priority:** Low
**Estimated Effort:** 10-12 hours

**Description:**
- Share portfolio performance (anonymously)
- Compare to other users (aggregated)
- Leaderboards
- Community insights

**Benefits:**
- Shows social mechanics understanding
- Gamification
- User engagement

**Considerations:**
- Privacy concerns
- Moderation needed
- Complex feature

**Implementation Notes:**
- Anonymous performance sharing
- Aggregate statistics only
- Leaderboards by return %
- Opt-in only

---

## 🔐 Security & Privacy

### Two-Factor Authentication 🔐
**Status:** Not Started
**Priority:** Low
**Estimated Effort:** 4-6 hours

**Description:**
- Add 2FA for login
- TOTP support (Google Authenticator)
- Backup codes

**Benefits:**
- Security best practice
- Shows auth knowledge
- User protection

**Implementation Notes:**
- Supabase supports 2FA
- Configure in Supabase Auth
- Add UI for enrollment
- Generate backup codes

---

### Data Encryption at Rest 🔒
**Status:** Not Started
**Priority:** Low
**Estimated Effort:** 6-8 hours

**Description:**
- Encrypt sensitive data in database
- End-to-end encryption
- User-controlled encryption keys

**Benefits:**
- Privacy-focused
- Security knowledge
- Compliance ready

**Considerations:**
- Performance impact
- Key management complexity
- Can't query encrypted fields

---

## 📝 Notes

### Priority Definitions:
- **HIGH**: Great for portfolio, quick wins, high impact
- **MEDIUM**: Nice to have, moderate effort/impact
- **LOW**: Polish features, niche use cases

### Effort Estimates:
- Based on assuming existing codebase knowledge
- May vary based on unfamiliarity with specific libraries
- Includes testing and debugging time

### Implementation Order Suggestion:
1. Start with TOP 5 PRIORITY features
2. Then pick from HIGH priority items
3. Add MEDIUM priority as time allows
4. LOW priority for polish before release

---

**Last Updated:** 2025-01-30

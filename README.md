# NetWorth Tracker

A modern, mobile-first personal finance application for tracking net worth, investments, and financial goals.

## 🚀 Features

- **Portfolio Management**: Track stocks, ETFs, crypto, and other investments
- **Account Reconciliation**: Sync with bank statements and investment accounts
- **Real-time Pricing**: Live price updates for stocks and cryptocurrencies
- **Transaction Tracking**: Comprehensive transaction history with categorization
- **Insights & Analytics**: Performance metrics and portfolio analysis
- **Mobile-First Design**: Optimized for mobile devices with responsive UI

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Library**: shadcn/ui, Tailwind CSS, Radix UI
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **State Management**: React Context + Custom Hooks
- **Charts**: Recharts
- **Icons**: Lucide React

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Alpha Vantage API key (for stock prices)

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd networth-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase credentials and API keys in `.env.local`

4. **Set up Supabase**
   - Create a new Supabase project
   - Run the migrations in `supabase/migrations/`
   - Copy your project URL and anon key to `.env.local`

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173`

## 🏗 Project Structure

```
src/
├── components/          # React components
│   ├── features/        # Feature-specific components
│   ├── layout/          # Layout components (navigation, etc.)
│   ├── shared/          # Reusable components
│   └── ui/              # shadcn/ui primitives
├── contexts/            # React contexts
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions and configurations
├── services/            # Business logic and API calls
├── types/               # TypeScript type definitions
└── __tests__/           # Test files
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run test` - Run tests
- `npm run type-check` - Run TypeScript type checking

## 🗄 Database Schema

The application uses Supabase (PostgreSQL) with the following main tables:

- `profiles` - User profiles and preferences
- `accounts` - Financial accounts (checking, savings, investment, etc.)
- `holdings` - Investment holdings (stocks, ETFs, crypto)
- `transactions` - Financial transactions
- `portfolio_snapshots` - Historical portfolio values
- `asset_classes` - Investment categories
- `dividends` - Dividend tracking

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |
| `VITE_ALPHA_VANTAGE_API_KEY` | Alpha Vantage API key for stock prices | Yes |

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Netlify

1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify dashboard

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Development Guidelines

- Use TypeScript for all new code
- Follow the existing component structure
- Write tests for new features
- Use conventional commit messages
- Ensure mobile responsiveness

## 🐛 Troubleshooting

### Common Issues

1. **Supabase connection errors**
   - Verify your environment variables
   - Check if your Supabase project is active
   - Ensure RLS policies are properly configured

2. **Price data not loading**
   - Verify your Alpha Vantage API key
   - Check API rate limits
   - Ensure symbols are valid

3. **Build errors**
   - Run `npm run type-check` to identify TypeScript errors
   - Ensure all dependencies are installed
   - Check for missing environment variables

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the component library
- [Supabase](https://supabase.com/) for the backend infrastructure
- [Alpha Vantage](https://www.alphavantage.co/) for financial data

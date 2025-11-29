# Ticker Directory Setup Guide

## Problem
The ticker autocomplete search isn't working because the `ticker_directory` table doesn't exist in your Supabase database.

## Solution

### Step 1: Create the ticker_directory table in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/lsofddhvayrwtcwrztkh
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the entire contents of this file:
   ```
   supabase/migrations/20251020200000_create_ticker_directory.sql
   ```
5. Click "Run" to execute the SQL

This will create:
- The `ticker_directory` table for storing ticker symbols
- The `ticker_directory_updates` table for tracking updates
- Proper indexes for fast search
- RLS (Row Level Security) policies

### Step 2: Seed the table with common tickers

After the table is created, you can seed it with common tickers using one of these methods:

#### Option A: Using Browser Console (Recommended - Quick Start)

1. Open your app in the browser (http://localhost:5173)
2. Open the browser console (F12 or Right-click → Inspect → Console)
3. Type this command and press Enter:
   ```javascript
   setupTickerDirectory()
   ```
4. Wait for the success message

This will add ~50 common stocks, ETFs, and cryptocurrencies.

#### Option B: Using the TickerDirectoryService

If you want to populate the full directory with thousands of tickers:

1. Make sure you have the Alpha Vantage API key in your `.env` file (already configured)
2. Open browser console
3. Run:
   ```javascript
   import { TickerDirectoryService } from './src/services/tickerDirectoryService';
   await TickerDirectoryService.seedInitialData();
   ```

Note: This will take several minutes and may hit API rate limits.

### Step 3: Test the autocomplete

1. Navigate to the Transactions page
2. Click "Add Transaction"
3. Start typing a ticker symbol like "AAP" in the ticker field
4. You should now see autocomplete suggestions appear!

## How It Works

The ticker autocomplete:
1. Searches the `ticker_directory` table as you type
2. Shows matching results instantly
3. Falls back to Yahoo Finance API validation if a ticker isn't in the directory
4. Automatically adds validated tickers to the directory for future searches

## Troubleshooting

### "Error inserting tickers"
- Make sure you ran Step 1 to create the table first
- Check that you're logged into the app (RLS policies require authentication)

### "Permission denied"
- The RLS policies allow all authenticated users to read/write
- Make sure you're logged in to the app

### Still no suggestions?
- Open browser console and check for errors
- Try running `setupTickerDirectory()` again
- Verify the table was created in Supabase Dashboard → Database → Tables

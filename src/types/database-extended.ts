/**
 * Extended Database Types
 *
 * This file contains type definitions for tables that are missing from the
 * auto-generated database.ts file. These should be merged into database.ts
 * when types are regenerated from the database schema.
 */

export interface AccountBalanceHistory {
  Row: {
    id: string
    user_id: string
    account_id: string
    snapshot_date: string
    balance: number
    holdings_value: number
    total_cost_basis: number
    unrealized_gain: number
    realized_gain: number
    transaction_count: number
    holdings_count: number
    created_at: string
  }
  Insert: {
    id?: string
    user_id: string
    account_id: string
    snapshot_date: string
    balance?: number
    holdings_value?: number
    total_cost_basis?: number
    unrealized_gain?: number
    realized_gain?: number
    transaction_count?: number
    holdings_count?: number
    created_at?: string
  }
  Update: {
    id?: string
    user_id?: string
    account_id?: string
    snapshot_date?: string
    balance?: number
    holdings_value?: number
    total_cost_basis?: number
    unrealized_gain?: number
    realized_gain?: number
    transaction_count?: number
    holdings_count?: number
    created_at?: string
  }
}

export interface AssetClasses {
  Row: {
    id: string
    user_id: string
    name: string
    color: string
    is_visible: boolean
    display_order: number
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    user_id: string
    name: string
    color?: string
    is_visible?: boolean
    display_order?: number
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    user_id?: string
    name?: string
    color?: string
    is_visible?: boolean
    display_order?: number
    created_at?: string
    updated_at?: string
  }
}

export interface Dividends {
  Row: {
    id: string
    user_id: string
    holding_id: string | null
    symbol: string
    ex_date: string
    pay_date: string
    amount: number
    status: string
    created_at: string
  }
  Insert: {
    id?: string
    user_id: string
    holding_id?: string | null
    symbol: string
    ex_date: string
    pay_date: string
    amount: number
    status?: string
    created_at?: string
  }
  Update: {
    id?: string
    user_id?: string
    holding_id?: string | null
    symbol?: string
    ex_date?: string
    pay_date?: string
    amount?: number
    status?: string
    created_at?: string
  }
}

export interface MarketValueSnapshots {
  Row: {
    id: string
    user_id: string
    snapshot_datetime: string
    total_value: number
    ticker_prices: Record<string, any>
    created_at: string
  }
  Insert: {
    id?: string
    user_id: string
    snapshot_datetime: string
    total_value: number
    ticker_prices?: Record<string, any>
    created_at?: string
  }
  Update: {
    id?: string
    user_id?: string
    snapshot_datetime?: string
    total_value?: number
    ticker_prices?: Record<string, any>
    created_at?: string
  }
}

export interface ParsedTrades {
  Row: {
    id: string
    import_id: string
    user_id: string
    symbol: string
    action: string
    shares: number | null
    price: number | null
    amount: number
    trade_date: string
    account_name: string | null
    confidence_score: number
    validation_status: string
    validation_errors: any[]
    raw_text_snippet: string | null
    is_selected: boolean
    created_at: string
  }
  Insert: {
    id?: string
    import_id: string
    user_id: string
    symbol: string
    action: string
    shares?: number | null
    price?: number | null
    amount: number
    trade_date: string
    account_name?: string | null
    confidence_score?: number
    validation_status?: string
    validation_errors?: any[]
    raw_text_snippet?: string | null
    is_selected?: boolean
    created_at?: string
  }
  Update: {
    id?: string
    import_id?: string
    user_id?: string
    symbol?: string
    action?: string
    shares?: number | null
    price?: number | null
    amount?: number
    trade_date?: string
    account_name?: string | null
    confidence_score?: number
    validation_status?: string
    validation_errors?: any[]
    raw_text_snippet?: string | null
    is_selected?: boolean
    created_at?: string
  }
}

export interface PortfolioCalculationJobs {
  Row: {
    id: string
    user_id: string
    start_date: string
    end_date: string
    job_status: string
    progress_percentage: number
    days_calculated: number
    days_failed: number
    error_message: string | null
    started_at: string | null
    completed_at: string | null
    created_at: string
  }
  Insert: {
    id?: string
    user_id: string
    start_date: string
    end_date: string
    job_status?: string
    progress_percentage?: number
    days_calculated?: number
    days_failed?: number
    error_message?: string | null
    started_at?: string | null
    completed_at?: string | null
    created_at?: string
  }
  Update: {
    id?: string
    user_id?: string
    start_date?: string
    end_date?: string
    job_status?: string
    progress_percentage?: number
    days_calculated?: number
    days_failed?: number
    error_message?: string | null
    started_at?: string | null
    completed_at?: string | null
    created_at?: string
  }
}

export interface PortfolioSnapshots {
  Row: {
    id: string
    user_id: string
    snapshot_date: string
    total_assets: number
    total_liabilities: number
    net_worth: number
    asset_class_breakdown: Record<string, any>
    created_at: string
  }
  Insert: {
    id?: string
    user_id: string
    snapshot_date: string
    total_assets?: number
    total_liabilities?: number
    net_worth?: number
    asset_class_breakdown?: Record<string, any>
    created_at?: string
  }
  Update: {
    id?: string
    user_id?: string
    snapshot_date?: string
    total_assets?: number
    total_liabilities?: number
    net_worth?: number
    asset_class_breakdown?: Record<string, any>
    created_at?: string
  }
}

export interface PortfolioValueHistory {
  Row: {
    id: string
    user_id: string
    value_date: string
    total_value: number
    total_cost_basis: number
    cash_value: number
    invested_value: number
    unrealized_gain: number
    realized_gain: number
    asset_class_breakdown: Record<string, any>
    ticker_breakdown: Record<string, any>
    account_breakdown: Record<string, any>
    calculation_method: string
    data_quality_score: number
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    user_id: string
    value_date: string
    total_value?: number
    total_cost_basis?: number
    cash_value?: number
    invested_value?: number
    unrealized_gain?: number
    realized_gain?: number
    asset_class_breakdown?: Record<string, any>
    ticker_breakdown?: Record<string, any>
    account_breakdown?: Record<string, any>
    calculation_method?: string
    data_quality_score?: number
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    user_id?: string
    value_date?: string
    total_value?: number
    total_cost_basis?: number
    cash_value?: number
    invested_value?: number
    unrealized_gain?: number
    realized_gain?: number
    asset_class_breakdown?: Record<string, any>
    ticker_breakdown?: Record<string, any>
    account_breakdown?: Record<string, any>
    calculation_method?: string
    data_quality_score?: number
    created_at?: string
    updated_at?: string
  }
}

export interface StatementImports {
  Row: {
    id: string
    user_id: string
    filename: string
    file_type: string
    file_path: string
    file_size: number
    broker_name: string | null
    status: string
    uploaded_at: string
    processed_at: string | null
    validation_summary: Record<string, any>
    error_message: string | null
    trade_count: number
    created_at: string
  }
  Insert: {
    id?: string
    user_id: string
    filename: string
    file_type: string
    file_path: string
    file_size: number
    broker_name?: string | null
    status?: string
    uploaded_at?: string
    processed_at?: string | null
    validation_summary?: Record<string, any>
    error_message?: string | null
    trade_count?: number
    created_at?: string
  }
  Update: {
    id?: string
    user_id?: string
    filename?: string
    file_type?: string
    file_path?: string
    file_size?: number
    broker_name?: string | null
    status?: string
    uploaded_at?: string
    processed_at?: string | null
    validation_summary?: Record<string, any>
    error_message?: string | null
    trade_count?: number
    created_at?: string
  }
}

export interface AllocationTargets {
  Row: {
    id: string
    user_id: string
    template_name: string | null
    targets: Record<string, number>
    rebalance_threshold: number
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    user_id: string
    template_name?: string | null
    targets: Record<string, number>
    rebalance_threshold?: number
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    user_id?: string
    template_name?: string | null
    targets?: Record<string, number>
    rebalance_threshold?: number
    created_at?: string
    updated_at?: string
  }
}

export interface AllocationRecommendations {
  Row: {
    id: string
    user_id: string
    recommendation_type: 'rebalance' | 'tax_optimize' | 'diversify' | 'risk_adjustment' | 'insight'
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    action_items: any[] | null
    expected_impact: string | null
    is_dismissed: boolean
    dismissed_at: string | null
    created_at: string
  }
  Insert: {
    id?: string
    user_id: string
    recommendation_type: 'rebalance' | 'tax_optimize' | 'diversify' | 'risk_adjustment' | 'insight'
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    action_items?: any[] | null
    expected_impact?: string | null
    is_dismissed?: boolean
    dismissed_at?: string | null
    created_at?: string
  }
  Update: {
    id?: string
    user_id?: string
    recommendation_type?: 'rebalance' | 'tax_optimize' | 'diversify' | 'risk_adjustment' | 'insight'
    priority?: 'high' | 'medium' | 'low'
    title?: string
    description?: string
    action_items?: any[] | null
    expected_impact?: string | null
    is_dismissed?: boolean
    dismissed_at?: string | null
    created_at?: string
  }
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      account_balance_history: {
        Row: {
          account_id: string
          asset_type_breakdown: Json
          balance: number
          created_at: string
          holdings_count: number
          holdings_value: number
          id: string
          realized_gain: number
          snapshot_date: string
          total_cost_basis: number
          transaction_count: number
          unrealized_gain: number
          user_id: string
        }
        Insert: {
          account_id: string
          asset_type_breakdown?: Json
          balance?: number
          created_at?: string
          holdings_count?: number
          holdings_value?: number
          id?: string
          realized_gain?: number
          snapshot_date: string
          total_cost_basis?: number
          transaction_count?: number
          unrealized_gain?: number
          user_id: string
        }
        Update: {
          account_id?: string
          asset_type_breakdown?: Json
          balance?: number
          created_at?: string
          holdings_count?: number
          holdings_value?: number
          id?: string
          realized_gain?: number
          snapshot_date?: string
          total_cost_basis?: number
          transaction_count?: number
          unrealized_gain?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_balance_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          account_number_last4: string | null
          account_type: string
          asset_class_id: string | null
          category: string
          created_at: string
          current_balance: number
          icon: string
          id: string
          institution: string | null
          is_visible: boolean
          name: string
          notes: string | null
          tax_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number_last4?: string | null
          account_type: string
          asset_class_id?: string | null
          category: string
          created_at?: string
          current_balance?: number
          icon?: string
          id?: string
          institution?: string | null
          is_visible?: boolean
          name: string
          notes?: string | null
          tax_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number_last4?: string | null
          account_type?: string
          asset_class_id?: string | null
          category?: string
          created_at?: string
          current_balance?: number
          icon?: string
          id?: string
          institution?: string | null
          is_visible?: boolean
          name?: string
          notes?: string | null
          tax_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_asset_class_id_fkey"
            columns: ["asset_class_id"]
            isOneToOne: false
            referencedRelation: "asset_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      allocation_recommendations: {
        Row: {
          action_items: Json | null
          created_at: string
          description: string
          dismissed_at: string | null
          expected_impact: string | null
          id: string
          is_dismissed: boolean
          priority: string
          recommendation_type: string
          title: string
          user_id: string
        }
        Insert: {
          action_items?: Json | null
          created_at?: string
          description: string
          dismissed_at?: string | null
          expected_impact?: string | null
          id?: string
          is_dismissed?: boolean
          priority: string
          recommendation_type: string
          title: string
          user_id: string
        }
        Update: {
          action_items?: Json | null
          created_at?: string
          description?: string
          dismissed_at?: string | null
          expected_impact?: string | null
          id?: string
          is_dismissed?: boolean
          priority?: string
          recommendation_type?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      allocation_targets: {
        Row: {
          created_at: string
          id: string
          rebalance_threshold: number
          targets: Json
          template_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rebalance_threshold?: number
          targets: Json
          template_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rebalance_threshold?: number
          targets?: Json
          template_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      asset_classes: {
        Row: {
          color: string
          created_at: string
          display_order: number
          id: string
          is_visible: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dividends: {
        Row: {
          amount: number
          created_at: string
          ex_date: string
          holding_id: string | null
          id: string
          pay_date: string
          status: string
          symbol: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          ex_date: string
          holding_id?: string | null
          id?: string
          pay_date: string
          status?: string
          symbol: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          ex_date?: string
          holding_id?: string | null
          id?: string
          pay_date?: string
          status?: string
          symbol?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dividends_holding_id_fkey"
            columns: ["holding_id"]
            isOneToOne: false
            referencedRelation: "holdings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dividends_holding_id_fkey"
            columns: ["holding_id"]
            isOneToOne: false
            referencedRelation: "user_holdings_with_sector"
            referencedColumns: ["id"]
          },
        ]
      }
      holding_lots: {
        Row: {
          account_id: string
          cost_per_share: number
          created_at: string
          holding_id: string | null
          id: string
          lot_status: string
          purchase_date: string
          quantity: number
          quantity_remaining: number
          symbol: string
          total_cost: number
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          cost_per_share?: number
          created_at?: string
          holding_id?: string | null
          id?: string
          lot_status?: string
          purchase_date: string
          quantity?: number
          quantity_remaining?: number
          symbol: string
          total_cost?: number
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          cost_per_share?: number
          created_at?: string
          holding_id?: string | null
          id?: string
          lot_status?: string
          purchase_date?: string
          quantity?: number
          quantity_remaining?: number
          symbol?: string
          total_cost?: number
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holding_lots_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holding_lots_holding_id_fkey"
            columns: ["holding_id"]
            isOneToOne: false
            referencedRelation: "holdings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holding_lots_holding_id_fkey"
            columns: ["holding_id"]
            isOneToOne: false
            referencedRelation: "user_holdings_with_sector"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holding_lots_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      holdings: {
        Row: {
          account_id: string
          asset_type: string
          cost_basis: number
          created_at: string
          current_price: number
          current_value: number
          id: string
          last_price_update: string | null
          name: string
          purchase_date: string | null
          quantity: number
          sector_override: string | null
          symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          asset_type?: string
          cost_basis?: number
          created_at?: string
          current_price?: number
          current_value?: number
          id?: string
          last_price_update?: string | null
          name: string
          purchase_date?: string | null
          quantity?: number
          sector_override?: string | null
          symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          asset_type?: string
          cost_basis?: number
          created_at?: string
          current_price?: number
          current_value?: number
          id?: string
          last_price_update?: string | null
          name?: string
          purchase_date?: string | null
          quantity?: number
          sector_override?: string | null
          symbol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holdings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      market_value_snapshots: {
        Row: {
          created_at: string
          id: string
          snapshot_datetime: string
          ticker_prices: Json
          total_value: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          snapshot_datetime: string
          ticker_prices?: Json
          total_value: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          snapshot_datetime?: string
          ticker_prices?: Json
          total_value?: number
          user_id?: string
        }
        Relationships: []
      }
      parsed_trades: {
        Row: {
          account_name: string | null
          action: string
          amount: number
          confidence_score: number
          created_at: string
          id: string
          import_id: string
          is_selected: boolean
          price: number | null
          raw_text_snippet: string | null
          shares: number | null
          symbol: string
          trade_date: string
          user_id: string
          validation_errors: Json
          validation_status: string
        }
        Insert: {
          account_name?: string | null
          action: string
          amount: number
          confidence_score?: number
          created_at?: string
          id?: string
          import_id: string
          is_selected?: boolean
          price?: number | null
          raw_text_snippet?: string | null
          shares?: number | null
          symbol: string
          trade_date: string
          user_id: string
          validation_errors?: Json
          validation_status?: string
        }
        Update: {
          account_name?: string | null
          action?: string
          amount?: number
          confidence_score?: number
          created_at?: string
          id?: string
          import_id?: string
          is_selected?: boolean
          price?: number | null
          raw_text_snippet?: string | null
          shares?: number | null
          symbol?: string
          trade_date?: string
          user_id?: string
          validation_errors?: Json
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "parsed_trades_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "statement_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_calculation_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          days_calculated: number
          days_failed: number
          end_date: string
          error_message: string | null
          id: string
          job_status: string
          progress_percentage: number
          start_date: string
          started_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          days_calculated?: number
          days_failed?: number
          end_date: string
          error_message?: string | null
          id?: string
          job_status?: string
          progress_percentage?: number
          start_date: string
          started_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          days_calculated?: number
          days_failed?: number
          end_date?: string
          error_message?: string | null
          id?: string
          job_status?: string
          progress_percentage?: number
          start_date?: string
          started_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      portfolio_snapshots: {
        Row: {
          asset_class_breakdown: Json
          created_at: string
          id: string
          net_worth: number
          snapshot_date: string
          total_assets: number
          total_liabilities: number
          user_id: string
        }
        Insert: {
          asset_class_breakdown?: Json
          created_at?: string
          id?: string
          net_worth?: number
          snapshot_date: string
          total_assets?: number
          total_liabilities?: number
          user_id: string
        }
        Update: {
          asset_class_breakdown?: Json
          created_at?: string
          id?: string
          net_worth?: number
          snapshot_date?: string
          total_assets?: number
          total_liabilities?: number
          user_id?: string
        }
        Relationships: []
      }
      portfolio_value_history: {
        Row: {
          account_breakdown: Json
          asset_class_breakdown: Json
          calculation_method: string
          cash_value: number
          created_at: string
          data_quality_score: number
          id: string
          invested_value: number
          realized_gain: number
          ticker_breakdown: Json
          total_cost_basis: number
          total_value: number
          unrealized_gain: number
          updated_at: string
          user_id: string
          value_date: string
        }
        Insert: {
          account_breakdown?: Json
          asset_class_breakdown?: Json
          calculation_method?: string
          cash_value?: number
          created_at?: string
          data_quality_score?: number
          id?: string
          invested_value?: number
          realized_gain?: number
          ticker_breakdown?: Json
          total_cost_basis?: number
          total_value?: number
          unrealized_gain?: number
          updated_at?: string
          user_id: string
          value_date: string
        }
        Update: {
          account_breakdown?: Json
          asset_class_breakdown?: Json
          calculation_method?: string
          cash_value?: number
          created_at?: string
          data_quality_score?: number
          id?: string
          invested_value?: number
          realized_gain?: number
          ticker_breakdown?: Json
          total_cost_basis?: number
          total_value?: number
          unrealized_gain?: number
          updated_at?: string
          user_id?: string
          value_date?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          close_price: number
          created_at: string
          data_source: string
          high_price: number | null
          id: string
          low_price: number | null
          open_price: number | null
          price_date: string
          symbol: string
          volume: number | null
        }
        Insert: {
          close_price: number
          created_at?: string
          data_source?: string
          high_price?: number | null
          id?: string
          low_price?: number | null
          open_price?: number | null
          price_date: string
          symbol: string
          volume?: number | null
        }
        Update: {
          close_price?: number
          created_at?: string
          data_source?: string
          high_price?: number | null
          id?: string
          low_price?: number | null
          open_price?: number | null
          price_date?: string
          symbol?: string
          volume?: number | null
        }
        Relationships: []
      }
      price_update_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          job_status: string
          started_at: string | null
          symbols: string[]
          symbols_updated: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_status?: string
          started_at?: string | null
          symbols: string[]
          symbols_updated?: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_status?: string
          started_at?: string | null
          symbols?: string[]
          symbols_updated?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          currency: string
          date_of_birth: string | null
          expected_monthly_contribution: number | null
          full_name: string | null
          id: string
          retirement_goal_amount: number | null
          retirement_target_age: number | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          date_of_birth?: string | null
          expected_monthly_contribution?: number | null
          full_name?: string | null
          id: string
          retirement_goal_amount?: number | null
          retirement_target_age?: number | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          date_of_birth?: string | null
          expected_monthly_contribution?: number | null
          full_name?: string | null
          id?: string
          retirement_goal_amount?: number | null
          retirement_target_age?: number | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      statement_imports: {
        Row: {
          broker_name: string | null
          created_at: string
          error_message: string | null
          file_path: string
          file_size: number
          file_type: string
          filename: string
          id: string
          processed_at: string | null
          status: string
          trade_count: number
          uploaded_at: string
          user_id: string
          validation_summary: Json
        }
        Insert: {
          broker_name?: string | null
          created_at?: string
          error_message?: string | null
          file_path: string
          file_size: number
          file_type: string
          filename: string
          id?: string
          processed_at?: string | null
          status?: string
          trade_count?: number
          uploaded_at?: string
          user_id: string
          validation_summary?: Json
        }
        Update: {
          broker_name?: string | null
          created_at?: string
          error_message?: string | null
          file_path?: string
          file_size?: number
          file_type?: string
          filename?: string
          id?: string
          processed_at?: string | null
          status?: string
          trade_count?: number
          uploaded_at?: string
          user_id?: string
          validation_summary?: Json
        }
        Relationships: []
      }
      ticker_directory: {
        Row: {
          asset_type: string
          cache_ttl_minutes: number | null
          created_at: string
          data_source: string
          exchange: string | null
          fetch_count: number | null
          industry: string | null
          is_active: boolean
          last_fetched_at: string | null
          last_updated: string
          name: string
          sector: string | null
          symbol: string
          yahoo_data: Json | null
        }
        Insert: {
          asset_type: string
          cache_ttl_minutes?: number | null
          created_at?: string
          data_source: string
          exchange?: string | null
          fetch_count?: number | null
          industry?: string | null
          is_active?: boolean
          last_fetched_at?: string | null
          last_updated?: string
          name: string
          sector?: string | null
          symbol: string
          yahoo_data?: Json | null
        }
        Update: {
          asset_type?: string
          cache_ttl_minutes?: number | null
          created_at?: string
          data_source?: string
          exchange?: string | null
          fetch_count?: number | null
          industry?: string | null
          is_active?: boolean
          last_fetched_at?: string | null
          last_updated?: string
          name?: string
          sector?: string | null
          symbol?: string
          yahoo_data?: Json | null
        }
        Relationships: []
      }
      ticker_directory_updates: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          job_status: string
          started_at: string | null
          tickers_added: number
          tickers_updated: number
          update_type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_status?: string
          started_at?: string | null
          tickers_added?: number
          tickers_updated?: number
          update_type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_status?: string
          started_at?: string | null
          tickers_added?: number
          tickers_updated?: number
          update_type?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          category: string | null
          created_at: string
          data_source: string
          description: string
          external_transaction_id: string | null
          from_account_id: string | null
          id: string
          is_reviewed: boolean
          notes: string | null
          price_per_share: number | null
          shares: number | null
          symbol: string | null
          to_account_id: string | null
          transaction_date: string
          transaction_metadata: Json | null
          transaction_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category?: string | null
          created_at?: string
          data_source?: string
          description: string
          external_transaction_id?: string | null
          from_account_id?: string | null
          id?: string
          is_reviewed?: boolean
          notes?: string | null
          price_per_share?: number | null
          shares?: number | null
          symbol?: string | null
          to_account_id?: string | null
          transaction_date: string
          transaction_metadata?: Json | null
          transaction_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category?: string | null
          created_at?: string
          data_source?: string
          description?: string
          external_transaction_id?: string | null
          from_account_id?: string | null
          id?: string
          is_reviewed?: boolean
          notes?: string | null
          price_per_share?: number | null
          shares?: number | null
          symbol?: string | null
          to_account_id?: string | null
          transaction_date?: string
          transaction_metadata?: Json | null
          transaction_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      stale_ticker_cache: {
        Row: {
          cache_age: unknown
          cache_ttl_minutes: number | null
          fetch_count: number | null
          last_fetched_at: string | null
          name: string | null
          symbol: string | null
        }
        Insert: {
          cache_age?: never
          cache_ttl_minutes?: number | null
          fetch_count?: number | null
          last_fetched_at?: string | null
          name?: string | null
          symbol?: string | null
        }
        Update: {
          cache_age?: never
          cache_ttl_minutes?: number | null
          fetch_count?: number | null
          last_fetched_at?: string | null
          name?: string | null
          symbol?: string | null
        }
        Relationships: []
      }
      user_holdings_with_sector: {
        Row: {
          account_id: string | null
          asset_type: string | null
          cost_basis: number | null
          created_at: string | null
          current_price: number | null
          current_value: number | null
          effective_sector: string | null
          exchange: string | null
          id: string | null
          industry: string | null
          last_price_update: string | null
          name: string | null
          purchase_date: string | null
          quantity: number | null
          sector_override: string | null
          symbol: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "holdings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_account_snapshot: {
        Args: {
          p_account_id: string
          p_snapshot_date?: string
          p_user_id: string
        }
        Returns: undefined
      }
      create_default_asset_classes: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      detect_asset_type: { Args: { ticker_symbol: string }; Returns: string }
      get_cached_ticker_data: { Args: { p_symbol: string }; Returns: Json }
      get_holdings_with_tax_info: {
        Args: { p_user_id: string }
        Returns: {
          account_tax_type: string
          cost_basis: number
          current_value: number
          effective_sector: string
          holding_id: string
          holding_period_days: number
          is_long_term: boolean
          name: string
          purchase_date: string
          quantity: number
          symbol: string
          unrealized_gain: number
          unrealized_gain_percent: number
        }[]
      }
      get_tax_vehicle_breakdown: {
        Args: { p_user_id: string }
        Returns: {
          account_count: number
          tax_type: string
          total_value: number
        }[]
      }
      is_ticker_cache_valid: {
        Args: { p_max_age_minutes?: number; p_symbol: string }
        Returns: boolean
      }
      update_ticker_cache: {
        Args: {
          p_asset_type?: string
          p_exchange?: string
          p_industry?: string
          p_name?: string
          p_sector?: string
          p_symbol: string
          p_yahoo_data: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      tax_treatment: "taxable" | "tax_deferred" | "tax_free"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      tax_treatment: ["taxable", "tax_deferred", "tax_free"],
    },
  },
} as const

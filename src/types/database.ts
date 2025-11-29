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
  public: {
    Tables: {
      accounts: {
        Row: {
          account_number_last4: string | null
          account_type: string
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
        Relationships: []
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
      ticker_directory: {
        Row: {
          asset_type: string
          created_at: string
          data_source: string
          exchange: string | null
          industry: string | null
          is_active: boolean
          last_updated: string
          name: string
          sector: string | null
          symbol: string
        }
        Insert: {
          asset_type: string
          created_at?: string
          data_source: string
          exchange?: string | null
          industry?: string | null
          is_active?: boolean
          last_updated?: string
          name: string
          sector?: string | null
          symbol: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          data_source?: string
          exchange?: string | null
          industry?: string | null
          is_active?: boolean
          last_updated?: string
          name?: string
          sector?: string | null
          symbol?: string
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
  public: {
    Enums: {
      tax_treatment: ["taxable", "tax_deferred", "tax_free"],
    },
  },
} as const

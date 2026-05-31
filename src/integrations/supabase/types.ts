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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ad_watches: {
        Row: {
          country: string | null
          created_at: string
          id: string
          ip: string | null
          postback_id: string | null
          provider: string
          reward_usd: number
          user_agent: string | null
          user_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          postback_id?: string | null
          provider: string
          reward_usd: number
          user_agent?: string | null
          user_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          postback_id?: string | null
          provider?: string
          reward_usd?: number
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          daily_ad_cap: number
          daily_bonus_base_usd: number
          estimated_cpm_usd: number
          fallback_offerwall_enabled: boolean
          fallback_offerwall_name: string
          fallback_offerwall_url: string
          id: number
          max_postback_reward_usd: number
          min_withdraw_usd: number
          referral_percent: number
          revenue_share_percent: number
          reward_per_ad_usd: number
          updated_at: string
        }
        Insert: {
          daily_ad_cap?: number
          daily_bonus_base_usd?: number
          estimated_cpm_usd?: number
          fallback_offerwall_enabled?: boolean
          fallback_offerwall_name?: string
          fallback_offerwall_url?: string
          id?: number
          max_postback_reward_usd?: number
          min_withdraw_usd?: number
          referral_percent?: number
          revenue_share_percent?: number
          reward_per_ad_usd?: number
          updated_at?: string
        }
        Update: {
          daily_ad_cap?: number
          daily_bonus_base_usd?: number
          estimated_cpm_usd?: number
          fallback_offerwall_enabled?: boolean
          fallback_offerwall_name?: string
          fallback_offerwall_url?: string
          id?: number
          max_postback_reward_usd?: number
          min_withdraw_usd?: number
          referral_percent?: number
          revenue_share_percent?: number
          reward_per_ad_usd?: number
          updated_at?: string
        }
        Relationships: []
      }
      balances: {
        Row: {
          balance_usd: number
          lifetime_earned_usd: number
          pending_withdraw_usd: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_usd?: number
          lifetime_earned_usd?: number
          pending_withdraw_usd?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_usd?: number
          lifetime_earned_usd?: number
          pending_withdraw_usd?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_bonus_claims: {
        Row: {
          amount_usd: number
          claim_date: string
          created_at: string
          streak_day: number
          user_id: string
        }
        Insert: {
          amount_usd: number
          claim_date?: string
          created_at?: string
          streak_day?: number
          user_id: string
        }
        Update: {
          amount_usd?: number
          claim_date?: string
          created_at?: string
          streak_day?: number
          user_id?: string
        }
        Relationships: []
      }
      fraud_logs: {
        Row: {
          created_at: string
          details: Json | null
          event: string
          id: string
          ip: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event: string
          id?: string
          ip?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event?: string
          id?: string
          ip?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ban_reason: string | null
          country: string | null
          created_at: string
          id: string
          is_banned: boolean
          language: string
          referral_code: string
          referred_by: string | null
          signup_ip: string | null
          telegram_id: number | null
          telegram_username: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          ban_reason?: string | null
          country?: string | null
          created_at?: string
          id: string
          is_banned?: boolean
          language?: string
          referral_code?: string
          referred_by?: string | null
          signup_ip?: string | null
          telegram_id?: number | null
          telegram_username?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          ban_reason?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_banned?: boolean
          language?: string
          referral_code?: string
          referred_by?: string | null
          signup_ip?: string | null
          telegram_id?: number | null
          telegram_username?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          commission_earned_usd: number
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          commission_earned_usd?: number
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          commission_earned_usd?: number
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          admin_note: string | null
          amount_usd: number
          created_at: string
          destination: string
          id: string
          method: Database["public"]["Enums"]["withdrawal_method"]
          status: Database["public"]["Enums"]["withdrawal_status"]
          txid: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount_usd: number
          created_at?: string
          destination: string
          id?: string
          method: Database["public"]["Enums"]["withdrawal_method"]
          status?: Database["public"]["Enums"]["withdrawal_status"]
          txid?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount_usd?: number
          created_at?: string
          destination?: string
          id?: string
          method?: Database["public"]["Enums"]["withdrawal_method"]
          status?: Database["public"]["Enums"]["withdrawal_status"]
          txid?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      withdrawal_method: "usdt_trc20" | "binance_pay" | "faucetpay"
      withdrawal_status: "pending" | "approved" | "rejected" | "paid"
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
      app_role: ["admin", "user"],
      withdrawal_method: ["usdt_trc20", "binance_pay", "faucetpay"],
      withdrawal_status: ["pending", "approved", "rejected", "paid"],
    },
  },
} as const

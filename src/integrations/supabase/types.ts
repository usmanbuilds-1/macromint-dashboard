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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: number
          metadata: Json
          new_state: string | null
          previous_state: string | null
          reason: string | null
          target_user_id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: never
          metadata?: Json
          new_state?: string | null
          previous_state?: string | null
          reason?: string | null
          target_user_id: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: never
          metadata?: Json
          new_state?: string | null
          previous_state?: string | null
          reason?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_scan_attempt_budgets: {
        Row: {
          attempts: number
          scope: string
          user_id: string
          window_start: string
        }
        Insert: {
          attempts: number
          scope: string
          user_id: string
          window_start: string
        }
        Update: {
          attempts?: number
          scope?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: number
          maintenance_message: string | null
          maintenance_mode: boolean
          max_daily_rewarded_ads: number
          reward_access_hours: number
          scanning_enabled: boolean
          trial_days: number
          updated_at: string
        }
        Insert: {
          id?: number
          maintenance_message?: string | null
          maintenance_mode?: boolean
          max_daily_rewarded_ads?: number
          reward_access_hours?: number
          scanning_enabled?: boolean
          trial_days?: number
          updated_at?: string
        }
        Update: {
          id?: number
          maintenance_message?: string | null
          maintenance_mode?: boolean
          max_daily_rewarded_ads?: number
          reward_access_hours?: number
          scanning_enabled?: boolean
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      beta_invite_redemptions: {
        Row: {
          id: string
          invite_id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          id?: string
          invite_id: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          id?: string
          invite_id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beta_invite_redemptions_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "beta_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_invites: {
        Row: {
          code_hash: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          max_uses: number
          note: string | null
          revoked_at: string | null
          used_count: number
        }
        Insert: {
          code_hash: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          max_uses?: number
          note?: string | null
          revoked_at?: string | null
          used_count?: number
        }
        Update: {
          code_hash?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          max_uses?: number
          note?: string | null
          revoked_at?: string | null
          used_count?: number
        }
        Relationships: []
      }
      beta_reactivation_requests: {
        Row: {
          approved_days: number | null
          created_at: string
          id: string
          message: string
          owner_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          approved_days?: number | null
          created_at?: string
          id?: string
          message?: string
          owner_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          approved_days?: number | null
          created_at?: string
          id?: string
          message?: string
          owner_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      diary_entries: {
        Row: {
          base_nutrients: Json
          brand: string | null
          created_at: string
          entry_date: string
          food_id: string | null
          grams: number
          id: string
          logged_at: string
          meal_type: string
          name: string
          nutrients: Json
          portion_percent: number
          recipe_id: string | null
          source: string
          user_id: string
        }
        Insert: {
          base_nutrients?: Json
          brand?: string | null
          created_at?: string
          entry_date: string
          food_id?: string | null
          grams: number
          id?: string
          logged_at?: string
          meal_type: string
          name: string
          nutrients?: Json
          portion_percent?: number
          recipe_id?: string | null
          source?: string
          user_id: string
        }
        Update: {
          base_nutrients?: Json
          brand?: string | null
          created_at?: string
          entry_date?: string
          food_id?: string | null
          grams?: number
          id?: string
          logged_at?: string
          meal_type?: string
          name?: string
          nutrients?: Json
          portion_percent?: number
          recipe_id?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diary_entries_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlements: {
        Row: {
          access_until: string | null
          state: string
          trial_ends_at: string
          trial_started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_until?: string | null
          state: string
          trial_ends_at?: string
          trial_started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_until?: string | null
          state?: string
          trial_ends_at?: string
          trial_started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          food_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          food_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          food_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          barcode: string | null
          brand: string | null
          category: string | null
          created_at: string
          id: string
          name: string
          owner_id: string | null
          per100g: Json
          serving_grams: number
          serving_label: string
          source: string
          source_id: string | null
          verified: boolean
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id?: string | null
          per100g?: Json
          serving_grams?: number
          serving_label?: string
          source?: string
          source_id?: string | null
          verified?: boolean
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
          per100g?: Json
          serving_grams?: number
          serving_label?: string
          source?: string
          source_id?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      nutritional_goals: {
        Row: {
          calorie_target: number
          carbs_g: number
          fat_g: number
          fiber_g: number
          manually_adjusted: boolean
          method: string
          day_targets: Json
          micro_targets: Json
          protein_g: number
          updated_at: string
          user_id: string
          water_ml: number
        }
        Insert: {
          calorie_target: number
          carbs_g: number
          fat_g: number
          fiber_g?: number
          manually_adjusted?: boolean
          method?: string
          day_targets?: Json
          micro_targets?: Json
          protein_g: number
          updated_at?: string
          user_id: string
          water_ml?: number
        }
        Update: {
          calorie_target?: number
          carbs_g?: number
          fat_g?: number
          fiber_g?: number
          manually_adjusted?: boolean
          method?: string
          day_targets?: Json
          micro_targets?: Json
          protein_g?: number
          updated_at?: string
          user_id?: string
          water_ml?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          provider: string
          provider_ref: string
          raw: Json | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          provider: string
          provider_ref: string
          raw?: Json | null
          status: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          provider?: string
          provider_ref?: string
          raw?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      planned_meals: {
        Row: {
          id: string
          user_id: string
          entry_date: string
          meal_type: string
          saved_meal_id: string | null
          name: string
          items: Json
          state: string
          logged_entry_ids: string[]
          eaten_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          entry_date: string
          meal_type: string
          saved_meal_id?: string | null
          name: string
          items: Json
          state?: string
          logged_entry_ids?: string[]
          eaten_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          entry_date?: string
          meal_type?: string
          saved_meal_id?: string | null
          name?: string
          items?: Json
          state?: string
          logged_entry_ids?: string[]
          eaten_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          birth_year: number | null
          created_at: string
          email: string
          height_cm: number | null
          name: string
          objective: string | null
          onboarded_at: string | null
          sex: string | null
          target_weight_kg: number | null
          units: string
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          activity_level?: string | null
          birth_year?: number | null
          created_at?: string
          email: string
          height_cm?: number | null
          name?: string
          objective?: string | null
          onboarded_at?: string | null
          sex?: string | null
          target_weight_kg?: number | null
          units?: string
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          activity_level?: string | null
          birth_year?: number | null
          created_at?: string
          email?: string
          height_cm?: number | null
          name?: string
          objective?: string | null
          onboarded_at?: string | null
          sex?: string | null
          target_weight_kg?: number | null
          units?: string
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      public_signup_tickets: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          ticket_hash: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          ticket_hash: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          ticket_hash?: string
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          food_id: string | null
          grams: number
          id: string
          name: string
          per100g: Json
          position: number
          recipe_id: string
        }
        Insert: {
          food_id?: string | null
          grams: number
          id?: string
          name: string
          per100g?: Json
          position?: number
          recipe_id: string
        }
        Update: {
          food_id?: string | null
          grams?: number
          id?: string
          name?: string
          per100g?: Json
          position?: number
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          servings: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          servings?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          servings?: number
          user_id?: string
        }
        Relationships: []
      }
      rewarded_ad_events: {
        Row: {
          created_at: string
          granted_hours: number
          id: string
          provider: string
          user_id: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          granted_hours: number
          id?: string
          provider: string
          user_id: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          granted_hours?: number
          id?: string
          provider?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      saved_meals: {
        Row: {
          created_at: string
          id: string
          items: Json
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      scan_corrections: {
        Row: {
          corrected: Json
          created_at: string
          id: string
          item_label: string
          original: Json
          scan_id: string | null
          user_id: string
        }
        Insert: {
          corrected?: Json
          created_at?: string
          id?: string
          item_label: string
          original?: Json
          scan_id?: string | null
          user_id: string
        }
        Update: {
          corrected?: Json
          created_at?: string
          id?: string
          item_label?: string
          original?: Json
          scan_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scan_events: {
        Row: {
          created_at: string
          grounded_count: number
          id: string
          item_count: number
          latency_ms: number | null
          overall_confidence: string | null
          provider: string
          user_id: string
        }
        Insert: {
          created_at?: string
          grounded_count?: number
          id?: string
          item_count?: number
          latency_ms?: number | null
          overall_confidence?: string | null
          provider: string
          user_id: string
        }
        Update: {
          created_at?: string
          grounded_count?: number
          id?: string
          item_count?: number
          latency_ms?: number | null
          overall_confidence?: string | null
          provider?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan: string
          provider: string
          provider_ref: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan: string
          provider: string
          provider_ref?: string | null
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          provider?: string
          provider_ref?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trial_records: {
        Row: {
          email: string
          ended_at: string | null
          expires_at: string
          id: string
          outcome: string | null
          started_at: string
          user_id: string | null
        }
        Insert: {
          email: string
          ended_at?: string | null
          expires_at: string
          id?: string
          outcome?: string | null
          started_at?: string
          user_id?: string | null
        }
        Update: {
          email?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          outcome?: string | null
          started_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          granted_at: string
          id: string
          kind: string
          user_id: string
          version: string
        }
        Insert: {
          granted_at?: string
          id?: string
          kind: string
          user_id: string
          version: string
        }
        Update: {
          granted_at?: string
          id?: string
          kind?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          ad_consent: boolean
          analytics_consent: boolean
          reminders: Json
          updated_at: string
          user_id: string
          week_start: number
        }
        Insert: {
          ad_consent?: boolean
          analytics_consent?: boolean
          reminders?: Json
          updated_at?: string
          user_id: string
          week_start?: number
        }
        Update: {
          ad_consent?: boolean
          analytics_consent?: boolean
          reminders?: Json
          updated_at?: string
          user_id?: string
          week_start?: number
        }
        Relationships: []
      }
      username_auth_attempts: {
        Row: {
          attempts: number
          key_hash: string
          scope: string
          window_start: string
        }
        Insert: {
          attempts: number
          key_hash: string
          scope: string
          window_start: string
        }
        Update: {
          attempts?: number
          key_hash?: string
          scope?: string
          window_start?: string
        }
        Relationships: []
      }
      username_recovery_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      water_entries: {
        Row: {
          amount_ml: number
          created_at: string
          entry_date: string
          id: string
          user_id: string
        }
        Insert: {
          amount_ml: number
          created_at?: string
          entry_date: string
          id?: string
          user_id: string
        }
        Update: {
          amount_ml?: number
          created_at?: string
          entry_date?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      weight_entries: {
        Row: {
          created_at: string
          entry_date: string
          id: string
          note: string | null
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          entry_date: string
          id?: string
          note?: string | null
          user_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          entry_date?: string
          id?: string
          note?: string | null
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_recipe_atomic: {
        Args: { p_name: string; p_servings: number; p_notes: string | null; p_ingredients: Json }
        Returns: Database["public"]["Tables"]["recipes"]["Row"]
      }
      plan_saved_meal: {
        Args: { p_saved_meal_id: string; p_entry_date: string; p_meal_type: string }
        Returns: Database["public"]["Tables"]["planned_meals"]["Row"]
      }
      consume_planned_meal: {
        Args: { p_plan_id: string }
        Returns: Json
      }
      replace_recipe: {
        Args: { p_recipe_id: string; p_name: string; p_servings: number; p_notes: string | null; p_ingredients: Json }
        Returns: boolean
      }

      admin_change_entitlement: {
        Args: {
          p_action: string
          p_admin: string
          p_date?: string
          p_days?: number
          p_note?: string
          p_reason?: string
          p_state?: string
          p_target: string
        }
        Returns: Json
      }
      admin_create_beta_invite: {
        Args: {
          p_admin: string
          p_code_hash: string
          p_expires_at: string
          p_max_uses: number
          p_note: string
        }
        Returns: Json
      }
      admin_revoke_beta_invite: {
        Args: { p_admin: string; p_invite_id: string }
        Returns: boolean
      }
      admin_set_app_config: {
        Args: {
          p_action: string
          p_admin: string
          p_ads?: number
          p_days?: number
          p_hours?: number
          p_reason?: string
        }
        Returns: Json
      }
      am_i_admin: { Args: never; Returns: boolean }
      beta_review_reactivation: {
        Args: {
          p_approve: boolean
          p_days: number
          p_owner: string
          p_reason: string
          p_request: string
        }
        Returns: Json
      }
      beta_submit_reactivation: {
        Args: { p_message?: string; p_user: string }
        Returns: Json
      }
      check_access: { Args: never; Returns: boolean }
      consume_ai_scan_budget: { Args: { p_user_id: string }; Returns: string }
      consume_username_auth_budget: {
        Args: {
          p_key_hash: string
          p_limit: number
          p_scope: string
          p_window_seconds: number
        }
        Returns: boolean
      }
      consume_username_recovery_code: {
        Args: { p_code_hash: string; p_user_id: string }
        Returns: boolean
      }
      get_public_app_settings: { Args: never; Returns: Json }
      has_access: { Args: { uid?: string }; Returns: boolean }
      has_active_entitlement: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      issue_public_signup_ticket: { Args: { p_hash: string }; Returns: boolean }
      log_admin_action: {
        Args: {
          p_action: string
          p_admin_id: string
          p_metadata?: Json
          p_new: string
          p_previous: string
          p_reason?: string
          p_target: string
        }
        Returns: undefined
      }
      my_entitlement: {
        Args: never
        Returns: {
          access_until: string | null
          state: string
          trial_ends_at: string
          trial_started_at: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "entitlements"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

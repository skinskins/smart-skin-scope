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
      api_usage: {
        Row: {
          created_at: string | null
          fonction: string | null
          id: string
          input_tokens: number | null
          output_tokens: number | null
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          fonction?: string | null
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          fonction?: string | null
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_advice_log: {
        Row: {
          advice_group: string | null
          advice_text: string | null
          advice_tip: string | null
          advice_title: string | null
          date: string
          id: string
          priority: string | null
          user_id: string | null
        }
        Insert: {
          advice_group?: string | null
          advice_text?: string | null
          advice_tip?: string | null
          advice_title?: string | null
          date: string
          id?: string
          priority?: string | null
          user_id?: string | null
        }
        Update: {
          advice_group?: string | null
          advice_text?: string | null
          advice_tip?: string | null
          advice_title?: string | null
          date?: string
          id?: string
          priority?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_advice_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_checkins: {
        Row: {
          alcohol_drinks: number | null
          created_at: string
          cycle_phase: string | null
          date: string
          did_sport: boolean | null
          extra_factors: Json | null
          food_quality: string | null
          id: string
          makeup_removed: boolean | null
          product_change: boolean | null
          professional_treatment: boolean | null
          sleep_hours: number | null
          sport_intensity: string | null
          stress_level: number | null
          user_id: string
          water_glasses: number | null
        }
        Insert: {
          alcohol_drinks?: number | null
          created_at?: string
          cycle_phase?: string | null
          date: string
          did_sport?: boolean | null
          extra_factors?: Json | null
          food_quality?: string | null
          id?: string
          makeup_removed?: boolean | null
          product_change?: boolean | null
          professional_treatment?: boolean | null
          sleep_hours?: number | null
          sport_intensity?: string | null
          stress_level?: number | null
          user_id: string
          water_glasses?: number | null
        }
        Update: {
          alcohol_drinks?: number | null
          created_at?: string
          cycle_phase?: string | null
          date?: string
          did_sport?: boolean | null
          extra_factors?: Json | null
          food_quality?: string | null
          id?: string
          makeup_removed?: boolean | null
          product_change?: boolean | null
          professional_treatment?: boolean | null
          sleep_hours?: number | null
          sport_intensity?: string | null
          stress_level?: number | null
          user_id?: string
          water_glasses?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_inci_verdicts: {
        Row: {
          date: string
          id: string
          product_id: string | null
          product_name: string | null
          reason: string | null
          rule_id: string | null
          user_id: string | null
          verdict: string | null
        }
        Insert: {
          date: string
          id?: string
          product_id?: string | null
          product_name?: string | null
          reason?: string | null
          rule_id?: string | null
          user_id?: string | null
          verdict?: string | null
        }
        Update: {
          date?: string
          id?: string
          product_id?: string | null
          product_name?: string | null
          reason?: string | null
          rule_id?: string | null
          user_id?: string | null
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_inci_verdicts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "user_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_inci_verdicts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_routine_log: {
        Row: {
          created_at: string | null
          date: string
          id: string
          inci_message: string | null
          period: string | null
          product_ids: string[]
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          inci_message?: string | null
          period?: string | null
          product_ids: string[]
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          inci_message?: string | null
          period?: string | null
          product_ids?: string[]
          user_id?: string | null
        }
        Relationships: []
      }
      daily_weather: {
        Row: {
          aqi_score: number | null
          date: string
          humidity: number | null
          id: string
          location: string | null
          pollution_label: string | null
          temp_c: number | null
          user_id: string | null
          uv_index: number | null
        }
        Insert: {
          aqi_score?: number | null
          date: string
          humidity?: number | null
          id?: string
          location?: string | null
          pollution_label?: string | null
          temp_c?: number | null
          user_id?: string | null
          uv_index?: number | null
        }
        Update: {
          aqi_score?: number | null
          date?: string
          humidity?: number | null
          id?: string
          location?: string | null
          pollution_label?: string | null
          temp_c?: number | null
          user_id?: string | null
          uv_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_weather_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          ai_confidence_score: number | null
          alcohol_drinks: number | null
          am_routine: string[] | null
          carnation: string | null
          created_at: string
          cycle_duration: number | null
          cycle_phase: string | null
          did_sport: boolean | null
          first_name: string | null
          food_quality: string | null
          gender: string | null
          heart_rate: number | null
          id: string
          last_checkin_date: string | null
          last_name: string | null
          last_period_date: string | null
          makeup_removed: boolean | null
          manual_location: string | null
          period_duration: number | null
          pm_routine: string[] | null
          profession: string | null
          skin_goals: string[] | null
          skin_problems: string[] | null
          skin_type: string | null
          sleep_hours: number | null
          sport_intensity: string | null
          stress_level: number | null
          used_channels: string[] | null
          water_glasses: number | null
        }
        Insert: {
          age?: number | null
          ai_confidence_score?: number | null
          alcohol_drinks?: number | null
          am_routine?: string[] | null
          carnation?: string | null
          created_at?: string
          cycle_duration?: number | null
          cycle_phase?: string | null
          did_sport?: boolean | null
          first_name?: string | null
          food_quality?: string | null
          gender?: string | null
          heart_rate?: number | null
          id: string
          last_checkin_date?: string | null
          last_name?: string | null
          last_period_date?: string | null
          makeup_removed?: boolean | null
          manual_location?: string | null
          period_duration?: number | null
          pm_routine?: string[] | null
          profession?: string | null
          skin_goals?: string[] | null
          skin_problems?: string[] | null
          skin_type?: string | null
          sleep_hours?: number | null
          sport_intensity?: string | null
          stress_level?: number | null
          used_channels?: string[] | null
          water_glasses?: number | null
        }
        Update: {
          age?: number | null
          ai_confidence_score?: number | null
          alcohol_drinks?: number | null
          am_routine?: string[] | null
          carnation?: string | null
          created_at?: string
          cycle_duration?: number | null
          cycle_phase?: string | null
          did_sport?: boolean | null
          first_name?: string | null
          food_quality?: string | null
          gender?: string | null
          heart_rate?: number | null
          id?: string
          last_checkin_date?: string | null
          last_name?: string | null
          last_period_date?: string | null
          makeup_removed?: boolean | null
          manual_location?: string | null
          period_duration?: number | null
          pm_routine?: string[] | null
          profession?: string | null
          skin_goals?: string[] | null
          skin_problems?: string[] | null
          skin_type?: string | null
          sleep_hours?: number | null
          sport_intensity?: string | null
          stress_level?: number | null
          used_channels?: string[] | null
          water_glasses?: number | null
        }
        Relationships: []
      }
      routine_logs: {
        Row: {
          created_at: string
          date: string
          evening_routine_done: boolean | null
          id: string
          makeup_removed: boolean | null
          morning_routine_done: boolean | null
          spf_applied: boolean | null
          streak_best: number | null
          streak_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          evening_routine_done?: boolean | null
          id?: string
          makeup_removed?: boolean | null
          morning_routine_done?: boolean | null
          spf_applied?: boolean | null
          streak_best?: number | null
          streak_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          evening_routine_done?: boolean | null
          id?: string
          makeup_removed?: boolean | null
          morning_routine_done?: boolean | null
          spf_applied?: boolean | null
          streak_best?: number | null
          streak_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_product_logs: {
        Row: {
          created_at: string | null
          date: string
          id: string
          period: string | null
          product_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          period?: string | null
          product_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          period?: string | null
          product_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routine_product_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "user_products"
            referencedColumns: ["id"]
          },
        ]
      }
      skin_photos: {
        Row: {
          created_at: string
          date: string
          id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skin_photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      symptom_tracking: {
        Row: {
          created_at: string | null
          date: string
          id: string
          period: string
          symptom: string
          trend: string
          user_id: string
          zone: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          period?: string
          symptom: string
          trend: string
          user_id: string
          zone?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          period?: string
          symptom?: string
          trend?: string
          user_id?: string
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "symptom_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_products: {
        Row: {
          added_at: string | null
          barcode: string | null
          brand: string | null
          evening_use: boolean | null
          frequency: string | null
          frequency_days: number | null
          id: string
          ingredients: string | null
          is_active: boolean | null
          morning_use: boolean | null
          open_beauty_facts_id: string | null
          photo_url: string | null
          product_name: string
          product_type: string | null
          removed_at: string | null
          removed_reason: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          added_at?: string | null
          barcode?: string | null
          brand?: string | null
          evening_use?: boolean | null
          frequency?: string | null
          frequency_days?: number | null
          id?: string
          ingredients?: string | null
          is_active?: boolean | null
          morning_use?: boolean | null
          open_beauty_facts_id?: string | null
          photo_url?: string | null
          product_name: string
          product_type?: string | null
          removed_at?: string | null
          removed_reason?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          added_at?: string | null
          barcode?: string | null
          brand?: string | null
          evening_use?: boolean | null
          frequency?: string | null
          frequency_days?: number | null
          id?: string
          ingredients?: string | null
          is_active?: boolean | null
          morning_use?: boolean | null
          open_beauty_facts_id?: string | null
          photo_url?: string | null
          product_name?: string
          product_type?: string | null
          removed_at?: string | null
          removed_reason?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

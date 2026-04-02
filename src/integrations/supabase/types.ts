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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          contact_id: string | null
          created_at: string | null
          event_type_id: number | null
          id: string
          query_used: string | null
          result_snippet: string | null
          source_url: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          event_type_id?: number | null
          id?: string
          query_used?: string | null
          result_snippet?: string | null
          source_url?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          event_type_id?: number | null
          id?: string
          query_used?: string | null
          result_snippet?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "log_event_types"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          domain: string
          hq_locations: string[] | null
          id: string
          last_scraped_at: string | null
          name: string | null
          website_url: string | null
        }
        Insert: {
          domain: string
          hq_locations?: string[] | null
          id?: string
          last_scraped_at?: string | null
          name?: string | null
          website_url?: string | null
        }
        Update: {
          domain?: string
          hq_locations?: string[] | null
          id?: string
          last_scraped_at?: string | null
          name?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      confidence_levels: {
        Row: {
          color_hex: string | null
          id: number
          label: string
        }
        Insert: {
          color_hex?: string | null
          id: number
          label: string
        }
        Update: {
          color_hex?: string | null
          id?: number
          label?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          affinity_id: string | null
          company_id: string | null
          company_location_raw: string[] | null
          company_name: string
          confidence_id: number | null
          created_at: string | null
          designation_id: number | null
          email_address: string
          id: string
          is_approved: boolean | null
          manual_location: string | null
          manual_source_note: string | null
          metadata: Json | null
          name: string
          person_location_raw: string | null
          updated_at: string | null
        }
        Insert: {
          affinity_id?: string | null
          company_id?: string | null
          company_location_raw?: string[] | null
          company_name: string
          confidence_id?: number | null
          created_at?: string | null
          designation_id?: number | null
          email_address: string
          id?: string
          is_approved?: boolean | null
          manual_location?: string | null
          manual_source_note?: string | null
          metadata?: Json | null
          name: string
          person_location_raw?: string | null
          updated_at?: string | null
        }
        Update: {
          affinity_id?: string | null
          company_id?: string | null
          company_location_raw?: string[] | null
          company_name?: string
          confidence_id?: number | null
          created_at?: string | null
          designation_id?: number | null
          email_address?: string
          id?: string
          is_approved?: boolean | null
          manual_location?: string | null
          manual_source_note?: string | null
          metadata?: Json | null
          name?: string
          person_location_raw?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_confidence_id_fkey"
            columns: ["confidence_id"]
            isOneToOne: false
            referencedRelation: "confidence_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designation_types"
            referencedColumns: ["id"]
          },
        ]
      }
      designation_types: {
        Row: {
          id: number
          label: string
        }
        Insert: {
          id: number
          label: string
        }
        Update: {
          id?: number
          label?: string
        }
        Relationships: []
      }
      log_event_types: {
        Row: {
          icon_name: string | null
          id: number
          label: string
        }
        Insert: {
          icon_name?: string | null
          id: number
          label: string
        }
        Update: {
          icon_name?: string | null
          id?: number
          label?: string
        }
        Relationships: []
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

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
      admin_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      app_feedback: {
        Row: {
          additional_comments: string | null
          bugs_encountered: string | null
          created_at: string
          ease_of_use: number | null
          first_open_confusion: string | null
          id: string
          main_use: string | null
          missing_features: string | null
          most_used_feature: string | null
          notifications_timing: string | null
          one_improvement: string | null
          overall_rating: number
          state_country: string | null
          user_email: string | null
          user_id: string | null
          would_recommend: string | null
        }
        Insert: {
          additional_comments?: string | null
          bugs_encountered?: string | null
          created_at?: string
          ease_of_use?: number | null
          first_open_confusion?: string | null
          id?: string
          main_use?: string | null
          missing_features?: string | null
          most_used_feature?: string | null
          notifications_timing?: string | null
          one_improvement?: string | null
          overall_rating: number
          state_country?: string | null
          user_email?: string | null
          user_id?: string | null
          would_recommend?: string | null
        }
        Update: {
          additional_comments?: string | null
          bugs_encountered?: string | null
          created_at?: string
          ease_of_use?: number | null
          first_open_confusion?: string | null
          id?: string
          main_use?: string | null
          missing_features?: string | null
          most_used_feature?: string | null
          notifications_timing?: string | null
          one_improvement?: string | null
          overall_rating?: number
          state_country?: string | null
          user_email?: string | null
          user_id?: string | null
          would_recommend?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      guftagu_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guftagu_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "guftagu_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      guftagu_posts: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          user_id: string
          user_name: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          user_id: string
          user_name: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      guftagu_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
          user_name: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
          user_name: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "guftagu_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "guftagu_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      hajj_bookings: {
        Row: {
          amount_paid: number
          booked_at: string
          id: string
          status: Database["public"]["Enums"]["booking_status"]
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid: number
          booked_at?: string
          id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          booked_at?: string
          id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hajj_bookings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "hajj_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      hajj_trips: {
        Row: {
          created_at: string
          description: string
          end_date: string
          id: string
          is_active: boolean | null
          price: number
          slots_available: number
          start_date: string
          title: string
          travel_partner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          end_date: string
          id?: string
          is_active?: boolean | null
          price: number
          slots_available: number
          start_date: string
          title: string
          travel_partner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          end_date?: string
          id?: string
          is_active?: boolean | null
          price?: number
          slots_available?: number
          start_date?: string
          title?: string
          travel_partner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      news_articles: {
        Row: {
          article_url: string
          author: string | null
          category: string | null
          content: string | null
          created_at: string
          description: string | null
          guid: string
          id: string
          image_url: string | null
          published_at: string | null
          source_name: string
          tags: string[] | null
          title: string
        }
        Insert: {
          article_url: string
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          guid: string
          id?: string
          image_url?: string | null
          published_at?: string | null
          source_name: string
          tags?: string[] | null
          title: string
        }
        Update: {
          article_url?: string
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          guid?: string
          id?: string
          image_url?: string | null
          published_at?: string | null
          source_name?: string
          tags?: string[] | null
          title?: string
        }
        Relationships: []
      }
      news_sources: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          rss_url: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          rss_url: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          rss_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price: number
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price: number
          product_id: string
          quantity: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price?: number
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          commission: number | null
          created_at: string
          currency: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          seller_id: string | null
          shipping_address: string | null
          shipping_city: string | null
          shipping_fee: number | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number | null
          tax: number | null
          total_amount: number
          tracking_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          commission?: number | null
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          seller_id?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_fee?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number | null
          tax?: number | null
          total_amount: number
          tracking_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          commission?: number | null
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          seller_id?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_fee?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number | null
          tax?: number | null
          total_amount?: number
          tracking_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          image_url: string
          product_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          image_url: string
          product_id: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          free_shipping: boolean | null
          id: string
          image_url: string | null
          inventory_quantity: number
          is_active: boolean | null
          islamic_compliance: boolean | null
          name: string
          price: number
          seller_id: string
          shipping_price: number | null
          sku: string | null
          status: string
          tags: string[] | null
          updated_at: string
          weight: number | null
          weight_unit: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          free_shipping?: boolean | null
          id?: string
          image_url?: string | null
          inventory_quantity?: number
          is_active?: boolean | null
          islamic_compliance?: boolean | null
          name: string
          price: number
          seller_id: string
          shipping_price?: number | null
          sku?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          weight?: number | null
          weight_unit?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          free_shipping?: boolean | null
          id?: string
          image_url?: string | null
          inventory_quantity?: number
          is_active?: boolean | null
          islamic_compliance?: boolean | null
          name?: string
          price?: number
          seller_id?: string
          shipping_price?: number | null
          sku?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          weight?: number | null
          weight_unit?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      salah_log: {
        Row: {
          asr: boolean
          created_at: string
          date: string
          dhuhr: boolean
          fajr: boolean
          id: string
          isha: boolean
          maghrib: boolean
          user_id: string
        }
        Insert: {
          asr?: boolean
          created_at?: string
          date: string
          dhuhr?: boolean
          fajr?: boolean
          id?: string
          isha?: boolean
          maghrib?: boolean
          user_id: string
        }
        Update: {
          asr?: boolean
          created_at?: string
          date?: string
          dhuhr?: boolean
          fajr?: boolean
          id?: string
          isha?: boolean
          maghrib?: boolean
          user_id?: string
        }
        Relationships: []
      }
      salah_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_updated: string
          longest_streak: number
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_updated?: string
          longest_streak?: number
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_updated?: string
          longest_streak?: number
          user_id?: string
        }
        Relationships: []
      }
      seller_profiles: {
        Row: {
          about_us: string | null
          agreed_to_terms: boolean | null
          bank_account_name: string | null
          bank_account_number: string | null
          banner_url: string | null
          business_name: string
          contact_person: string | null
          country_of_operations: string | null
          created_at: string
          email: string | null
          halal_compliant: boolean | null
          id: string
          logo_url: string | null
          no_prohibited_categories: boolean | null
          onboarding_completed: boolean | null
          phone_country_code: string | null
          phone_number: string | null
          seller_display_name: string | null
          stripe_connected: boolean | null
          understands_review: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          about_us?: string | null
          agreed_to_terms?: boolean | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          banner_url?: string | null
          business_name: string
          contact_person?: string | null
          country_of_operations?: string | null
          created_at?: string
          email?: string | null
          halal_compliant?: boolean | null
          id?: string
          logo_url?: string | null
          no_prohibited_categories?: boolean | null
          onboarding_completed?: boolean | null
          phone_country_code?: string | null
          phone_number?: string | null
          seller_display_name?: string | null
          stripe_connected?: boolean | null
          understands_review?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          about_us?: string | null
          agreed_to_terms?: boolean | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          banner_url?: string | null
          business_name?: string
          contact_person?: string | null
          country_of_operations?: string | null
          created_at?: string
          email?: string | null
          halal_compliant?: boolean | null
          id?: string
          logo_url?: string | null
          no_prohibited_categories?: boolean | null
          onboarding_completed?: boolean | null
          phone_country_code?: string | null
          phone_number?: string | null
          seller_display_name?: string | null
          stripe_connected?: boolean | null
          understands_review?: boolean | null
          updated_at?: string
          user_id?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "normal_user" | "seller" | "travel_partner" | "admin"
      booking_status: "pending" | "confirmed" | "cancelled"
      order_status:
        | "pending"
        | "paid"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "new"
        | "processing"
        | "completed"
        | "declined"
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
      app_role: ["normal_user", "seller", "travel_partner", "admin"],
      booking_status: ["pending", "confirmed", "cancelled"],
      order_status: [
        "pending",
        "paid",
        "shipped",
        "delivered",
        "cancelled",
        "new",
        "processing",
        "completed",
        "declined",
      ],
    },
  },
} as const

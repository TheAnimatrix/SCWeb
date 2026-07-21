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
    PostgrestVersion: "12.0.2 (a4e00ff)"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string | null
          created_at: string
          id: number
          line1: string | null
          line2: string | null
          name: string | null
          phone: string | null
          pincode: string | null
          state: string | null
          uid: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: number
          line1?: string | null
          line2?: string | null
          name?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          uid?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: number
          line1?: string | null
          line2?: string | null
          name?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          uid?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_client_id: string | null
          actor_user_id: string | null
          at: string
          entity_id: string
          entity_type: string
          from_state: string | null
          id: string
          meta: Json | null
          provider_ids: Json | null
          to_state: string | null
        }
        Insert: {
          action: string
          actor_client_id?: string | null
          actor_user_id?: string | null
          at?: string
          entity_id: string
          entity_type: string
          from_state?: string | null
          id?: string
          meta?: Json | null
          provider_ids?: Json | null
          to_state?: string | null
        }
        Update: {
          action?: string
          actor_client_id?: string | null
          actor_user_id?: string | null
          at?: string
          entity_id?: string
          entity_type?: string
          from_state?: string | null
          id?: string
          meta?: Json | null
          provider_ids?: Json | null
          to_state?: string | null
        }
        Relationships: []
      }
      cart_archive: {
        Row: {
          address: string | null
          client_id: string | null
          created_at: string | null
          id: string | null
          list: Json | null
          payment_id_a: string | null
          payment_id_b: string | null
          payment_signature: string | null
          price: number | null
          status: string | null
          uid: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string | null
          list?: Json | null
          payment_id_a?: string | null
          payment_id_b?: string | null
          payment_signature?: string | null
          price?: number | null
          status?: string | null
          uid?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string | null
          list?: Json | null
          payment_id_a?: string | null
          payment_id_b?: string | null
          payment_signature?: string | null
          price?: number | null
          status?: string | null
          uid?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          product_id: string
          qty: number
          updated_at: string
        }
        Insert: {
          cart_id: string
          created_at?: string
          product_id: string
          qty: number
          updated_at?: string
        }
        Update: {
          cart_id?: string
          created_at?: string
          product_id?: string
          qty?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_carts_id_fk"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_products_id_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      Chat: {
        Row: {
          chat_id: string
          created_at: string
          message: string | null
          message_type: string | null
          recipient_id: string
          relationship_id: string | null
          sender_id: string
          status: string | null
        }
        Insert: {
          chat_id?: string
          created_at?: string
          message?: string | null
          message_type?: string | null
          recipient_id: string
          relationship_id?: string | null
          sender_id: string
          status?: string | null
        }
        Update: {
          chat_id?: string
          created_at?: string
          message?: string | null
          message_type?: string | null
          recipient_id?: string
          relationship_id?: string | null
          sender_id?: string
          status?: string | null
        }
        Relationships: []
      }
      constants: {
        Row: {
          created_at: string
          id: number
          key: string | null
          value: Json | null
        }
        Insert: {
          created_at?: string
          id?: number
          key?: string | null
          value?: Json | null
        }
        Update: {
          created_at?: string
          id?: number
          key?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      CreatorReviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          maker_id: string
          print_request_id: string
          rating: number | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          maker_id: string
          print_request_id: string
          rating?: number | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          maker_id?: string
          print_request_id?: string
          rating?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creatorreviews_print_request_id_fkey"
            columns: ["print_request_id"]
            isOneToOne: true
            referencedRelation: "printrequests"
            referencedColumns: ["id"]
          },
        ]
      }
      CreatorStats: {
        Row: {
          avg_quote_time: string | null
          avg_rating: number | null
          completed_orders: number | null
          created_at: string
          maker_id: string
          materials_used: Json | null
        }
        Insert: {
          avg_quote_time?: string | null
          avg_rating?: number | null
          completed_orders?: number | null
          created_at?: string
          maker_id: string
          materials_used?: Json | null
        }
        Update: {
          avg_quote_time?: string | null
          avg_rating?: number | null
          completed_orders?: number | null
          created_at?: string
          maker_id?: string
          materials_used?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "CreatorStats_maker_id_fkey"
            columns: ["maker_id"]
            isOneToOne: true
            referencedRelation: "PrintingCrafters"
            referencedColumns: ["maker_id"]
          },
        ]
      }
      Filament: {
        Row: {
          brand: string | null
          cost_approx: number | null
          created_at: string
          density: number | null
          global_custom: string | null
          id: string
          material_type: string | null
          max_flow_rate: number | null
          name: string | null
          owner_id: string | null
          product_link: string | null
        }
        Insert: {
          brand?: string | null
          cost_approx?: number | null
          created_at?: string
          density?: number | null
          global_custom?: string | null
          id?: string
          material_type?: string | null
          max_flow_rate?: number | null
          name?: string | null
          owner_id?: string | null
          product_link?: string | null
        }
        Update: {
          brand?: string | null
          cost_approx?: number | null
          created_at?: string
          density?: number | null
          global_custom?: string | null
          id?: string
          material_type?: string | null
          max_flow_rate?: number | null
          name?: string | null
          owner_id?: string | null
          product_link?: string | null
        }
        Relationships: []
      }
      makers: {
        Row: {
          application: Json | null
          approved_at: string | null
          approved_state: string
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          application?: Json | null
          approved_at?: string | null
          approved_state?: string
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          application?: Json | null
          approved_at?: string | null
          approved_state?: string
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "makers_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          order_id: string
          product_id: string
          product_name: string
          qty: number
          unit_price_paise: number
        }
        Insert: {
          order_id: string
          product_id: string
          product_name: string
          qty: number
          unit_price_paise: number
        }
        Update: {
          order_id?: string
          product_id?: string
          product_name?: string
          qty?: number
          unit_price_paise?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_orders_id_fk"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          active_payment_attempt_id: string | null
          address: Json
          cart_id: string
          client_id: string | null
          created_at: string
          delivery_fee_paise: number
          id: string
          status: string
          subtotal_paise: number
          total_paise: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active_payment_attempt_id?: string | null
          address: Json
          cart_id: string
          client_id?: string | null
          created_at?: string
          delivery_fee_paise: number
          id?: string
          status: string
          subtotal_paise: number
          total_paise: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active_payment_attempt_id?: string | null
          address?: Json
          cart_id?: string
          client_id?: string | null
          created_at?: string
          delivery_fee_paise?: number
          id?: string
          status?: string
          subtotal_paise?: number
          total_paise?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_active_payment_attempt_id_payment_attempts_id_fk"
            columns: ["active_payment_attempt_id"]
            isOneToOne: false
            referencedRelation: "payment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_cart_id_carts_id_fk"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_attempts: {
        Row: {
          amount_paise: number
          created_at: string
          currency: string
          entity_id: string
          failure_reason: string | null
          id: string
          kind: string
          provider: string
          provider_order_id: string
          provider_payment_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_paise: number
          created_at?: string
          currency?: string
          entity_id: string
          failure_reason?: string | null
          id?: string
          kind: string
          provider: string
          provider_order_id: string
          provider_payment_id?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          amount_paise?: number
          created_at?: string
          currency?: string
          entity_id?: string
          failure_reason?: string | null
          id?: string
          kind?: string
          provider?: string
          provider_order_id?: string
          provider_payment_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      print_request_events: {
        Row: {
          actor_role: string
          actor_user_id: string | null
          amount_paise: number | null
          created_at: string
          id: string
          metadata: Json | null
          print_request_id: string
          provider_order_id: string | null
          provider_payment_id: string | null
          reason: string | null
          type: string
        }
        Insert: {
          actor_role: string
          actor_user_id?: string | null
          amount_paise?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          print_request_id: string
          provider_order_id?: string | null
          provider_payment_id?: string | null
          reason?: string | null
          type: string
        }
        Update: {
          actor_role?: string
          actor_user_id?: string | null
          amount_paise?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          print_request_id?: string
          provider_order_id?: string | null
          provider_payment_id?: string | null
          reason?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_request_events_print_request_id_printrequests_id_fk"
            columns: ["print_request_id"]
            isOneToOne: false
            referencedRelation: "printrequests"
            referencedColumns: ["id"]
          },
        ]
      }
      PrintingCrafters: {
        Row: {
          approved_state: string | null
          contact_number: string | null
          created_at: string
          delivery_rank: number | null
          email: string | null
          filament_data: Json | null
          filament_types: string[] | null
          maker_id: string
          max_printer_size: string | null
          name: string | null
          number_of_printers: number | null
          payment_details: string | null
          price_rank: number | null
        }
        Insert: {
          approved_state?: string | null
          contact_number?: string | null
          created_at?: string
          delivery_rank?: number | null
          email?: string | null
          filament_data?: Json | null
          filament_types?: string[] | null
          maker_id: string
          max_printer_size?: string | null
          name?: string | null
          number_of_printers?: number | null
          payment_details?: string | null
          price_rank?: number | null
        }
        Update: {
          approved_state?: string | null
          contact_number?: string | null
          created_at?: string
          delivery_rank?: number | null
          email?: string | null
          filament_data?: Json | null
          filament_types?: string[] | null
          maker_id?: string
          max_printer_size?: string | null
          name?: string | null
          number_of_printers?: number | null
          payment_details?: string | null
          price_rank?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "PrintingCrafters_maker_id_fkey"
            columns: ["maker_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "PrintingCrafters_maker_id_makers_id_fk"
            columns: ["maker_id"]
            isOneToOne: true
            referencedRelation: "makers"
            referencedColumns: ["id"]
          },
        ]
      }
      printrequests: {
        Row: {
          active_payment_attempt_id: string | null
          address: Json | null
          created_at: string
          creator_id: string | null
          events: Json | null
          filament_color: string | null
          id: string
          initial_quote: number | null
          last_updated: string | null
          model: string | null
          model_data: Json | null
          model_metadata: Json | null
          quote: number | null
          quote_updates: number | null
          request_metadata: Json | null
          request_stage: string | null
          update_count: number | null
          user_id: string | null
        }
        Insert: {
          active_payment_attempt_id?: string | null
          address?: Json | null
          created_at?: string
          creator_id?: string | null
          events?: Json | null
          filament_color?: string | null
          id?: string
          initial_quote?: number | null
          last_updated?: string | null
          model?: string | null
          model_data?: Json | null
          model_metadata?: Json | null
          quote?: number | null
          quote_updates?: number | null
          request_metadata?: Json | null
          request_stage?: string | null
          update_count?: number | null
          user_id?: string | null
        }
        Update: {
          active_payment_attempt_id?: string | null
          address?: Json | null
          created_at?: string
          creator_id?: string | null
          events?: Json | null
          filament_color?: string | null
          id?: string
          initial_quote?: number | null
          last_updated?: string | null
          model?: string | null
          model_data?: Json | null
          model_metadata?: Json | null
          quote?: number | null
          quote_updates?: number | null
          request_metadata?: Json | null
          request_stage?: string | null
          update_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "printrequests_active_payment_attempt_id_payment_attempts_id_fk"
            columns: ["active_payment_attempt_id"]
            isOneToOne: false
            referencedRelation: "payment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "PrintRequests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printrequests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          author: string | null
          created_at: string
          documentation: Json | null
          faq: Json | null
          guarantee: string | null
          id: string
          images: Json | null
          name: string | null
          offer: Json | null
          price: Json | null
          rating: Json | null
          rel: string | null
          stock: Json | null
          tags: Json | null
          type: string | null
          uid: string | null
        }
        Insert: {
          author?: string | null
          created_at?: string
          documentation?: Json | null
          faq?: Json | null
          guarantee?: string | null
          id?: string
          images?: Json | null
          name?: string | null
          offer?: Json | null
          price?: Json | null
          rating?: Json | null
          rel?: string | null
          stock?: Json | null
          tags?: Json | null
          type?: string | null
          uid?: string | null
        }
        Update: {
          author?: string | null
          created_at?: string
          documentation?: Json | null
          faq?: Json | null
          guarantee?: string | null
          id?: string
          images?: Json | null
          name?: string | null
          offer?: Json | null
          price?: Json | null
          rating?: Json | null
          rel?: string | null
          stock?: Json | null
          tags?: Json | null
          type?: string | null
          uid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_products_author_fkey"
            columns: ["author"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["username"]
          },
        ]
      }
      purchases_archive: {
        Row: {
          amount: number | null
          billing_address: Json | null
          cart_id: string | null
          client_id: string | null
          created_at: string
          id: number
          item_snapshot: Json | null
          payment_confirmed: boolean
          payment_id: string
          payment_id_b: string | null
          payment_method: string | null
          payment_signature: string | null
          payment_status: string | null
          shipping_address: Json | null
          trackingCourier: string | null
          trackingId: string | null
          trackingUrl: string | null
          uid: string | null
        }
        Insert: {
          amount?: number | null
          billing_address?: Json | null
          cart_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: number
          item_snapshot?: Json | null
          payment_confirmed?: boolean
          payment_id: string
          payment_id_b?: string | null
          payment_method?: string | null
          payment_signature?: string | null
          payment_status?: string | null
          shipping_address?: Json | null
          trackingCourier?: string | null
          trackingId?: string | null
          trackingUrl?: string | null
          uid?: string | null
        }
        Update: {
          amount?: number | null
          billing_address?: Json | null
          cart_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: number
          item_snapshot?: Json | null
          payment_confirmed?: boolean
          payment_id?: string
          payment_id_b?: string | null
          payment_method?: string | null
          payment_signature?: string | null
          payment_status?: string | null
          shipping_address?: Json | null
          trackingCourier?: string | null
          trackingId?: string | null
          trackingUrl?: string | null
          uid?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          product_id: string | null
          rating: number | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          rating?: number | null
          user_id?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          rating?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "Reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_quota: {
        Row: {
          count: number
          quota_date: string
          user_id: string
        }
        Insert: {
          count?: number
          quota_date?: string
          user_id: string
        }
        Update: {
          count?: number
          quota_date?: string
          user_id?: string
        }
        Relationships: []
      }
      UserFilament: {
        Row: {
          brand: string | null
          color: string | null
          cost_approx: number | null
          created_at: string
          density: number | null
          id: string
          material_type: string | null
          max_flow_rate: number | null
          name: string | null
          owner_id: string | null
          product_link: string | null
          quantity_kg: number | null
        }
        Insert: {
          brand?: string | null
          color?: string | null
          cost_approx?: number | null
          created_at?: string
          density?: number | null
          id?: string
          material_type?: string | null
          max_flow_rate?: number | null
          name?: string | null
          owner_id?: string | null
          product_link?: string | null
          quantity_kg?: number | null
        }
        Update: {
          brand?: string | null
          color?: string | null
          cost_approx?: number | null
          created_at?: string
          density?: number | null
          id?: string
          material_type?: string | null
          max_flow_rate?: number | null
          name?: string | null
          owner_id?: string | null
          product_link?: string | null
          quantity_kg?: number | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string | null
          id: string
          quote_daily_limit: number
          tier: string | null
          username: string | null
        }
        Insert: {
          created_at: string
          email?: string | null
          id: string
          quote_daily_limit?: number
          tier?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          quote_daily_limit?: number
          tier?: string | null
          username?: string | null
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
      cart_status: "purchased" | "idle" | "deleted"
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
      cart_status: ["purchased", "idle", "deleted"],
    },
  },
} as const

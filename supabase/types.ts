export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
        Relationships: [
          {
            foreignKeyName: "public_addresses_uid_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cart: {
        Row: {
          address: string | null
          client_id: string | null
          created_at: string
          id: string
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
          created_at?: string
          id?: string
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
          created_at?: string
          id?: string
          list?: Json | null
          payment_id_a?: string | null
          payment_id_b?: string | null
          payment_signature?: string | null
          price?: number | null
          status?: string | null
          uid?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_cart_uid_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "public_products_uid_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          amount: number | null
          billing_address: Json | null
          cart_id: string | null
          client_id: string | null
          created_at: string
          id: number
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
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          addresses: Json | null
          crafts: Json | null
          created_at: string
          email: string | null
          id: string
          orders: Json | null
          tier: number | null
          username: string | null
        }
        Insert: {
          addresses?: Json | null
          crafts?: Json | null
          created_at: string
          email?: string | null
          id: string
          orders?: Json | null
          tier?: number | null
          username?: string | null
        }
        Update: {
          addresses?: Json | null
          crafts?: Json | null
          created_at?: string
          email?: string | null
          id?: string
          orders?: Json | null
          tier?: number | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_user_exists: {
        Args: {
          username: string
        }
        Returns: boolean
      }
      get_author_name: {
        Args: {
          uid: string
        }
        Returns: string
      }
      get_cart_by_uid: {
        Args: {
          in_clientid: string
        }
        Returns: {
          id: string
          uid: string
          auid: string
          client_id: string
          list: Json
          price: number
          status: string
          payment_id: string
          created_at: string
          updated_at: string
        }[]
      }
      update_cart_by_id: {
        Args: {
          in_client_id: string
          in_cart_id: string
          in_list: Json
          in_status: string
        }
        Returns: {
          id: string
          uid: string
          client_id: string
          list: Json
          price: number
          status: string
          created_at: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      cart_status: "purchased" | "idle" | "deleted"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

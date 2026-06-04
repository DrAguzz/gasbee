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
      addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string | null
          created_at: string
          id: string
          is_default: boolean
          label: string | null
          latitude: number | null
          longitude: number | null
          postcode: string | null
          recipient_name: string | null
          recipient_phone: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          postcode?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          postcode?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          ip: string | null
          payload: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          ip?: string | null
          payload?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          ip?: string | null
          payload?: Json | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          sort_order: number
          starts_at: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          starts_at?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          starts_at?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      commissions: {
        Row: {
          active: boolean
          created_at: string
          id: string
          is_default: boolean
          merchant_id: string | null
          type: Database["public"]["Enums"]["commission_type"]
          updated_at: string
          value: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          is_default?: boolean
          merchant_id?: string | null
          type?: Database["public"]["Enums"]["commission_type"]
          updated_at?: string
          value?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          is_default?: boolean
          merchant_id?: string | null
          type?: Database["public"]["Enums"]["commission_type"]
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "commissions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      company_verifications: {
        Row: {
          additional_doc_url: string | null
          business_address: string | null
          company_name: string
          contact_phone: string | null
          created_at: string
          id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          ssm_doc_url: string
          ssm_number: string
          status: Database["public"]["Enums"]["company_verification_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_doc_url?: string | null
          business_address?: string | null
          company_name: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          ssm_doc_url: string
          ssm_number: string
          status?: Database["public"]["Enums"]["company_verification_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_doc_url?: string | null
          business_address?: string | null
          company_name?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          ssm_doc_url?: string
          ssm_number?: string
          status?: Database["public"]["Enums"]["company_verification_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string
          id: string
          merchant_id: string
          performed_by: string | null
          product_id: string
          quantity: number
          reason: string | null
          reference_order_id: string | null
          type: Database["public"]["Enums"]["inventory_movement_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id: string
          performed_by?: string | null
          product_id: string
          quantity: number
          reason?: string | null
          reference_order_id?: string | null
          type: Database["public"]["Enums"]["inventory_movement_type"]
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string
          performed_by?: string | null
          product_id?: string
          quantity?: number
          reason?: string | null
          reference_order_id?: string | null
          type?: Database["public"]["Enums"]["inventory_movement_type"]
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_applications: {
        Row: {
          address: string | null
          applicant_id: string | null
          business_name: string
          city: string | null
          contact_name: string
          created_at: string
          documents: Json | null
          email: string
          id: string
          phone: string
          postcode: string | null
          review_notes: string | null
          reviewed_by: string | null
          state: string | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          applicant_id?: string | null
          business_name: string
          city?: string | null
          contact_name: string
          created_at?: string
          documents?: Json | null
          email: string
          id?: string
          phone: string
          postcode?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          applicant_id?: string | null
          business_name?: string
          city?: string | null
          contact_name?: string
          created_at?: string
          documents?: Json | null
          email?: string
          id?: string
          phone?: string
          postcode?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: []
      }
      merchants: {
        Row: {
          address: string | null
          city: string | null
          commission_rate: number
          created_at: string
          delivery_radius_km: number
          description: string | null
          documents: Json | null
          email: string | null
          id: string
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          owner_id: string | null
          phone: string | null
          postcode: string | null
          rating: number | null
          slug: string
          state: string | null
          status: Database["public"]["Enums"]["merchant_status"]
          total_orders: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          commission_rate?: number
          created_at?: string
          delivery_radius_km?: number
          description?: string | null
          documents?: Json | null
          email?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          owner_id?: string | null
          phone?: string | null
          postcode?: string | null
          rating?: number | null
          slug: string
          state?: string | null
          status?: Database["public"]["Enums"]["merchant_status"]
          total_orders?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          commission_rate?: number
          created_at?: string
          delivery_radius_km?: number
          description?: string | null
          documents?: Json | null
          email?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          postcode?: string | null
          rating?: number | null
          slug?: string
          state?: string | null
          status?: Database["public"]["Enums"]["merchant_status"]
          total_orders?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      order_credits: {
        Row: {
          amount: number
          created_at: string
          id: string
          leftover_amount: number
          notes: string | null
          source_order_id: string
          status: string
          updated_at: string
          used_order_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          leftover_amount?: number
          notes?: string | null
          source_order_id: string
          status?: string
          updated_at?: string
          used_order_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          leftover_amount?: number
          notes?: string | null
          source_order_id?: string
          status?: string
          updated_at?: string
          used_order_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          cylinder_size_kg: number | null
          id: string
          order_id: string
          product_id: string | null
          product_image_url: string | null
          product_name: string
          quantity: number
          subtotal: number
          type: Database["public"]["Enums"]["order_item_type"]
          unit_price: number
        }
        Insert: {
          created_at?: string
          cylinder_size_kg?: number | null
          id?: string
          order_id: string
          product_id?: string | null
          product_image_url?: string | null
          product_name: string
          quantity?: number
          subtotal?: number
          type?: Database["public"]["Enums"]["order_item_type"]
          unit_price?: number
        }
        Update: {
          created_at?: string
          cylinder_size_kg?: number | null
          id?: string
          order_id?: string
          product_id?: string | null
          product_image_url?: string | null
          product_name?: string
          quantity?: number
          subtotal?: number
          type?: Database["public"]["Enums"]["order_item_type"]
          unit_price?: number
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
      order_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          order_id: string
          sender_id: string
          sender_role: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          order_id: string
          sender_id: string
          sender_role: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          order_id?: string
          sender_id?: string
          sender_role?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          accepted_at: string | null
          address_snapshot: Json
          assigned_at: string | null
          cancelled_at: string | null
          code: string
          created_at: string
          customer_id: string
          delivered_at: string | null
          delivery_fee: number
          delivery_notes: string | null
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          discount: number
          failure_reason: string | null
          id: string
          items_subtotal: number
          merchant_id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          picked_up_at: string | null
          processing_fee: number
          promotion_code: string | null
          proof_of_delivery_url: string | null
          rejected_at: string | null
          rider_id: string | null
          scheduled_at: string | null
          service_fee: number
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          address_snapshot: Json
          assigned_at?: string | null
          cancelled_at?: string | null
          code?: string
          created_at?: string
          customer_id: string
          delivered_at?: string | null
          delivery_fee?: number
          delivery_notes?: string | null
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          discount?: number
          failure_reason?: string | null
          id?: string
          items_subtotal?: number
          merchant_id: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          picked_up_at?: string | null
          processing_fee?: number
          promotion_code?: string | null
          proof_of_delivery_url?: string | null
          rejected_at?: string | null
          rider_id?: string | null
          scheduled_at?: string | null
          service_fee?: number
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          address_snapshot?: Json
          assigned_at?: string | null
          cancelled_at?: string | null
          code?: string
          created_at?: string
          customer_id?: string
          delivered_at?: string | null
          delivery_fee?: number
          delivery_notes?: string | null
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          discount?: number
          failure_reason?: string | null
          id?: string
          items_subtotal?: number
          merchant_id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          picked_up_at?: string | null
          processing_fee?: number
          promotion_code?: string | null
          proof_of_delivery_url?: string | null
          rejected_at?: string | null
          rider_id?: string | null
          scheduled_at?: string | null
          service_fee?: number
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders_public"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateways: {
        Row: {
          config: Json
          created_at: string
          enabled: boolean
          id: string
          mode: string
          provider: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          mode?: string
          provider: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          mode?: string
          provider?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          gateway: string
          gateway_ref: string | null
          id: string
          order_id: string
          raw_payload: Json | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          gateway: string
          gateway_ref?: string | null
          id?: string
          order_id: string
          raw_payload?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          gateway?: string
          gateway_ref?: string | null
          id?: string
          order_id?: string
          raw_payload?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          cylinder_size_kg: number | null
          deposit_amount: number
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_coming_soon: boolean
          low_stock_threshold: number
          merchant_id: string
          name: string
          new_cylinder_price: number
          refill_price: number
          reserved_qty: number
          selling_price: number
          stock_qty: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          cylinder_size_kg?: number | null
          deposit_amount?: number
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_coming_soon?: boolean
          low_stock_threshold?: number
          merchant_id: string
          name: string
          new_cylinder_price?: number
          refill_price?: number
          reserved_qty?: number
          selling_price?: number
          stock_qty?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          cylinder_size_kg?: number | null
          deposit_amount?: number
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_coming_soon?: boolean
          low_stock_threshold?: number
          merchant_id?: string
          name?: string
          new_cylinder_price?: number
          refill_price?: number
          reserved_qty?: number
          selling_price?: number
          stock_qty?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          applies_to: string
          code: string
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          merchant_id: string | null
          min_order_amount: number
          starts_at: string | null
          type: Database["public"]["Enums"]["promotion_type"]
          updated_at: string
          usage_limit: number | null
          used_count: number
          value: number
        }
        Insert: {
          applies_to?: string
          code: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          merchant_id?: string | null
          min_order_amount?: number
          starts_at?: string | null
          type?: Database["public"]["Enums"]["promotion_type"]
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          value?: number
        }
        Update: {
          applies_to?: string
          code?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          merchant_id?: string | null
          min_order_amount?: number
          starts_at?: string | null
          type?: Database["public"]["Enums"]["promotion_type"]
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          value?: number
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          merchant_rating: number | null
          order_id: string
          rider_rating: number | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          merchant_rating?: number | null
          order_id: string
          rider_rating?: number | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          merchant_rating?: number | null
          order_id?: string
          rider_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          created_at: string
          delivery_fee_charged: number
          id: string
          merchant_acknowledged_at: string | null
          merchant_acknowledged_by: string | null
          notes: string | null
          order_id: string
          pickup_completed_at: string | null
          pickup_proof_url: string | null
          pickup_rider_id: string | null
          pickup_status: Database["public"]["Enums"]["refund_pickup_status"]
          processed_by: string | null
          reason: string
          reason_category: string | null
          refund_amount: number | null
          requester_id: string
          restocking_fee: number
          stage: Database["public"]["Enums"]["refund_stage"] | null
          status: Database["public"]["Enums"]["refund_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          delivery_fee_charged?: number
          id?: string
          merchant_acknowledged_at?: string | null
          merchant_acknowledged_by?: string | null
          notes?: string | null
          order_id: string
          pickup_completed_at?: string | null
          pickup_proof_url?: string | null
          pickup_rider_id?: string | null
          pickup_status?: Database["public"]["Enums"]["refund_pickup_status"]
          processed_by?: string | null
          reason: string
          reason_category?: string | null
          refund_amount?: number | null
          requester_id: string
          restocking_fee?: number
          stage?: Database["public"]["Enums"]["refund_stage"] | null
          status?: Database["public"]["Enums"]["refund_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          delivery_fee_charged?: number
          id?: string
          merchant_acknowledged_at?: string | null
          merchant_acknowledged_by?: string | null
          notes?: string | null
          order_id?: string
          pickup_completed_at?: string | null
          pickup_proof_url?: string | null
          pickup_rider_id?: string | null
          pickup_status?: Database["public"]["Enums"]["refund_pickup_status"]
          processed_by?: string | null
          reason?: string
          reason_category?: string | null
          refund_amount?: number | null
          requester_id?: string
          restocking_fee?: number
          stage?: Database["public"]["Enums"]["refund_stage"] | null
          status?: Database["public"]["Enums"]["refund_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      riders: {
        Row: {
          created_at: string
          current_lat: number | null
          current_lng: number | null
          full_name: string
          id: string
          is_active: boolean
          license_expiry_date: string | null
          license_image_url: string | null
          license_no: string | null
          merchant_id: string | null
          phone: string
          profile_image_url: string | null
          rating: number | null
          status: Database["public"]["Enums"]["rider_status"]
          total_deliveries: number
          updated_at: string
          user_id: string | null
          vehicle_plate: string | null
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          full_name: string
          id?: string
          is_active?: boolean
          license_expiry_date?: string | null
          license_image_url?: string | null
          license_no?: string | null
          merchant_id?: string | null
          phone: string
          profile_image_url?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["rider_status"]
          total_deliveries?: number
          updated_at?: string
          user_id?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          full_name?: string
          id?: string
          is_active?: boolean
          license_expiry_date?: string | null
          license_image_url?: string | null
          license_no?: string | null
          merchant_id?: string | null
          phone?: string
          profile_image_url?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["rider_status"]
          total_deliveries?: number
          updated_at?: string
          user_id?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "riders_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riders_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          commission_amount: number
          created_at: string
          gross_sales: number
          id: string
          merchant_id: string
          net_payout: number
          notes: string | null
          paid_at: string | null
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["settlement_status"]
          updated_at: string
        }
        Insert: {
          commission_amount?: number
          created_at?: string
          gross_sales?: number
          id?: string
          merchant_id: string
          net_payout?: number
          notes?: string | null
          paid_at?: string | null
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["settlement_status"]
          updated_at?: string
        }
        Update: {
          commission_amount?: number
          created_at?: string
          gross_sales?: number
          id?: string
          merchant_id?: string
          net_payout?: number
          notes?: string | null
          paid_at?: string | null
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["settlement_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          body: string | null
          context_role: string | null
          created_at: string
          id: string
          merchant_id: string | null
          opened_by: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          related_order_id: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          body?: string | null
          context_role?: string | null
          created_at?: string
          id?: string
          merchant_id?: string | null
          opened_by: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          related_order_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          body?: string | null
          context_role?: string | null
          created_at?: string
          id?: string
          merchant_id?: string | null
          opened_by?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          related_order_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          merchant_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_merchant_fk"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_merchant_fk"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      merchants_public: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          delivery_radius_km: number | null
          description: string | null
          id: string | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string | null
          postcode: string | null
          rating: number | null
          slug: string | null
          state: string | null
          status: Database["public"]["Enums"]["merchant_status"] | null
          total_orders: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          delivery_radius_km?: number | null
          description?: string | null
          id?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string | null
          postcode?: string | null
          rating?: number | null
          slug?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["merchant_status"] | null
          total_orders?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          delivery_radius_km?: number | null
          description?: string | null
          id?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string | null
          postcode?: string | null
          rating?: number | null
          slug?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["merchant_status"] | null
          total_orders?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      riders_public: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          merchant_id: string | null
          profile_image_url: string | null
          rating: number | null
          status: Database["public"]["Enums"]["rider_status"] | null
          total_deliveries: number | null
          updated_at: string | null
          user_id: string | null
          vehicle_plate: string | null
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          merchant_id?: string | null
          profile_image_url?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["rider_status"] | null
          total_deliveries?: number | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          merchant_id?: string | null
          profile_image_url?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["rider_status"] | null
          total_deliveries?: number | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "riders_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riders_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      user_merchant_id: { Args: { _user_id: string }; Returns: string }
      validate_promotion: {
        Args: { _code: string }
        Returns: {
          applies_to: string
          code: string
          id: string
          max_discount: number
          merchant_id: string
          min_order_amount: number
          type: Database["public"]["Enums"]["promotion_type"]
          value: number
        }[]
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "operation_admin"
        | "finance_admin"
        | "support_admin"
        | "merchant_owner"
        | "merchant_manager"
        | "merchant_staff"
        | "merchant_rider"
        | "rider"
        | "customer"
        | "buyer"
      application_status: "pending" | "approved" | "rejected"
      commission_type: "percent" | "flat"
      company_verification_status: "pending" | "approved" | "rejected"
      delivery_type: "immediate" | "scheduled"
      inventory_movement_type:
        | "in"
        | "out"
        | "reserved"
        | "released"
        | "adjustment"
      merchant_status: "pending" | "active" | "suspended" | "rejected"
      notification_type:
        | "order"
        | "payment"
        | "promotion"
        | "system"
        | "support"
      order_item_type: "refill" | "new_cylinder" | "deposit"
      order_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "preparing"
        | "assigned"
        | "rider_accepted"
        | "arrived_at_merchant"
        | "picked_up"
        | "on_delivery"
        | "arrived_at_customer"
        | "delivered"
        | "failed"
        | "cancelled"
        | "refunded"
      payment_method:
        | "fpx"
        | "card"
        | "ewallet"
        | "cod"
        | "billplz"
        | "toyyibpay"
        | "ipay88"
      payment_status:
        | "pending"
        | "paid"
        | "failed"
        | "refunded"
        | "partial_refund"
      promotion_type: "percent" | "flat" | "free_delivery"
      refund_pickup_status:
        | "not_required"
        | "pending"
        | "picked_up"
        | "returned"
      refund_stage: "pre_dispatch" | "in_transit" | "delivered"
      refund_status: "requested" | "approved" | "rejected" | "processed"
      rider_status: "offline" | "online" | "busy" | "suspended"
      settlement_status: "pending" | "processing" | "paid" | "failed"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
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
      app_role: [
        "super_admin",
        "admin",
        "operation_admin",
        "finance_admin",
        "support_admin",
        "merchant_owner",
        "merchant_manager",
        "merchant_staff",
        "merchant_rider",
        "rider",
        "customer",
        "buyer",
      ],
      application_status: ["pending", "approved", "rejected"],
      commission_type: ["percent", "flat"],
      company_verification_status: ["pending", "approved", "rejected"],
      delivery_type: ["immediate", "scheduled"],
      inventory_movement_type: [
        "in",
        "out",
        "reserved",
        "released",
        "adjustment",
      ],
      merchant_status: ["pending", "active", "suspended", "rejected"],
      notification_type: ["order", "payment", "promotion", "system", "support"],
      order_item_type: ["refill", "new_cylinder", "deposit"],
      order_status: [
        "pending",
        "accepted",
        "rejected",
        "preparing",
        "assigned",
        "rider_accepted",
        "arrived_at_merchant",
        "picked_up",
        "on_delivery",
        "arrived_at_customer",
        "delivered",
        "failed",
        "cancelled",
        "refunded",
      ],
      payment_method: [
        "fpx",
        "card",
        "ewallet",
        "cod",
        "billplz",
        "toyyibpay",
        "ipay88",
      ],
      payment_status: [
        "pending",
        "paid",
        "failed",
        "refunded",
        "partial_refund",
      ],
      promotion_type: ["percent", "flat", "free_delivery"],
      refund_pickup_status: [
        "not_required",
        "pending",
        "picked_up",
        "returned",
      ],
      refund_stage: ["pre_dispatch", "in_transit", "delivered"],
      refund_status: ["requested", "approved", "rejected", "processed"],
      rider_status: ["offline", "online", "busy", "suspended"],
      settlement_status: ["pending", "processing", "paid", "failed"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
    },
  },
} as const

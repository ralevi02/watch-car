// Generado desde Supabase (proyecto watch-car). No editar a mano: regenerar tras cada migración.

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
      remates: {
        Row: {
          anio: number | null
          color: string | null
          condicion: string | null
          crudo: Json
          fecha: string | null
          fotos: string[]
          fuente: string
          id: string
          km: number | null
          lote: string | null
          mandante: string | null
          marca: string | null
          modelo: string | null
          patente: string | null
          precio: number | null
          url: string | null
          visto_en: string
        }
        Insert: {
          anio?: number | null
          color?: string | null
          condicion?: string | null
          crudo?: Json
          fecha?: string | null
          fotos?: string[]
          fuente: string
          id: string
          km?: number | null
          lote?: string | null
          mandante?: string | null
          marca?: string | null
          modelo?: string | null
          patente?: string | null
          precio?: number | null
          url?: string | null
          visto_en?: string
        }
        Update: {
          anio?: number | null
          color?: string | null
          condicion?: string | null
          crudo?: Json
          fecha?: string | null
          fotos?: string[]
          fuente?: string
          id?: string
          km?: number | null
          lote?: string | null
          mandante?: string | null
          marca?: string | null
          modelo?: string | null
          patente?: string | null
          precio?: number | null
          url?: string | null
          visto_en?: string
        }
        Relationships: []
      }
      uso_ia: {
        Row: {
          creado_en: string
          dia: string
          id: number
          modelo: string
          uso: string
        }
        Insert: {
          creado_en?: string
          dia?: string
          id?: number
          modelo: string
          uso: string
        }
        Update: {
          creado_en?: string
          dia?: string
          id?: number
          modelo?: string
          uso?: string
        }
        Relationships: []
      }
      opiniones: {
        Row: {
          creada_en: string
          id: string
          nombre: string
          texto: string | null
          token: string
          voto: string
        }
        Insert: {
          creada_en?: string
          id?: string
          nombre: string
          texto?: string | null
          token: string
          voto: string
        }
        Update: {
          creada_en?: string
          id?: string
          nombre?: string
          texto?: string | null
          token?: string
          voto?: string
        }
        Relationships: []
      }
      enlaces_publicos: {
        Row: {
          activo: boolean
          auto_id: string
          creado_en: string
          token: string
        }
        Insert: {
          activo?: boolean
          auto_id: string
          creado_en?: string
          token?: string
        }
        Update: {
          activo?: boolean
          auto_id?: string
          creado_en?: string
          token?: string
        }
        Relationships: []
      }
      correcciones: {
        Row: {
          aviso_id: string | null
          campo: string
          creada_en: string
          descripcion: string | null
          id: string
          titulo: string
          valor: string
        }
        Insert: {
          aviso_id?: string | null
          campo: string
          creada_en?: string
          descripcion?: string | null
          id?: string
          titulo: string
          valor: string
        }
        Update: {
          aviso_id?: string | null
          campo?: string
          creada_en?: string
          descripcion?: string | null
          id?: string
          titulo?: string
          valor?: string
        }
        Relationships: []
      }
      ajustes: {
        Row: {
          actualizado_en: string
          clave: string
          valor: Json
        }
        Insert: {
          actualizado_en?: string
          clave: string
          valor: Json
        }
        Update: {
          actualizado_en?: string
          clave?: string
          valor?: Json
        }
        Relationships: []
      }
      autos: {
        Row: {
          anio: number | null
          creado_en: string
          id: string
          km: number | null
          marca: string | null
          modelo: string | null
          region: string | null
          version: string | null
        }
        Insert: {
          anio?: number | null
          creado_en?: string
          id?: string
          km?: number | null
          marca?: string | null
          modelo?: string | null
          region?: string | null
          version?: string | null
        }
        Update: {
          anio?: number | null
          creado_en?: string
          id?: string
          km?: number | null
          marca?: string | null
          modelo?: string | null
          region?: string | null
          version?: string | null
        }
        Relationships: []
      }
      avisos: {
        Row: {
          alertas: string[]
          anio: number | null
          auto_id: string | null
          caja: string | null
          carroceria: string | null
          combustible: string | null
          alerta_detalle: string | null
          comuna: string | null
          cross_country: boolean | null
          descripcion: string | null
          estado: string
          foto_hash: string | null
          foto_url: string | null
          fuente_id: string
          id: string
          id_externo: string
          km: number | null
          marca: string | null
          modelo: string | null
          motor: string | null
          normalizado_en: string | null
          normalizado_hash: string | null
          por_confirmar: string[]
          precio: number | null
          precio_descripcion: number | null
          precio_inicial: number | null
          primera_vez: string
          region: string | null
          tipo_vendedor: string | null
          tipo: string | null
          titulo: string
          traccion: string | null
          ultima_vez: string
          url: string
          veces_no_visto: number
          vendedor: string | null
          version: string | null
          fotos: string[]
          separado: boolean
          remate: Json | null
        }
        Insert: {
          alertas?: string[]
          anio?: number | null
          auto_id?: string | null
          caja?: string | null
          carroceria?: string | null
          combustible?: string | null
          alerta_detalle?: string | null
          comuna?: string | null
          cross_country?: boolean | null
          descripcion?: string | null
          estado?: string
          foto_hash?: string | null
          foto_url?: string | null
          fuente_id: string
          id?: string
          id_externo: string
          km?: number | null
          marca?: string | null
          modelo?: string | null
          motor?: string | null
          normalizado_en?: string | null
          normalizado_hash?: string | null
          por_confirmar?: string[]
          precio?: number | null
          precio_descripcion?: number | null
          precio_inicial?: number | null
          primera_vez?: string
          region?: string | null
          tipo_vendedor?: string | null
          tipo?: string | null
          titulo: string
          traccion?: string | null
          ultima_vez?: string
          url: string
          veces_no_visto?: number
          vendedor?: string | null
          version?: string | null
          fotos?: string[]
          separado?: boolean
          remate?: Json | null
        }
        Update: {
          alertas?: string[]
          anio?: number | null
          auto_id?: string | null
          caja?: string | null
          carroceria?: string | null
          combustible?: string | null
          alerta_detalle?: string | null
          comuna?: string | null
          cross_country?: boolean | null
          descripcion?: string | null
          estado?: string
          foto_hash?: string | null
          foto_url?: string | null
          fuente_id?: string
          id?: string
          id_externo?: string
          km?: number | null
          marca?: string | null
          modelo?: string | null
          motor?: string | null
          normalizado_en?: string | null
          normalizado_hash?: string | null
          por_confirmar?: string[]
          precio?: number | null
          precio_descripcion?: number | null
          precio_inicial?: number | null
          primera_vez?: string
          region?: string | null
          tipo_vendedor?: string | null
          tipo?: string | null
          titulo?: string
          traccion?: string | null
          ultima_vez?: string
          url?: string
          veces_no_visto?: number
          vendedor?: string | null
          version?: string | null
          fotos?: string[]
          separado?: boolean
          remate?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "avisos_auto_id_fkey"
            columns: ["auto_id"]
            isOneToOne: false
            referencedRelation: "autos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avisos_fuente_id_fkey"
            columns: ["fuente_id"]
            isOneToOne: false
            referencedRelation: "fuentes"
            referencedColumns: ["id"]
          },
        ]
      }
      avisos_crudos: {
        Row: {
          creado_en: string
          datos: Json
          fuente_id: string
          hash: string
          id: number
          id_externo: string
          pasada_id: string | null
          tipo: string
        }
        Insert: {
          creado_en?: string
          datos: Json
          fuente_id: string
          hash: string
          id?: never
          id_externo: string
          pasada_id?: string | null
          tipo: string
        }
        Update: {
          creado_en?: string
          datos?: Json
          fuente_id?: string
          hash?: string
          id?: never
          id_externo?: string
          pasada_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "avisos_crudos_fuente_id_fkey"
            columns: ["fuente_id"]
            isOneToOne: false
            referencedRelation: "fuentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avisos_crudos_pasada_id_fkey"
            columns: ["pasada_id"]
            isOneToOne: false
            referencedRelation: "pasadas"
            referencedColumns: ["id"]
          },
        ]
      }
      busquedas: {
        Row: {
          activa: boolean
          actualizada_en: string
          alertas: boolean
          creada_en: string
          ficha: Json
          id: string
          nombre: string
        }
        Insert: {
          activa?: boolean
          actualizada_en?: string
          alertas?: boolean
          creada_en?: string
          ficha: Json
          id?: string
          nombre: string
        }
        Update: {
          activa?: boolean
          actualizada_en?: string
          alertas?: boolean
          creada_en?: string
          ficha?: Json
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      compartidos: {
        Row: {
          aviso_id: string | null
          creado_en: string
          error: string | null
          estado: string
          fuente_id: string | null
          id: string
          id_externo: string | null
          procesado_en: string | null
          texto: string | null
          url: string
        }
        Insert: {
          aviso_id?: string | null
          creado_en?: string
          error?: string | null
          estado?: string
          fuente_id?: string | null
          id?: string
          id_externo?: string | null
          procesado_en?: string | null
          texto?: string | null
          url: string
        }
        Update: {
          aviso_id?: string | null
          creado_en?: string
          error?: string | null
          estado?: string
          fuente_id?: string | null
          id?: string
          id_externo?: string | null
          procesado_en?: string | null
          texto?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "compartidos_aviso_id_fkey"
            columns: ["aviso_id"]
            isOneToOne: false
            referencedRelation: "avisos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compartidos_fuente_id_fkey"
            columns: ["fuente_id"]
            isOneToOne: false
            referencedRelation: "fuentes"
            referencedColumns: ["id"]
          },
        ]
      }
      cuentas_facebook: {
        Row: {
          creada_en: string
          estado: string
          id: string
          nombre: string
          orden: number
          pasadas_fecha: string | null
          pasadas_hoy: number
          secreto_id: string | null
          sesion_guardada_en: string | null
          ultima_ok: string | null
          ultimo_error: string | null
        }
        Insert: {
          creada_en?: string
          estado?: string
          id?: string
          nombre: string
          orden?: number
          pasadas_fecha?: string | null
          pasadas_hoy?: number
          secreto_id?: string | null
          sesion_guardada_en?: string | null
          ultima_ok?: string | null
          ultimo_error?: string | null
        }
        Update: {
          creada_en?: string
          estado?: string
          id?: string
          nombre?: string
          orden?: number
          pasadas_fecha?: string | null
          pasadas_hoy?: number
          secreto_id?: string | null
          sesion_guardada_en?: string | null
          ultima_ok?: string | null
          ultimo_error?: string | null
        }
        Relationships: []
      }
      duenos: {
        Row: {
          creado_en: string
          user_id: string
        }
        Insert: {
          creado_en?: string
          user_id: string
        }
        Update: {
          creado_en?: string
          user_id?: string
        }
        Relationships: []
      }
      fuentes: {
        Row: {
          activa: boolean
          config: Json
          id: string
          nombre: string
        }
        Insert: {
          activa?: boolean
          config?: Json
          id: string
          nombre: string
        }
        Update: {
          activa?: boolean
          config?: Json
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      marcas: {
        Row: {
          actualizada_en: string
          auto_id: string
          estado: string | null
          nota: string | null
          contacto: string | null
          motivo_descarte: string | null
          llamadas: Json
          visita: Json
          visita_en: string | null
        }
        Insert: {
          actualizada_en?: string
          auto_id: string
          estado?: string | null
          nota?: string | null
          contacto?: string | null
          motivo_descarte?: string | null
          llamadas?: Json
          visita?: Json
          visita_en?: string | null
        }
        Update: {
          actualizada_en?: string
          auto_id?: string
          estado?: string | null
          nota?: string | null
          contacto?: string | null
          motivo_descarte?: string | null
          llamadas?: Json
          visita?: Json
          visita_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marcas_auto_id_fkey"
            columns: ["auto_id"]
            isOneToOne: true
            referencedRelation: "autos"
            referencedColumns: ["id"]
          },
        ]
      }
      pasadas: {
        Row: {
          avisos_nuevos: number | null
          avisos_vistos: number | null
          busqueda_id: string | null
          detalle: Json
          estado: string
          fin: string | null
          fuente_id: string
          id: string
          inicio: string
          kb: number | null
          paginas: number | null
          tipo: string
        }
        Insert: {
          avisos_nuevos?: number | null
          avisos_vistos?: number | null
          busqueda_id?: string | null
          detalle?: Json
          estado?: string
          fin?: string | null
          fuente_id: string
          id?: string
          inicio?: string
          kb?: number | null
          paginas?: number | null
          tipo: string
        }
        Update: {
          avisos_nuevos?: number | null
          avisos_vistos?: number | null
          busqueda_id?: string | null
          detalle?: Json
          estado?: string
          fin?: string | null
          fuente_id?: string
          id?: string
          inicio?: string
          kb?: number | null
          paginas?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "pasadas_busqueda_id_fkey"
            columns: ["busqueda_id"]
            isOneToOne: false
            referencedRelation: "busquedas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pasadas_fuente_id_fkey"
            columns: ["fuente_id"]
            isOneToOne: false
            referencedRelation: "fuentes"
            referencedColumns: ["id"]
          },
        ]
      }
      precios: {
        Row: {
          aviso_id: string
          id: number
          precio: number
          visto_en: string
        }
        Insert: {
          aviso_id: string
          id?: never
          precio: number
          visto_en?: string
        }
        Update: {
          aviso_id?: string
          id?: never
          precio?: number
          visto_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "precios_aviso_id_fkey"
            columns: ["aviso_id"]
            isOneToOne: false
            referencedRelation: "avisos"
            referencedColumns: ["id"]
          },
        ]
      }
      push_suscripciones: {
        Row: {
          auth: string
          creada_en: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          creada_en?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id?: string
        }
        Update: {
          auth?: string
          creada_en?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      reconexiones: {
        Row: {
          actualizada_en: string
          clave: string | null
          creada_en: string
          cuenta_id: string
          error: string | null
          estado: string
          id: string
          run_url: string | null
          url: string | null
        }
        Insert: {
          actualizada_en?: string
          clave?: string | null
          creada_en?: string
          cuenta_id: string
          error?: string | null
          estado?: string
          id?: string
          run_url?: string | null
          url?: string | null
        }
        Update: {
          actualizada_en?: string
          clave?: string | null
          creada_en?: string
          cuenta_id?: string
          error?: string | null
          estado?: string
          id?: string
          run_url?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconexiones_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas_facebook"
            referencedColumns: ["id"]
          },
        ]
      }
      resultados: {
        Row: {
          aviso_id: string
          busqueda_id: string
          evaluado_en: string
          motivos: string[]
          notificado_en: string | null
          veredicto: string
          casi: boolean
        }
        Insert: {
          aviso_id: string
          busqueda_id: string
          evaluado_en?: string
          motivos?: string[]
          notificado_en?: string | null
          veredicto: string
          casi?: boolean
        }
        Update: {
          aviso_id?: string
          busqueda_id?: string
          evaluado_en?: string
          motivos?: string[]
          notificado_en?: string | null
          veredicto?: string
          casi?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "resultados_aviso_id_fkey"
            columns: ["aviso_id"]
            isOneToOne: false
            referencedRelation: "avisos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resultados_busqueda_id_fkey"
            columns: ["busqueda_id"]
            isOneToOne: false
            referencedRelation: "busquedas"
            referencedColumns: ["id"]
          },
        ]
      }
      secretos_app: {
        Row: {
          actualizado_en: string
          nombre: string
          secreto_id: string
        }
        Insert: {
          actualizado_en?: string
          nombre: string
          secreto_id: string
        }
        Update: {
          actualizado_en?: string
          nombre?: string
          secreto_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_publico: { Args: { p_token: string }; Returns: Json }
      opinar: { Args: { p_nombre: string; p_texto: string; p_token: string; p_voto: string }; Returns: boolean }
      guardar_sesion_facebook: {
        Args: { p_cuenta: string; p_sesion: string }
        Returns: undefined
      }
      guardar_secreto_app: {
        Args: { p_nombre: string; p_valor: string }
        Returns: undefined
      }
      borrar_token_github: { Args: never; Returns: undefined }
      leer_secreto_app: { Args: { p_nombre: string }; Returns: string }
      leer_token_github: { Args: never; Returns: string | null }
      leer_sesion_facebook: { Args: { p_cuenta: string }; Returns: string }
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

export type Tables<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Update"]

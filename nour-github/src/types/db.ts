// =====================================================================
// Types miroirs des collections PocketBase NOBTY.
// Convention :
//   - Les champs `relation` exposent l'ID du record cible sous le NOM du
//     champ tel que défini dans la migration (ex: `service`, `user`, `wilaya`).
//   - Pour récupérer le record complet, utilisez `expand` côté requête,
//     puis lisez `record.expand?.service`.
// =====================================================================

export type Lang = 'fr' | 'ar' | 'en';
export type Theme = 'light' | 'dark' | 'auto';
export type Role = 'citizen' | 'agent' | 'admin';
export type TicketStatus = 'waiting' | 'called' | 'served' | 'cancelled' | 'missed';

export type InstitutionFamily =
  | 'finance'
  | 'sante'
  | 'justice'
  | 'admin_civile'
  | 'social_emploi'
  | 'reseaux'
  | 'fiscalite_commerce';

/** Champs système ajoutés par PocketBase à chaque record. */
interface BaseRecord {
  id: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
}

export interface Wilaya extends BaseRecord {
  code: string;
  name_fr: string;
  name_ar: string;
  lat: number;
  lng: number;
  is_new: boolean;
}

export interface InstitutionType extends BaseRecord {
  key: string;
  name_fr: string;
  name_ar: string;
  name_en: string;
  family: InstitutionFamily;
  icon: string;
  sort_order: number;
}

export interface Establishment extends BaseRecord {
  type: string;        // relation → institution_types.id
  wilaya: string;      // relation → wilayas.id
  name: string;
  address: string;
  lat: number;
  lng: number;
  opening_hours: Record<string, [string, string] | null>;
  is_active: boolean;
}

export interface Service extends BaseRecord {
  establishment: string;   // relation → establishments.id
  name_fr: string;
  name_ar: string;
  name_en: string;
  avg_duration_min: number;
  is_active: boolean;
}

/** Représentation côté front du record `users` PocketBase. */
export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  lang: Lang;
  theme: Theme;
  role: Role;
  /** id de l'établissement où l'agent travaille (null pour citizen) */
  agent_establishment_id: string | null;
}

export interface QueueCounter extends BaseRecord {
  service: string;      // relation → services.id
  last_number: number;
  now_serving: number;
}

export interface Ticket extends BaseRecord {
  user: string;         // relation → users.id
  service: string;      // relation → services.id
  number: number;
  status: TicketStatus;
  issued_at: string;
  called_at: string | null;
  served_at: string | null;
  est_wait_min: number | null;
}

export interface NotificationRow extends BaseRecord {
  user: string;
  ticket: string | null;
  title: string;
  body: string;
  read: boolean;
}

export type Role = "admin" | "cashier" | "bar" | "rrpp";
export type EventStatus = "draft" | "active" | "closed";
export type RegistrationStatus = "registered" | "checked_in" | "expired";
export type CheckinResult =
  | "valid_entry"
  | "used_qr"
  | "expired_qr"
  | "invalid_qr"
  | "gold_entry";
export type RewardStatus = "locked" | "unlocked" | "redeemed";
export type BenefitStatus = "pending" | "issued" | "redeemed";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  active: boolean;
  created_at: string;
}

export interface RrppProfile {
  id: string;
  profile_id: string;
  display_name: string;
  slug: string;
  active: boolean;
  created_at: string;
  profiles?: Profile;
}

export interface Event {
  id: string;
  name: string;
  event_date: string;
  status: EventStatus;
  registration_until: string | null;
  qr_entry_until: string | null;
  created_by: string;
  created_at: string;
  closed_at: string | null;
}

export interface GuestRegistration {
  id: string;
  event_id: string;
  rrpp_id: string;
  first_name: string;
  last_name: string;
  dni_last3: string;
  qr_token: string;
  registration_status: RegistrationStatus;
  created_at: string;
  rrpp_profiles?: RrppProfile;
}

export interface Checkin {
  id: string;
  event_id: string;
  registration_id: string | null;
  rrpp_id: string | null;
  checked_in_at: string;
  checked_in_by: string;
  result: CheckinResult;
}

export interface RrppEventBenefit {
  id: string;
  event_id: string;
  rrpp_id: string;
  benefit_type: string;
  title: string;
  status: BenefitStatus;
  issued_at: string | null;
  redeemed_at: string | null;
  redeemed_by: string | null;
}

export interface RrppEventReward {
  id: string;
  event_id: string;
  rrpp_id: string;
  reward_type: string;
  title: string;
  trigger_count: number;
  status: RewardStatus;
  qr_token: string | null;
  issued_at: string | null;
  expires_at: string | null;
  redeemed_at: string | null;
  redeemed_by: string | null;
}

export interface GoldQr {
  id: string;
  event_id: string;
  title: string;
  qr_token: string;
  max_uses: number;
  used_count: number;
  valid_until: string | null;
  created_by: string;
  status: string;
  created_at: string;
}

export interface PromoQr {
  id: string;
  title: string;
  description: string | null;
  qr_token: string;
  max_uses: number;
  used_count: number;
  valid_date: string | null;
  valid_from: string | null;
  valid_until: string | null;
  status: string;
  created_by: string;
  created_at: string;
}

export interface RrppRanking {
  rrpp_id: string;
  display_name: string;
  slug: string;
  event_id: string;
  event_name: string;
  checkin_count: number;
  position: number;
}

export interface ScanResult {
  success: boolean;
  result: CheckinResult;
  message: string;
  guest?: GuestRegistration;
  rrppName?: string;
  color: "green" | "yellow" | "red" | "gold";
}

export interface EventSnapshot {
  id: string;
  event_id: string;
  event_name: string;
  event_date: string;
  closed_at: string;
  total_guests: number;
  total_checkins: number;
  total_gold: number;
  total_rrpp_active: number;
  ranking_json: RrppRanking[];
  top3_json: RrppRanking[];
  summary_json: Record<string, unknown>;
  created_at: string;
}

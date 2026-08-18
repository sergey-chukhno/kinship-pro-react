/** Réponse GET /api/v1/proofs/pb/:token — champs plats (proof_manifest). */
export interface BadgeProofApiResponse {
  proof_number: string;
  proof_type: 'PB' | 'PE';
  badge_id?: number | null;
  badge_title?: string | null;
  badge_level?: string | null;
  badge_eqf_level?: string | null;
  badge_eqf_framework?: string | null;
  series_id?: number | null;
  series_name?: string | null;
  series_scope?: string | null;
  series_owner?: string | null;
  series_authority_entity_type?: string | null;
  series_authority_entity_id?: number | null;
  holder_uuid?: number | string | null;
  holder_display: string;
  sender_name?: string | null;
  sender_job?: string | null;
  sender_role?: string | null;
  organization_name?: string | null;
  organization_country?: string | null;
  organization_trust_level?: string | null;
  series_authority_qa_type?: string | null;
  qa_type?: string | null;
  quality_framework?: string | null;
  sector_context?: string | null;
  skills_indicated?: string[];
  evidence_hash?: string | null;
  evidence_type?: string | null;
  evidence_filename?: string | null;
  sender_comment?: string | null;
  payload_hash?: string | null;
  hash_version?: string | null;
  timestamp_utc?: string | null;
  retention_policy?: string | null;
  pp_proof_number?: string | null;
  platform_signature?: string | null;
  badge_role?: string | null;
  project_id?: number | null;
  project_title?: string | null;
  event_id?: number | null;
  event_title?: string | null;
  event_language?: string | null;
  presence_verified?: boolean | null;
  presence_date?: string | null;
  presence_location?: string | null;
  /** Enveloppe API (optionnelle selon version backend) */
  share_token?: string;
  show_owner_name?: boolean;
  /** Bulle présence — afficher tel quel, sans transformation front */
  attestation_label?: string;
  proof_manifest?: Partial<BadgeProofApiResponse>;
}

export interface UserBadgeProofSummary {
  id: number;
  share_token?: string | null;
  proof_number?: string | null;
  proof_type?: 'PB' | 'PE' | null;
  event?: unknown | null;
  status?: string;
}

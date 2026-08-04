export class ViolationResponseDto {
  id!: string;
  violation_code!: string;
  track_id!: number;
  camera_id!: string;
  detected_at!: Date;
  shift!: string;
  helm_color_detected!: string;
  role_detected!: string;
  missing_helm!: boolean;
  missing_vest!: boolean;
  missing_shoes!: boolean;
  missing_ppe_list!: string[];
  confidence!: number;
  bbox!: [number, number, number, number];
  frame_path!: string | null;
  frame_key!: string | null;
  personnel_id!: string | null;
  personnel_name!: string | null;
  linked_at!: Date | null;
  // Status lifecycle
  status!: 'pending' | 'confirmed' | 'rejected';
  rejected_by!: string | null;
  rejected_at!: Date | null;
  reject_reason!: string | null;
  links!: { personnel_id: string; personnel?: { full_name: string } }[];
}

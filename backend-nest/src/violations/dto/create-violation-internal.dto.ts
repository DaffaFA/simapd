export class CreateViolationInternalDto {
  track_id!: number;
  camera_id!: string;
  detected_at!: Date;
  helm_color_detected!: string;
  role_detected!: string;
  missing_helm!: boolean;
  missing_vest!: boolean;
  missing_shoes!: boolean;
  confidence!: number;
  bbox_x1!: number;
  bbox_y1!: number;
  bbox_x2!: number;
  bbox_y2!: number;
  frame_path?: string;
  frame_key?: string;
}

export class UserResponseDto {
  id!: string;
  username!: string;
  email!: string;
  full_name!: string | null;
  role!: string;
  is_active!: boolean;
  last_login!: Date | null;
  signature!: string | null;
  created_at!: Date;
  updated_at!: Date;
}

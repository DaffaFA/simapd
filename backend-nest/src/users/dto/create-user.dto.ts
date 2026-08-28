import { IsString, IsNotEmpty, IsEmail, IsEnum, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  full_name?: string;

  @IsEnum(['admin', 'supervisor', 'safety_officer'])
  role!: string;

  // Data URI base64 (mis. "data:image/png;base64,...") untuk tanda tangan di Surat Peringatan.
  @IsOptional()
  @IsString()
  @MaxLength(2_000_000)
  signature?: string | null;
}

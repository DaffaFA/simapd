import { CreatePersonnelDto } from './create-personnel.dto';
declare const UpdatePersonnelDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreatePersonnelDto>>;
export declare class UpdatePersonnelDto extends UpdatePersonnelDto_base {
    is_active?: boolean;
}
export {};

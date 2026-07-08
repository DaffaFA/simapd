import { BaseEntity } from '../../common/entities/base.entity';
export declare class User extends BaseEntity {
    username: string;
    email: string;
    hashed_password: string;
    full_name: string;
    role: string;
    is_active: boolean;
    last_login: Date;
}

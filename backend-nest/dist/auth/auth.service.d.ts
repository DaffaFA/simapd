import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from './entities/user.entity';
export declare class AuthService {
    private userRepo;
    private jwtService;
    constructor(userRepo: Repository<User>, jwtService: JwtService);
    validateUser(username: string, password: string): Promise<User | null>;
    login(user: User): {
        access_token: string;
        token_type: string;
        user: {
            id: string;
            username: string;
            full_name: string;
            role: string;
        };
    };
    findById(id: string): Promise<User | null>;
}

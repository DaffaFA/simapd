import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { User } from './entities/user.entity';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<{
        access_token: string;
        token_type: string;
        user: {
            id: string;
            username: string;
            full_name: string;
            role: string;
        };
    }>;
    getMe(user: User): {
        id: string;
        username: string;
        full_name: string;
        role: string;
    };
    logout(): {
        message: string;
    };
}

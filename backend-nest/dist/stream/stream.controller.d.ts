import { Repository } from 'typeorm';
import { Camera } from './entities/camera.entity';
import { StreamGateway } from './stream.gateway';
export declare class StreamController {
    private cameraRepo;
    private gateway;
    constructor(cameraRepo: Repository<Camera>, gateway: StreamGateway);
    getCameras(): Promise<Camera[]>;
    getStatus(): {
        ws_clients: number;
        timestamp: string;
    };
}

import { BaseEntity } from '../../common/entities/base.entity';
export declare class Camera extends BaseEntity {
    camera_id: string;
    name: string;
    zone: string;
    rtsp_url: string;
    is_active: boolean;
    description: string;
}

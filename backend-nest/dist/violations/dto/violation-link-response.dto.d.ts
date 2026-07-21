export declare class ViolationLinkResponseDto {
    id: string;
    personnel_id: string;
    personnel: {
        id: string;
        employee_id: string;
        full_name: string;
        role: string;
        department: string;
    };
    linked_by: string;
    linked_at: string;
    notes: string | null;
}

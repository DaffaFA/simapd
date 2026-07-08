export declare class PaginatedResponseDto<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    static of<T>(items: T[], total: number, page: number, pageSize: number): PaginatedResponseDto<T>;
}

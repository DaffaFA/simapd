"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginatedResponseDto = void 0;
class PaginatedResponseDto {
    static of(items, total, page, pageSize) {
        return {
            items,
            total,
            page,
            page_size: pageSize,
            total_pages: Math.ceil(total / pageSize),
        };
    }
}
exports.PaginatedResponseDto = PaginatedResponseDto;
//# sourceMappingURL=paginated-response.dto.js.map
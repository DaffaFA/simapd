export class PaginatedResponseDto<T> {
  items!: T[];
  total!: number;
  page!: number;
  page_size!: number;
  total_pages!: number;

  static of<T>(
    items: T[],
    total: number,
    page: number,
    pageSize: number,
  ): PaginatedResponseDto<T> {
    return {
      items,
      total,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(total / pageSize),
    };
  }
}

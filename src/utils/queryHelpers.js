/**
 * Reusable query helper for pagination, filtering, and sorting.
 * Keeps controller code DRY by centralizing common SQL patterns.
 */

/**
 * Build a paginated, filtered, and sorted SELECT query.
 *
 * @param {Object} options
 * @param {string} options.baseQuery   - e.g. "SELECT * FROM products"
 * @param {Object} options.filters     - { column: value } pairs for WHERE clauses
 * @param {Object} options.search      - { columns: ['title','brand'], term: 'beard' }
 * @param {string} options.sortColumn  - column to sort by
 * @param {string} options.sortOrder   - 'ASC' or 'DESC'
 * @param {number} options.page        - 1-indexed page number
 * @param {number} options.limit       - items per page
 * @returns {{ text: string, values: any[], countText: string, countValues: any[] }}
 */
const buildPaginatedQuery = ({
  baseQuery,
  filters = {},
  search = null,
  sortColumn = 'created_at',
  sortOrder = 'DESC',
  page = 1,
  limit = 20,
}) => {
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  // Filters (exact match)
  for (const [column, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      conditions.push(`${column} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  // Search (ILIKE on multiple columns)
  if (search && search.term && search.columns && search.columns.length > 0) {
    const searchConditions = search.columns.map((col) => {
      conditions.length; // no-op, just for clarity
      const cond = `${col} ILIKE $${paramIndex}`;
      return cond;
    });
    // All search columns share the same parameter
    conditions.push(`(${searchConditions.join(' OR ')})`);
    values.push(`%${search.term}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

  // Validate sort order
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const offset = (Math.max(1, page) - 1) * limit;

  const text = `${baseQuery}${whereClause} ORDER BY ${sortColumn} ${safeSortOrder} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  const queryValues = [...values, limit, offset];

  // Count query for pagination metadata
  // Use a more robust replacement that handles multi-line queries (s flag)
  const countBase = baseQuery.replace(/SELECT\s+[\s\S]+?\s+FROM/i, 'SELECT COUNT(*) FROM');
  const countText = `${countBase}${whereClause}`;

  return { text, values: queryValues, countText, countValues: values };
};

/**
 * Parse pagination params from request query string.
 * @param {Object} query - req.query
 * @returns {{ page: number, limit: number }}
 */
const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit };
};

/**
 * Build pagination metadata for response.
 */
const buildPaginationMeta = (totalCount, page, limit) => {
  const totalPages = Math.ceil(totalCount / limit);
  return {
    currentPage: page,
    totalPages,
    totalItems: parseInt(totalCount, 10),
    itemsPerPage: limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * Generate a unique order number in format S-XXXXXX.
 */
const generateOrderNumber = () => {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `S-${num}`;
};

module.exports = {
  buildPaginatedQuery,
  parsePagination,
  buildPaginationMeta,
  generateOrderNumber,
};

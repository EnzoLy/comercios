import { DataSource } from 'typeorm'
import { Sale, SaleStatus } from '../entities/sale.entity'
import { SaleItem } from '../entities/sale-item.entity'
import { Product } from '../entities/product.entity'
import { Category } from '../entities/category.entity'
import { User } from '../entities/user.entity'

export type Granularity = 'day' | 'week' | 'month'

export interface DailySalesResult {
  date: string
  revenue: string
  transactions: number
  avgTransaction: string
}

export interface MonthlySalesResult {
  month: string
  revenue: string
  transactions: number
  avgTransaction: string
}

export interface EmployeePerformanceResult {
  employeeId: string
  employeeName: string
  transactions: number
  revenue: string
  avgTransaction: string
  lastSaleDate: Date | null
}

export interface ProductAnalyticsResult {
  productId: string
  productName: string
  sku: string
  categoryId: string | null
  categoryName: string | null
  quantitySold: number
  revenue: string
  avgPrice: string
  costPrice: string
  profit: string
  marginPercentage: string
  transactions: number
  totalTaxAmount: string
}

export interface CategoryAnalyticsResult {
  categoryId: string
  categoryName: string
  productsCount: number
  quantitySold: number
  revenue: string
  avgPerProduct: string
  percentageOfTotal: string
}

export interface AnalyticsParams {
  startDate: Date
  endDate: Date
}

/**
 * Get daily sales aggregation
 */
export async function getDailySales(
  dataSource: DataSource,
  storeId: string,
  { startDate, endDate }: AnalyticsParams
): Promise<DailySalesResult[]> {
  const results = await dataSource.query(
    `
    SELECT
      DATE(s."createdAt") as date,
      SUM(CAST(s.total AS DECIMAL(10,2))) as revenue,
      COUNT(s.id) as transactions,
      AVG(CAST(s.total AS DECIMAL(10,2))) as "avgTransaction"
    FROM sale s
    WHERE s."storeId" = $1
      AND s.status NOT IN ($2, $3)
      AND DATE(s."createdAt") >= DATE($4)
      AND DATE(s."createdAt") <= DATE($5)
    GROUP BY DATE(s."createdAt")
    ORDER BY DATE(s."createdAt") ASC
    `,
    [storeId, SaleStatus.PENDING, SaleStatus.CANCELLED, startDate, endDate]
  )

  return results.map((r: any) => ({
    date: r.date,
    revenue: String(r.revenue || 0),
    transactions: parseInt(r.transactions) || 0,
    avgTransaction: String(r.avgTransaction || 0),
  }))
}

/**
 * Get monthly sales aggregation
 */
export async function getMonthlySales(
  dataSource: DataSource,
  storeId: string,
  { startDate, endDate }: AnalyticsParams
): Promise<MonthlySalesResult[]> {
  const results = await dataSource.query(
    `
    SELECT
      TO_CHAR(s."createdAt", 'YYYY-MM') as month,
      SUM(CAST(s.total AS DECIMAL(10,2))) as revenue,
      COUNT(s.id) as transactions,
      AVG(CAST(s.total AS DECIMAL(10,2))) as "avgTransaction"
    FROM sale s
    WHERE s."storeId" = $1
      AND s.status NOT IN ($2, $3)
      AND DATE(s."createdAt") >= DATE($4)
      AND DATE(s."createdAt") <= DATE($5)
    GROUP BY TO_CHAR(s."createdAt", 'YYYY-MM')
    ORDER BY TO_CHAR(s."createdAt", 'YYYY-MM') ASC
    `,
    [storeId, SaleStatus.PENDING, SaleStatus.CANCELLED, startDate, endDate]
  )

  return results.map((r: any) => ({
    month: r.month,
    revenue: String(r.revenue || 0),
    transactions: parseInt(r.transactions) || 0,
    avgTransaction: String(r.avgTransaction || 0),
  }))
}

/**
 * Get employee performance metrics
 */
export async function getEmployeePerformance(
  dataSource: DataSource,
  storeId: string,
  { startDate, endDate }: AnalyticsParams
): Promise<EmployeePerformanceResult[]> {
  // Use raw SQL for reliable aggregation and proper NULL handling
  const results = await dataSource.query(
    `
    SELECT
      s."cashierId" as "employeeId",
      COALESCE(NULLIF(TRIM(u.name), ''), 'Empleado ' || SUBSTRING(s."cashierId"::text, 1, 8)) as "employeeName",
      COUNT(s.id)::int as transactions,
      SUM(CAST(s.total AS DECIMAL(10,2))) as revenue,
      AVG(CAST(s.total AS DECIMAL(10,2))) as "avgTransaction",
      MAX(s."createdAt") as "lastSaleDate"
    FROM sale s
    LEFT JOIN "user" u ON u.id = s."cashierId"
    WHERE s."storeId" = $1
      AND s.status NOT IN ($2, $3)
      AND DATE(s."createdAt") >= DATE($4)
      AND DATE(s."createdAt") <= DATE($5)
    GROUP BY s."cashierId", COALESCE(NULLIF(TRIM(u.name), ''), 'Empleado ' || SUBSTRING(s."cashierId"::text, 1, 8))
    ORDER BY transactions DESC
    `,
    [storeId, SaleStatus.PENDING, SaleStatus.CANCELLED, startDate, endDate]
  )

  return results.map((r: any) => ({
    employeeId: r.employeeId || 'unknown',
    employeeName: r.employeeName || 'Empleado sin nombre',
    transactions: r.transactions || 0,
    revenue: String(parseFloat(r.revenue || 0).toFixed(2)),
    avgTransaction: String(parseFloat(r.avgTransaction || 0).toFixed(2)),
    lastSaleDate: r.lastSaleDate || null,
  }))
}

/**
 * Get product analytics with profit/margin calculations
 */
export async function getProductAnalytics(
  dataSource: DataSource,
  storeId: string,
  { startDate, endDate }: AnalyticsParams
): Promise<ProductAnalyticsResult[]> {
  // Use raw SQL for reliable aggregation
  const results = await dataSource.query(
    `
    SELECT
      si."productId" as "productId",
      COALESCE(NULLIF(TRIM(si."productName"), ''), p.name, 'Producto sin nombre') as "productName",
      COALESCE(NULLIF(TRIM(si."productSku"), ''), p.sku, 'N/A') as "sku",
      p."categoryId" as "categoryId",
      c.name as "categoryName",
      p."costPrice" as "costPrice",
      SUM(si.quantity)::int as "quantitySold",
      SUM(CAST(si.total AS DECIMAL(10,2))) as revenue,
      COUNT(si.id)::int as transactions,
      SUM(CAST(si."taxAmount" AS DECIMAL(10,2))) as "totalTaxAmount"
    FROM sale_item si
    INNER JOIN sale s ON s.id = si."saleId"
    LEFT JOIN product p ON p.id = si."productId"
    LEFT JOIN category c ON c.id = p."categoryId"
    WHERE s."storeId" = $1
      AND s.status NOT IN ($2, $3)
      AND DATE(s."createdAt") >= DATE($4)
      AND DATE(s."createdAt") <= DATE($5)
      AND si."productId" IS NOT NULL
    GROUP BY si."productId", COALESCE(NULLIF(TRIM(si."productName"), ''), p.name, 'Producto sin nombre'),
             COALESCE(NULLIF(TRIM(si."productSku"), ''), p.sku, 'N/A'), p."categoryId", c.name, p."costPrice"
    ORDER BY "quantitySold" DESC
    `,
    [storeId, SaleStatus.PENDING, SaleStatus.CANCELLED, startDate, endDate]
  )

  return results.map((r: any) => {
    const quantitySold = r.quantitySold || 0
    const revenue = parseFloat(r.revenue || 0)
    const costPrice = parseFloat(r.costPrice || 0)
    const totalCost = costPrice * quantitySold
    const profit = revenue - totalCost
    const marginPercentage = revenue > 0 ? ((profit / revenue) * 100).toFixed(2) : '0.00'
    const avgPrice = quantitySold > 0 ? revenue / quantitySold : 0

    return {
      productId: r.productId || 'unknown',
      productName: r.productName || 'Producto sin nombre',
      sku: r.sku || 'N/A',
      categoryId: r.categoryId || null,
      categoryName: r.categoryName || null,
      quantitySold,
      revenue: String(revenue.toFixed(2)),
      avgPrice: String(avgPrice.toFixed(2)),
      costPrice: String(costPrice.toFixed(2)),
      profit: String(profit.toFixed(2)),
      marginPercentage,
      transactions: r.transactions || 0,
      totalTaxAmount: String(parseFloat(r.totalTaxAmount || 0).toFixed(2)),
    }
  })
}

/**
 * Get category analytics
 */
export async function getCategoryAnalytics(
  dataSource: DataSource,
  storeId: string,
  { startDate, endDate }: AnalyticsParams
): Promise<CategoryAnalyticsResult[]> {
  const results = await dataSource.query(
    `
    SELECT
      c.id as "categoryId",
      c.name as "categoryName",
      COUNT(DISTINCT p.id)::int as "productsCount",
      SUM(si.quantity)::int as "quantitySold",
      SUM(CAST(si.total AS DECIMAL(10,2))) as revenue
    FROM sale_item si
    INNER JOIN sale s ON s.id = si."saleId"
    INNER JOIN product p ON p.id = si."productId"
    LEFT JOIN category c ON c.id = p."categoryId"
    WHERE s."storeId" = $1
      AND s.status NOT IN ($2, $3)
      AND DATE(s."createdAt") >= DATE($4)
      AND DATE(s."createdAt") <= DATE($5)
      AND c.id IS NOT NULL
    GROUP BY c.id, c.name
    ORDER BY "quantitySold" DESC
    `,
    [storeId, SaleStatus.PENDING, SaleStatus.CANCELLED, startDate, endDate]
  )

  // Calculate total revenue for percentage calculation
  const totalRevenue = results.reduce((sum: number, r) => sum + parseFloat(r.revenue || 0), 0)

  return results.map((r: any) => {
    const revenue = parseFloat(r.revenue || 0)
    const productsCount = parseInt(r.productsCount) || 0
    const quantitySold = parseInt(r.quantitySold) || 0
    const avgPerProduct = productsCount > 0 ? (revenue / productsCount).toFixed(2) : '0.00'
    const percentageOfTotal = totalRevenue > 0 ? ((revenue / totalRevenue) * 100).toFixed(2) : '0.00'

    return {
      categoryId: r.categoryId,
      categoryName: r.categoryName || 'Uncategorized',
      productsCount,
      quantitySold,
      revenue: String(revenue),
      avgPerProduct,
      percentageOfTotal,
    }
  })
}

/**
 * Get overview/summary metrics for dashboard
 */
export async function getAnalyticsOverview(
  dataSource: DataSource,
  storeId: string,
  { startDate, endDate }: AnalyticsParams
) {
  // Use raw SQL for overview to ensure proper aggregation
  const [totalResults, employeeResults, productResults] = await Promise.all([
    dataSource.query(
      `
      SELECT
        SUM(CAST(s.total AS DECIMAL(10,2))) as "totalRevenue",
        COUNT(s.id)::int as "totalTransactions",
        AVG(CAST(s.total AS DECIMAL(10,2))) as "avgTransaction"
      FROM sale s
      WHERE s."storeId" = $1
        AND s.status NOT IN ($2, $3)
        AND DATE(s."createdAt") >= DATE($4)
        AND DATE(s."createdAt") <= DATE($5)
      `,
      [storeId, SaleStatus.PENDING, SaleStatus.CANCELLED, startDate, endDate]
    ),

    getEmployeePerformance(dataSource, storeId, { startDate, endDate }),
    getProductAnalytics(dataSource, storeId, { startDate, endDate }),
  ])

  const totalResult = totalResults[0] || { totalRevenue: null, totalTransactions: 0, avgTransaction: null }
  const topEmployee = employeeResults[0] || null
  const topProduct = productResults[0] || null

  return {
    totalRevenue: String(parseFloat(totalResult.totalRevenue || 0).toFixed(2)),
    totalTransactions: totalResult.totalTransactions || 0,
    avgTransaction: String(parseFloat(totalResult.avgTransaction || 0).toFixed(2)),
    topEmployee,
    topProduct,
  }
}


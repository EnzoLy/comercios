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
  const results = await dataSource
    .getRepository(Sale)
    .createQueryBuilder('sale')
    .select("DATE(sale.createdAt) as date")
    .addSelect('SUM(CAST(sale.total AS DECIMAL(10,2))) as revenue')
    .addSelect('COUNT(sale.id) as transactions')
    .addSelect('AVG(CAST(sale.total AS DECIMAL(10,2))) as avgTransaction')
    .where('sale.storeId = :storeId', { storeId })
    .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
    .andWhere('sale.createdAt >= :startDate', { startDate })
    .andWhere('sale.createdAt <= :endDate', { endDate })
    .groupBy('DATE(sale.createdAt)')
    .orderBy('DATE(sale.createdAt)', 'ASC')
    .getRawMany()

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
  const results = await dataSource
    .getRepository(Sale)
    .createQueryBuilder('sale')
    .select("TO_CHAR(sale.createdAt, 'YYYY-MM') as month")
    .addSelect('SUM(CAST(sale.total AS DECIMAL(10,2))) as revenue')
    .addSelect('COUNT(sale.id) as transactions')
    .addSelect('AVG(CAST(sale.total AS DECIMAL(10,2))) as avgTransaction')
    .where('sale.storeId = :storeId', { storeId })
    .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
    .andWhere('sale.createdAt >= :startDate', { startDate })
    .andWhere('sale.createdAt <= :endDate', { endDate })

    .groupBy("TO_CHAR(sale.createdAt, 'YYYY-MM')")
    .orderBy("TO_CHAR(sale.createdAt, 'YYYY-MM')", 'ASC')
    .getRawMany()

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
  // Use SQL GROUP BY for aggregation instead of loading all data into memory
  const results = await dataSource
    .getRepository(Sale)
    .createQueryBuilder('sale')
    .select('sale.cashierId as employeeId')
    .addSelect('cashier.name as employeeName')
    .addSelect('COUNT(sale.id)::int as transactions')
    .addSelect('SUM(CAST(sale.total AS DECIMAL(10,2))) as totalRevenue')
    .addSelect('AVG(CAST(sale.total AS DECIMAL(10,2))) as avgTransaction')
    .addSelect('MAX(sale.createdAt) as lastSaleDate')
    .leftJoin(User, 'cashier', 'cashier.id = sale.cashierId')
    .where('sale.storeId = :storeId', { storeId })
    .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
    .andWhere('sale.createdAt >= :startDate', { startDate })
    .andWhere('sale.createdAt <= :endDate', { endDate })
    .groupBy('sale.cashierId')
    .addGroupBy('cashier.name')
    .orderBy('transactions', 'DESC')
    .getRawMany()

  return results.map((r: any) => ({
    employeeId: r.employeeId || 'unknown',
    employeeName: r.employeeName || 'Unknown',
    transactions: parseInt(r.transactions) || 0,
    revenue: String(parseFloat(r.totalRevenue || 0).toFixed(2)),
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
  // Use SQL GROUP BY for aggregation instead of loading all data into memory
  const results = await dataSource
    .getRepository(SaleItem)
    .createQueryBuilder('saleItem')
    .select('saleItem.productId as productId')
    .addSelect('saleItem.productName as productName')
    .addSelect('saleItem.productSku as sku')
    .addSelect('product.categoryId as categoryId')
    .addSelect('category.name as categoryName')
    .addSelect('product.costPrice as costPrice')
    .addSelect('SUM(saleItem.quantity)::int as quantitySold')
    .addSelect('SUM(CAST(saleItem.total AS DECIMAL(10,2))) as revenue')
    .addSelect('COUNT(saleItem.id)::int as transactions')
    .addSelect('SUM(CAST(saleItem.taxAmount AS DECIMAL(10,2))) as totalTaxAmount')
    .innerJoin(Sale, 'sale', 'sale.id = saleItem.saleId')
    .leftJoin(Product, 'product', 'product.id = saleItem.productId')
    .leftJoin(Category, 'category', 'category.id = product.categoryId')
    .where('sale.storeId = :storeId', { storeId })
    .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
    .andWhere('sale.createdAt >= :startDate', { startDate })
    .andWhere('sale.createdAt <= :endDate', { endDate })
    .andWhere('saleItem.productId IS NOT NULL')
    .groupBy('saleItem.productId')
    .addGroupBy('saleItem.productName')
    .addGroupBy('saleItem.productSku')
    .addGroupBy('product.categoryId')
    .addGroupBy('category.name')
    .addGroupBy('product.costPrice')
    .orderBy('quantitySold', 'DESC')
    .getRawMany()

  return results.map((r: any) => {
    const quantitySold = parseInt(r.quantitySold) || 0
    const revenue = parseFloat(r.revenue || 0)
    const costPrice = parseFloat(r.costPrice || 0)
    const totalCost = costPrice * quantitySold
    const profit = revenue - totalCost
    const marginPercentage = revenue > 0 ? ((profit / revenue) * 100).toFixed(2) : '0.00'
    const avgPrice = quantitySold > 0 ? revenue / quantitySold : 0

    return {
      productId: r.productId || 'unknown',
      productName: r.productName || 'Unknown',
      sku: r.sku || '',
      categoryId: r.categoryId || null,
      categoryName: r.categoryName || null,
      quantitySold,
      revenue: String(revenue.toFixed(2)),
      avgPrice: String(avgPrice.toFixed(2)),
      costPrice: String(costPrice.toFixed(2)),
      profit: String(profit.toFixed(2)),
      marginPercentage,
      transactions: parseInt(r.transactions) || 0,
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
  const results = await dataSource
    .getRepository(SaleItem)
    .createQueryBuilder('saleItem')
    .select('category.id as categoryId')
    .addSelect('category.name as categoryName')
    .addSelect('COUNT(DISTINCT product.id)::int as productsCount')
    .addSelect('SUM(saleItem.quantity)::int as quantitySold')
    .addSelect('SUM(CAST(saleItem.total AS DECIMAL(10,2))) as revenue')
    .innerJoin(Sale, 'sale', 'sale.id = saleItem.saleId')
    .innerJoin(Product, 'product', 'product.id = saleItem.productId')
    .leftJoin(Category, 'category', 'category.id = product.categoryId')
    .where('sale.storeId = :storeId', { storeId })
    .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
    .andWhere('sale.createdAt >= :startDate', { startDate })
    .andWhere('sale.createdAt <= :endDate', { endDate })
    .andWhere('category.id IS NOT NULL')
    .groupBy('category.id')
    .addGroupBy('category.name')
    .orderBy('quantitySold', 'DESC')
    .getRawMany()

  // Calculate total revenue for percentage calculation
  const totalRevenue = results.reduce((sum, r) => sum + parseFloat(r.revenue || 0), 0)

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
  const saleRepo = dataSource.getRepository(Sale)

  const [totalResults, employeeResults, productResults] = await Promise.all([
    saleRepo
      .createQueryBuilder('sale')
      .select('SUM(CAST(sale.total AS DECIMAL(10,2))) as totalRevenue')
      .addSelect('COUNT(sale.id) as totalTransactions')
      .addSelect('AVG(CAST(sale.total AS DECIMAL(10,2))) as avgTransaction')
      .where('sale.storeId = :storeId', { storeId })
      .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
      .andWhere('sale.createdAt >= :startDate', { startDate })
      .andWhere('sale.createdAt <= :endDate', { endDate })
      .getRawOne(),

    getEmployeePerformance(dataSource, storeId, { startDate, endDate }),
    getProductAnalytics(dataSource, storeId, { startDate, endDate }),
  ])

  const topEmployee = employeeResults[0]
  const topProduct = productResults[0]

  return {
    totalRevenue: String(totalResults?.totalRevenue || 0),
    totalTransactions: parseInt(totalResults?.totalTransactions) || 0,
    avgTransaction: String(totalResults?.avgTransaction || 0),
    topEmployee: topEmployee || null,
    topProduct: topProduct || null,
  }
}


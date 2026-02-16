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
  // Get all completed sales with cashier relations in date range
  const sales = await dataSource
    .getRepository(Sale)
    .createQueryBuilder('sale')
    .leftJoinAndSelect('sale.cashier', 'cashier')
    .where('sale.storeId = :storeId', { storeId })
    .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
    .andWhere('sale.createdAt >= :startDate', { startDate })
    .andWhere('sale.createdAt <= :endDate', { endDate })
    .getMany()

  // Group by employee
  const employeeMap = new Map<string, {
    employee: any
    transactions: number
    totalRevenue: number
    lastSaleDate: Date | null
  }>()

  for (const sale of sales) {
    const employeeId = sale.cashierId
    if (!employeeMap.has(employeeId)) {
      employeeMap.set(employeeId, {
        employee: sale.cashier,
        transactions: 0,
        totalRevenue: 0,
        lastSaleDate: null,
      })
    }

    const data = employeeMap.get(employeeId)!
    data.transactions += 1
    data.totalRevenue += Number(sale.total)
    if (!data.lastSaleDate || sale.createdAt > data.lastSaleDate) {
      data.lastSaleDate = sale.createdAt
    }
  }

  // Convert to results array and sort by revenue descending
  const results = Array.from(employeeMap.values())
    .map((data) => ({
      employeeId: data.employee?.id || 'unknown',
      employeeName: data.employee?.name || 'Unknown',
      transactions: data.transactions,
      totalRevenue: data.totalRevenue,
      lastSaleDate: data.lastSaleDate,
    }))
    .sort((a, b) => b.transactions - a.transactions)

  return results.map((r) => ({
    employeeId: r.employeeId,
    employeeName: r.employeeName,
    transactions: r.transactions,
    revenue: String(r.totalRevenue.toFixed(2)),
    avgTransaction: String(r.transactions > 0 ? (r.totalRevenue / r.transactions).toFixed(2) : 0),
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
  // Get all sale items in date range with relations
  const saleItems = await dataSource
    .getRepository(SaleItem)
    .createQueryBuilder('saleItem')
    .leftJoinAndSelect('saleItem.sale', 'sale')
    .leftJoinAndSelect('saleItem.product', 'product')
    .leftJoinAndSelect('product.category', 'category')
    .where('sale.storeId = :storeId', { storeId })
    .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
    .andWhere('sale.createdAt >= :startDate', { startDate })
    .andWhere('sale.createdAt <= :endDate', { endDate })
    .getMany()

  // Group by product ID
  const productMap = new Map<string, {
    productId: string
    productName: string
    sku: string
    categoryId: string | null
    categoryName: string | null
    totalQuantity: number
    totalRevenue: number
    totalPrice: number
    costPrice: number
    transactionCount: number
    totalTaxAmount: number
  }>()

  for (const item of saleItems) {
    const productId = item.productId
    if (!productId) continue

    if (!productMap.has(productId)) {
      productMap.set(productId, {
        productId,
        productName: item.productName || item.product?.name || 'Unknown',
        sku: item.productSku || item.product?.sku || '',
        categoryId: item.product?.categoryId || null,
        categoryName: item.product?.category?.name || null,
        totalQuantity: 0,
        totalRevenue: 0,
        totalPrice: 0,
        costPrice: item.product?.costPrice ? Number(item.product.costPrice) : 0,
        transactionCount: 0,
        totalTaxAmount: 0,
      })
    }

    const data = productMap.get(productId)!
    data.totalQuantity += item.quantity || 0
    data.totalRevenue += Number(item.total) || 0
    data.totalPrice += (Number(item.unitPrice) || 0) * (item.quantity || 0)
    data.totalTaxAmount += Number(item.taxAmount) || 0
    data.transactionCount += 1
  }

  // Convert to results array
  const results = Array.from(productMap.values())
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .map((data) => {
      const revenue = data.totalRevenue
      const quantitySold = data.totalQuantity
      const costPrice = data.costPrice
      const totalCost = costPrice * quantitySold
      const profit = revenue - totalCost
      const marginPercentage = revenue > 0 ? ((profit / revenue) * 100).toFixed(2) : '0.00'
      const avgPrice = quantitySold > 0 ? data.totalPrice / quantitySold : 0

      return {
        productId: data.productId,
        productName: data.productName,
        sku: data.sku,
        categoryId: data.categoryId,
        categoryName: data.categoryName,
        quantitySold,
        revenue: String(revenue.toFixed(2)),
        avgPrice: String(avgPrice.toFixed(2)),
        costPrice: String(costPrice.toFixed(2)),
        profit: String(profit.toFixed(2)),
        marginPercentage,
        transactions: data.transactionCount,
        totalTaxAmount: String(data.totalTaxAmount.toFixed(2)),
      }
    })

  return results
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


import useSWR from 'swr'

interface PersonalStatsData {
  period: string
  totalSales: number
  totalRevenue: number
  averageTransaction: number
  storeAverageTransaction: number
  topProduct: { name: string; quantity: number } | null
  ranking: { rank: number; total: number }
  isAboveAverage: boolean
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function usePOSStats(
  storeId: string | undefined,
  activeUserId?: string | null,
  refreshTrigger?: number
) {
  const isValidId = activeUserId && activeUserId !== 'undefined' && activeUserId !== 'null'
  const queryParam = isValidId ? `&activeUserId=${activeUserId}` : ''

  const { data, error, isLoading, mutate } = useSWR<PersonalStatsData>(
    storeId ? `/api/stores/${storeId}/pos/my-stats?period=today${queryParam}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 10000, // 10 seconds
      refreshInterval: 0,
    }
  )

  return {
    stats: data,
    isLoading,
    isError: error,
    mutate,
  }
}

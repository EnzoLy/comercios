import useSWR from 'swr'

interface TaxSettings {
  taxEnabled: boolean
  defaultTaxRate: number
  taxName: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useTaxSettings(storeId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<TaxSettings>(
    storeId ? `/api/stores/${storeId}/tax-settings` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 minute
    }
  )

  return {
    taxSettings: data,
    isLoading,
    isError: error,
    mutate,
  }
}

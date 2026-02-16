import useSWR from 'swr'

interface FavoriteProduct {
  productId: string
  name: string
  sku: string
  price: number
  quantitySold: number
  currentStock: number
  imageUrl?: string | null
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useFavoriteProducts(storeId: string | undefined, activeUserId?: string | null) {
  const queryParam = activeUserId ? `?activeUserId=${activeUserId}` : ''

  const { data, error, isLoading, mutate } = useSWR<FavoriteProduct[]>(
    storeId ? `/api/stores/${storeId}/pos/favorites${queryParam}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000, // 30 seconds
    }
  )

  return {
    favorites: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}

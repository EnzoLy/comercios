import useSWR from 'swr'

interface SecuritySettings {
  requireEmployeePin: boolean
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useSecuritySettings(storeId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<SecuritySettings>(
    storeId ? `/api/stores/${storeId}/security-settings` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 minute
    }
  )

  return {
    securitySettings: data,
    isLoading,
    isError: error,
    mutate,
  }
}

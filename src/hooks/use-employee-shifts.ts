import useSWR from 'swr'

interface Shift {
  id: string
  startTime: string
  endTime?: string
  notes?: string
  type?: 'REGULAR' | 'SPECIAL'
  employee?: {
    id: string
    name: string
  } | null
  employeeId?: string
  employmentId?: string | null
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useEmployeeShifts(storeId: string | undefined, activeUserId?: string | null) {
  const queryParam = activeUserId ? `?activeUserId=${activeUserId}` : ''

  const { data, error, isLoading, mutate } = useSWR<Shift[]>(
    storeId ? `/api/stores/${storeId}/employee-shifts/today${queryParam}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30 seconds
    }
  )

  return {
    shifts: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}

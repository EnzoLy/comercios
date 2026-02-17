'use client'

import { useEffect, useState, useCallback } from 'react'
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { offlineQueue } from '@/lib/offline/queue'
import type { OfflineOperation } from '@/lib/offline/queue'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof window !== 'undefined' ? navigator.onLine : true
  )
  const [pendingCount, setPendingCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [operations, setOperations] = useState<OfflineOperation[]>([])

  const updateCounts = useCallback(async () => {
    try {
      const queue = await offlineQueue.getQueue()
      setPendingCount(queue.filter(op => op.status === 'pending').length)
      setFailedCount(queue.filter(op => op.status === 'failed').length)
      setOperations(queue)
    } catch {
      // Ignore errors during count update
    }
  }, [])

  useEffect(() => {
    // Defer initial counts to avoid synchronous setState in effect
    const timer = setTimeout(updateCounts, 0)

    const unsubscribe = offlineQueue.onSync((operation) => {
      updateCounts()
      setOperations(prev => {
        const index = prev.findIndex(op => op.id === operation.id)
        if (index !== -1) {
          const updated = [...prev]
          updated[index] = operation
          return updated
        }
        return [...prev, operation]
      })

      if (operation.status === 'syncing') {
        setIsSyncing(true)
        setTimeout(() => setIsSyncing(false), 1000)
      }
    })

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const interval = setInterval(updateCounts, 5000)

    return () => {
      clearTimeout(timer)
      unsubscribe()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [updateCounts])

  const handleSyncNow = async () => {
    setIsSyncing(true)
    await offlineQueue.processQueue()
    await updateCounts()
    setTimeout(() => setIsSyncing(false), 1000)
  }

  const handleClearFailed = async () => {
    if (confirm('Deseas limpiar las operaciones fallidas?')) {
      await offlineQueue.clearFailed()
      await updateCounts()
    }
  }

  const getOperationTypeLabel = (type: OfflineOperation['type']) => {
    switch (type) {
      case 'CREATE_SALE':
        return 'Venta'
      case 'UPDATE_PRODUCT':
        return 'Actualizacion de producto'
      case 'CREATE_PRODUCT':
        return 'Nuevo producto'
      default:
        return type
    }
  }

  const getStatusBadge = (status: OfflineOperation['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pendiente</Badge>
      case 'syncing':
        return <Badge variant="default">Sincronizando...</Badge>
      case 'failed':
        return <Badge variant="destructive">Fallido</Badge>
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Status indicator */}
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
        isOnline
          ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
          : 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
      }`}>
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              En linea
            </span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
              Sin conexion
            </span>
          </>
        )}
      </div>

      {/* Pending operations dropdown */}
      {(pendingCount > 0 || failedCount > 0) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={isOnline ? "outline" : "secondary"}
              size="sm"
              className="relative"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {pendingCount > 0 && (
                <span className="text-sm">
                  {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
                </span>
              )}
              {failedCount > 0 && (
                <span className="text-sm text-destructive ml-1">
                  (+{failedCount} fallido{failedCount !== 1 ? 's' : ''})
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="p-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Operaciones pendientes</span>
                {isOnline && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSyncNow}
                    disabled={isSyncing || pendingCount === 0}
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                    Sincronizar
                  </Button>
                )}
              </div>

              {operations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay operaciones pendientes
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {operations.map((op) => (
                    <div
                      key={op.id}
                      className="flex items-start justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium truncate">
                            {getOperationTypeLabel(op.type)}
                          </span>
                          {getStatusBadge(op.status)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(op.timestamp).toLocaleTimeString()}
                        </p>
                        {op.error && (
                          <p className="text-xs text-destructive mt-1">
                            <AlertCircle className="h-3 w-3 inline mr-1" />
                            {op.error}
                          </p>
                        )}
                        {op.retries > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Reintentos: {op.retries}/{5}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {failedCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-destructive"
                  onClick={handleClearFailed}
                >
                  Limpiar fallidos
                </Button>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

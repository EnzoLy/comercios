'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/hooks/use-store'
import { useRouter } from 'next/navigation'
import { useOfflinePOS } from '@/hooks/use-offline-pos'
import { OfflineIndicator } from '@/components/offline/offline-indicator'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LoadingPage } from '@/components/ui/loading'
import { Search, ShoppingCart, Package, WifiOff, Banknote, CreditCard, Smartphone, Receipt, RefreshCw, Database } from 'lucide-react'
import { PaymentMethod } from '@/lib/db/entities/sale.entity'
import { toast } from 'sonner'

export default function POSPage() {
  const store = useStore()
  const router = useRouter()
  const [cart, setCart] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [scanning, setScanning] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH)

  const {
    isOnline,
    pendingCount,
    cachedProducts,
    createSale,
    refreshCache,
    isCacheValid,
    isLoadingCache,
    cacheProductCount,
  } = useOfflinePOS(store?.storeId || '')

  useEffect(() => {
    if (!store) {
      router.push('/auth/signin')
      return
    }

    // Refresh product cache if not valid
    if (!isCacheValid && isOnline) {
      refreshCache()
    }
  }, [store, isCacheValid, isOnline])

  const filteredProducts = cachedProducts.filter(product => {
    if (!product.isActive) return false

    const query = searchQuery.toLowerCase()
    return (
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query) ||
      product.barcode?.toLowerCase().includes(query)
    )
  })

  const addToCart = (product: any) => {
    const existingItem = cart.find(item => item.productId === product.id)

    if (existingItem) {
      setCart(cart.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        quantity: 1,
        unitPrice: product.sellingPrice,
        taxRate: product.taxRate || 0,
      }])
    }
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
    } else {
      setCart(cart.map(item =>
        item.productId === productId
          ? { ...item, quantity }
          : item
      ))
    }
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      const subtotal = item.quantity * item.unitPrice
      const tax = item.quantity * item.unitPrice * (item.taxRate / 100)
      return total + subtotal + tax
    }, 0)
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return

    const saleData = {
      items: cart,
      subtotal: cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
      tax: cart.reduce((sum, item) => sum + item.quantity * item.unitPrice * (item.taxRate / 100), 0),
      total: getCartTotal(),
      paymentMethod,
    }

    const result = await createSale(saleData)

    if (!result.success) {
      toast.error(result.error || 'Error al completar la venta')
      return
    }

    setCart([])
    if (result.queued) {
      toast.success('Venta guardada localmente. Se sincronizara cuando haya conexion.')
    } else {
      toast.success('Venta completada con exito!')
    }
  }

  if (!store) {
    return <LoadingPage title="Cargando..." description="Verificando tienda..." />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Punto de Venta</h1>
            <p className="text-sm text-muted-foreground">{store.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <OfflineIndicator />
            {isOnline && (
              <Button
                size="sm"
                variant="outline"
                onClick={refreshCache}
                disabled={isLoadingCache}
              >
                {isLoadingCache ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Database className="h-4 w-4 mr-2" />
                )}
                {isLoadingCache ? 'Cargando...' : `${cacheProductCount} productos`}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Offline warning */}
      {!isOnline && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800 px-4 py-2">
          <div className="container mx-auto flex items-center gap-2 text-sm">
            <WifiOff className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <span className="text-orange-700 dark:text-orange-300">
              Modo sin conexion - Las ventas se guardaran localmente y se sincronizaran cuando vuelva internet
              {pendingCount > 0 && ` (${pendingCount} pendiente${pendingCount !== 1 ? 's' : ''})`}
            </span>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Productos ({filteredProducts.length})
                </CardTitle>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre, SKU o escanear codigo..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      autoFocus
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={refreshCache}
                    disabled={!isOnline || isLoadingCache}
                  >
                    {isLoadingCache ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Actualizar'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingCache && cachedProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <RefreshCw className="h-8 w-8 animate-spin mb-4" />
                    <p>Cargando productos...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredProducts.map((product) => (
                      <Card
                        key={product.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => addToCart(product)}
                      >
                        <CardContent className="p-4">
                          <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <Package className="h-12 w-12 text-muted-foreground" />
                            )}
                          </div>
                          <h3 className="font-medium text-sm mb-1 line-clamp-2">
                            {product.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mb-2">
                            SKU: {product.sku}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="font-bold">
                              ${Number(product.sellingPrice).toFixed(2)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Stock: {product.currentStock}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cart */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Carrito ({cart.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    El carrito esta vacio
                  </p>
                ) : (
                  <>
                    <div className="space-y-4 mb-4">
                      {cart.map((item) => (
                        <div
                          key={item.productId}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {item.productName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              ${Number(item.unitPrice).toFixed(2)} c/u
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            >
                              -
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>
                          ${cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Impuestos:</span>
                        <span>
                          ${cart.reduce((sum, item) => sum + item.quantity * item.unitPrice * (item.taxRate / 100), 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span>${getCartTotal().toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Método de pago
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={paymentMethod === PaymentMethod.CASH ? 'default' : 'outline'}
                          className="flex items-center gap-2 h-11"
                          onClick={() => setPaymentMethod(PaymentMethod.CASH)}
                        >
                          <Banknote className="h-4 w-4" />
                          Efectivo
                        </Button>
                        <Button
                          type="button"
                          variant={paymentMethod === PaymentMethod.CARD ? 'default' : 'outline'}
                          className="flex items-center gap-2 h-11"
                          onClick={() => setPaymentMethod(PaymentMethod.CARD)}
                        >
                          <CreditCard className="h-4 w-4" />
                          Tarjeta
                        </Button>
                        <Button
                          type="button"
                          variant={paymentMethod === PaymentMethod.TRANSFER ? 'default' : 'outline'}
                          className="flex items-center gap-2 h-11"
                          onClick={() => setPaymentMethod(PaymentMethod.TRANSFER)}
                        >
                          <Receipt className="h-4 w-4" />
                          Transferencia
                        </Button>
                        <Button
                          type="button"
                          variant={paymentMethod === PaymentMethod.QR ? 'default' : 'outline'}
                          className="flex items-center gap-2 h-11"
                          onClick={() => setPaymentMethod(PaymentMethod.QR)}
                        >
                          <Smartphone className="h-4 w-4" />
                          QR
                        </Button>
                      </div>
                    </div>

                    <Button
                      className="w-full mt-4"
                      size="lg"
                      onClick={handleCheckout}
                      disabled={cart.length === 0}
                    >
                      {!isOnline ? 'Guardar Venta (Offline)' : 'Completar Venta'}
                    </Button>

                    {pendingCount > 0 && (
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        {pendingCount} venta{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''} de sincronizacion
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

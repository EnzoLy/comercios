'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BarcodeScanner } from '@/components/products/barcode-scanner'
import { ProductSearch } from '@/components/pos/product-search'
import { CategoryFilter } from '@/components/pos/category-filter'
import { FavoriteProducts } from '@/components/pos/favorite-products'
import { RecentSalesDialog } from '@/components/pos/recent-sales-dialog'
import { DiscountControls } from '@/components/pos/discount-controls'
import { ShiftReportDialog } from '@/components/pos/shift-report-dialog'
import { PersonalStats } from '@/components/pos/personal-stats'
import { ShiftSwitcher } from '@/components/pos/shift-switcher'
import { EmployeeSelector } from '@/components/pos/employee-selector'
import { SaleSuccessDialog } from '@/components/pos/sale-success-dialog'
import { useActiveEmployee } from '@/contexts/active-employee-context'
import { useStore } from '@/hooks/use-store'
import { useTaxSettings } from '@/hooks/use-tax-settings'
import { useEmployeeShifts } from '@/hooks/use-employee-shifts'
import { formatCurrency } from '@/lib/utils/currency'
import { LoadingPage } from '@/components/ui/loading'
import { Camera, Trash2, Plus, Minus, ShoppingCart, Store, Clock, BarChart3, AlertTriangle, Maximize2, Minimize2, Search, Zap, Banknote, CreditCard, Smartphone, Receipt, WifiOff, Wifi, RefreshCw, CloudOff } from 'lucide-react'
import { PaymentMethod } from '@/lib/db/entities/sale.entity'
import { useOfflinePOS } from '@/hooks/use-offline-pos'
import { OfflineIndicator } from '@/components/offline/offline-indicator'
import { productsCache } from '@/lib/offline/products-cache'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { MoreVertical, Menu, LayoutGrid, ChevronUp } from 'lucide-react'

interface CartItem {
  productId: string
  name: string
  sku: string
  price: number
  quantity: number
  stock: number
  taxRate: number
  discount?: number
  trackExpirationDates?: boolean
  nearestExpirationDate?: string
  hasExpiredBatches?: boolean
}

export default function POSPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const store = useStore()
  const { activeEmployee, setActiveEmployee } = useActiveEmployee()

  // SWR hooks for data fetching with caching
  const { taxSettings } = useTaxSettings(store?.storeId)
  const { shifts } = useEmployeeShifts(store?.storeId, activeEmployee?.id)

  // Offline POS support
  const {
    isOnline,
    pendingCount,
    cachedProducts,
    createSale: createOfflineSale,
    syncNow,
    refreshCache,
    isCacheValid,
    isLoadingCache,
    cacheProductCount,
    onSyncComplete,
  } = useOfflinePOS(store?.storeId || '')

  // Initialize product cache when store is loaded
  useEffect(() => {
    if (!store?.storeId) return
    // Auto-refresh cache if expired or empty
    if (!isCacheValid && isOnline) {
      refreshCache()
    }
  }, [store?.storeId, isCacheValid, isOnline])

  // Notify when offline sales finish syncing
  useEffect(() => {
    const unsubscribe = onSyncComplete((synced, failed) => {
      if (synced > 0) {
        toast.success(
          `${synced} venta${synced !== 1 ? 's' : ''} sincronizada${synced !== 1 ? 's' : ''} correctamente`,
          { icon: <Wifi className="h-4 w-4" />, duration: 5000 }
        )
      }
      if (failed > 0) {
        toast.error(
          `${failed} venta${failed !== 1 ? 's' : ''} no se pudo${failed !== 1 ? 'ieron' : ''} sincronizar`,
          { duration: 7000 }
        )
      }
    })
    return unsubscribe
  }, [onSyncComplete])

  const [cart, setCart] = useState<CartItem[]>([])
  const [scannerOpen, setScannerOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [amountPaid, setAmountPaid] = useState<number | undefined>(undefined)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [cartDiscount, setCartDiscount] = useState(0)
  const [recentSalesOpen, setRecentSalesOpen] = useState(false)
  const [shiftReportOpen, setShiftReportOpen] = useState(false)
  const [statRefreshTrigger, setStatRefreshTrigger] = useState(0)
  const [currentShift, setCurrentShift] = useState<any>(null)
  const [showEmployeeSelector, setShowEmployeeSelector] = useState(false)
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [lastSale, setLastSale] = useState<any>(null)
  const [expiredWarningOpen, setExpiredWarningOpen] = useState(false)
  const [expiredWarningProduct, setExpiredWarningProduct] = useState<any>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH)

  // Derived state from SWR
  const taxEnabled = taxSettings?.taxEnabled ?? false
  const defaultTaxRate = taxSettings?.defaultTaxRate ?? 0
  const taxName = taxSettings?.taxName ?? 'IVA'

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true)
      })
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Auto-detect shift when shifts data is loaded
  useEffect(() => {
    if (!store || !shifts || shifts.length === 0) return

    const currentUser = session?.user

    // Check for active employee from context first, fallback to localStorage
    const activeUserId = activeEmployee?.id || localStorage.getItem('activeUserId')
    const existingActiveShift = activeUserId ? shifts.find((s: any) => s.employeeId === activeUserId) : null

    // Verificar si el usuario logueado tiene turno hoy
    const userShift = currentUser && shifts.find((s: any) => s.employeeId === currentUser.id)

    if (existingActiveShift) {
      setCurrentShift(existingActiveShift)
    } else if (userShift && currentUser) {
      setCurrentShift(userShift)

      const storeInfo = (currentUser as any).stores?.find((s: any) => s.storeId === store.storeId)

      if (storeInfo) {
        setActiveEmployee({
          id: currentUser.id || '',
          name: currentUser.name || '',
          role: storeInfo.employmentRole,
          isOwner: storeInfo.isOwner
        })
      }
    } else if (!currentShift && !activeUserId) {
      setShowEmployeeSelector(true)
    }
  }, [store, session, shifts, activeEmployee?.id])

  const handleBarcodeDetected = async (barcode: string) => {
    if (!store) return

    if (isOnline) {
      try {
        const response = await fetch(
          `/api/stores/${store.storeId}/products/barcode/${barcode}`
        )

        if (!response.ok) {
          toast.error('Producto no encontrado')
          return
        }

        const product = await response.json()
        addToCart(product)
        toast.success(`Se añadió ${product.name} al carrito`)
      } catch (error) {
        // Online failed, try cache
        const cached = await productsCache.searchByBarcodeOrSKU(store.storeId, barcode)
        if (cached.length > 0) {
          addToCart(cached[0])
          toast.success(`Se añadió ${cached[0].name} al carrito (cache)`)
        } else {
          toast.error('Error al buscar el producto')
        }
      }
    } else {
      // Offline: search in cached products
      const cached = await productsCache.searchByBarcodeOrSKU(store.storeId, barcode)
      if (cached.length > 0) {
        addToCart(cached[0])
        toast.success(`Se añadió ${cached[0].name} al carrito`)
      } else {
        toast.error('Producto no encontrado en cache local')
      }
    }
  }

  const addToCart = async (product: any) => {
    // Prevent adding inactive products
    if (product.isActive === false) {
      toast.error(`El producto ${product.name} está inactivo y no se puede vender`)
      return
    }

    let nearestExpirationDate: string | undefined
    let hasExpiredBatches = false

    if (product.trackExpirationDates && store) {
      try {
        const response = await fetch(
          `/api/stores/${store.storeId}/products/${product.id}/batches?sortBy=expirationDate&sortOrder=asc&limit=1`
        )

        if (response.ok) {
          const data = await response.json()
          if (data.batches && data.batches.length > 0) {
            const nearestBatch = data.batches[0]
            nearestExpirationDate = nearestBatch.expirationDate
            const expirationDate = new Date(nearestBatch.expirationDate)
            const now = new Date()
            hasExpiredBatches = expirationDate < now

            if (hasExpiredBatches) {
              setExpiredWarningProduct({ ...product, nearestExpirationDate })
              setExpiredWarningOpen(true)
              return
            }
          }
        }
      } catch (error) {
        console.error('Error checking expiration:', error)
      }
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id)
      let taxRate = Number(defaultTaxRate) || 0
      if (product.overrideTaxRate && product.taxRate !== null && product.taxRate !== undefined) {
        taxRate = Number(product.taxRate) || 0
      }

      if (existing) {
        if (existing.quantity >= product.currentStock) {
          toast.error('Stock insuficiente')
          return prev
        }
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }

      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          price: Number(product.sellingPrice) || 0,
          quantity: 1,
          stock: product.currentStock,
          taxRate,
          discount: 0,
          trackExpirationDates: product.trackExpirationDates,
          nearestExpirationDate,
          hasExpiredBatches,
        },
      ]
    })
  }

  const confirmAddExpiredProduct = () => {
    if (!expiredWarningProduct) return
    const product = expiredWarningProduct
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id)
      let taxRate = Number(defaultTaxRate) || 0
      if (product.overrideTaxRate && product.taxRate !== null && product.taxRate !== undefined) {
        taxRate = Number(product.taxRate) || 0
      }
      if (existing) {
        if (existing.quantity >= product.currentStock) {
          toast.error('Stock insuficiente')
          return prev
        }
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          price: Number(product.sellingPrice) || 0,
          quantity: 1,
          stock: product.currentStock,
          taxRate,
          discount: 0,
          trackExpirationDates: product.trackExpirationDates,
          nearestExpirationDate: product.nearestExpirationDate,
          hasExpiredBatches: true,
        },
      ]
    })
    toast.success(`Se añadió ${product.name} al carrito (con lote vencido)`)
    setExpiredWarningOpen(false)
    setExpiredWarningProduct(null)
  }

  const duplicateSaleToCart = (items: any[]) => {
    let allAdded = true
    setCart((prev) => {
      let newCart = [...prev]
      for (const item of items) {
        // Prevent adding inactive products during duplication
        if (item.isActive === false) {
          toast.warning(`${item.name}: Producto inactivo, omitido`)
          allAdded = false
          continue
        }

        const existing = newCart.find((i) => i.productId === item.productId)
        if (existing) {
          if (existing.quantity + item.quantity > existing.stock) {
            toast.warning(`${existing.name}: Stock insuficiente`)
            allAdded = false
            continue
          }
          existing.quantity += item.quantity
        } else {
          newCart.push({
            productId: item.productId,
            name: item.name,
            sku: item.sku,
            price: item.price,
            quantity: item.quantity,
            stock: 9999, // Assume available for duplicate
            taxRate: 0,
            discount: item.discount || 0,
          })
        }
      }
      return newCart
    })
    if (allAdded) toast.success('Venta duplicada exitosamente')
  }

  const handleShiftChange = (shift: any) => {
    clearCart()
    setCurrentShift(shift)
    setCartDiscount(0)
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const newQuantity = item.quantity + delta
          if (newQuantity <= 0) return item
          if (newQuantity > item.stock) {
            toast.error('Stock insuficiente')
            return item
          }
          return { ...item, quantity: newQuantity }
        }
        return item
      })
    )
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId))
  }

  const clearCart = () => setCart([])

  const subtotal = cart.reduce((sum, item) => {
    const itemSubtotal = item.price * item.quantity
    const itemDiscount = item.discount || 0
    return sum + itemSubtotal - itemDiscount
  }, 0)

  const tax = taxEnabled
    ? cart.reduce((sum, item) => {
      const itemSubtotal = item.price * item.quantity
      const itemDiscount = item.discount || 0
      const discountedSubtotal = itemSubtotal - itemDiscount
      const itemTax = (discountedSubtotal * item.taxRate) / 100
      return sum + itemTax
    }, 0)
    : 0

  const total = subtotal + tax - cartDiscount

  const handleCheckout = async () => {
    if (!store || cart.length === 0) return
    setIsProcessing(true)
    try {
      const activeUserId = localStorage.getItem('activeUserId')
      const saleData = {
        activeUserId,
        items: cart.map((item) => {
          const itemSubtotal = item.price * item.quantity
          const itemDiscount = item.discount || 0
          const discountedSubtotal = itemSubtotal - itemDiscount
          const itemTax = taxEnabled ? (discountedSubtotal * item.taxRate) / 100 : 0
          return {
            productId: item.productId,
            quantity: Number(item.quantity),
            unitPrice: Number(item.price),
            discount: Number(itemDiscount),
            taxRate: Number(item.taxRate),
            taxAmount: Number(itemTax),
          }
        }),
        paymentMethod,
        tax: Number(tax),
        discount: Number(cartDiscount),
        amountPaid: amountPaid ? Number(amountPaid) : undefined,
      }

      // Use offline-capable sale creation
      const result = await createOfflineSale(saleData)

      if (!result.success) {
        toast.error(result.error || 'Error al completar la venta')
        return
      }

      if (result.queued) {
        toast.success('Venta guardada localmente. Se sincronizará cuando vuelva la conexión.', {
          icon: <CloudOff className="h-4 w-4" />,
          duration: 5000,
        })
      } else {
        toast.success('Venta completada con éxito!')
      }

      setLastSale({ id: result.saleId, total, invoiceUrl: result.invoiceUrl })
      clearCart()
      setCheckoutOpen(false)
      setAmountPaid(undefined)
      setCartDiscount(0)
      setPaymentMethod(PaymentMethod.CASH)
      setSuccessDialogOpen(true)
      setStatRefreshTrigger((prev) => prev + 1)
    } catch (error) {
      toast.error('Error al completar la venta')
    } finally {
      setIsProcessing(false)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true'
      if (isInput && e.key !== 'Escape' && e.key !== 'Tab') return
      switch (e.key.toLowerCase()) {
        case 'f2': e.preventDefault(); setRecentSalesOpen(true); break
        case 'f3': case 'tab': if (e.key === 'Tab' && isInput) return; e.preventDefault(); (document.querySelector('[placeholder*="Buscar"]') as HTMLInputElement)?.focus(); break
        case 'escape': e.preventDefault(); setCheckoutOpen(false); setRecentSalesOpen(false); setShiftReportOpen(false); break
        case 'f9': e.preventDefault(); setCheckoutOpen(true); break
        case 'f5': e.preventDefault(); if (cart.length > 0 && confirm('¿Deseas limpiar?')) clearCart(); break
        case 'd': if (e.ctrlKey || e.metaKey) { e.preventDefault(); setCheckoutOpen(true); } break
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [cart])

  const change = amountPaid ? (amountPaid > total ? amountPaid - total : 0) : 0

  const CartContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 lg:p-6 border-b border-border flex items-center justify-between bg-primary/10">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Carrito
            {cart.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                {cart.length}
              </span>
            )}
          </h2>
          {currentShift && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {currentShift.startTime}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearCart}
          className="text-muted-foreground hover:text-destructive transition-colors h-8"
          disabled={cart.length === 0}
        >
          Limpiar
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4 custom-scrollbar">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-40 py-20 text-center">
            <ShoppingCart className="h-16 w-16 mb-4" />
            <p className="text-lg font-medium">Tu carrito está vacío</p>
            <p className="text-sm px-10">Escanea o busca productos para comenzar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map((item) => (
              <div
                key={item.productId}
                className="group relative bg-card hover:bg-card/90 border border-border rounded-2xl p-4 transition-all hover:shadow-lg overflow-hidden"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0 pr-6">
                    <p className="font-bold text-sm leading-tight line-clamp-2">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5 uppercase tracking-tighter">SKU: {item.sku}</p>

                    {item.trackExpirationDates && item.nearestExpirationDate && (
                      <div className={`text-[9px] mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full font-bold uppercase tracking-tight ${item.hasExpiredBatches ? 'bg-destructive/10 text-destructive' : 'bg-amber-100 text-amber-700'}`}>
                        {item.hasExpiredBatches ? <AlertTriangle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                        {item.hasExpiredBatches ? 'VENCIDO' : `VENCE: ${new Date(item.nearestExpirationDate).toLocaleDateString()}`}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFromCart(item.productId)}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex items-end justify-between">
                  <div className="flex items-center bg-secondary rounded-xl p-0.5 border border-border">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => updateQuantity(item.productId, -1)}
                      disabled={item.quantity <= 1}
                      className="h-7 w-7 rounded-lg"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => updateQuantity(item.productId, 1)}
                      disabled={item.quantity >= item.stock}
                      className="h-7 w-7 rounded-lg"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="text-right">
                    {item.discount && item.discount > 0 && (
                      <p className="text-[10px] text-primary font-bold mb-0.5">
                        -{formatCurrency(item.discount)}
                      </p>
                    )}
                    <p className="text-lg font-black gradient-text">
                      {formatCurrency((item.price * item.quantity) - (item.discount || 0))}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 lg:p-6 border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.05)] space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-[11px] text-muted-foreground font-black uppercase tracking-widest">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {taxEnabled && (
            <div className="flex justify-between text-[11px] text-muted-foreground font-black uppercase tracking-widest">
              <span>{taxName}</span>
              <span>{formatCurrency(tax)}</span>
            </div>
          )}
          {cartDiscount > 0 && (
            <div className="flex justify-between text-[11px] text-primary font-black uppercase tracking-widest">
              <span>Descuento Global</span>
              <span>-{formatCurrency(cartDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-border mt-1">
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Total</span>
            <span className="text-2xl md:text-3xl font-black text-primary drop-shadow-sm">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <DiscountControls
            cartTotal={subtotal + tax}
            currentDiscount={cartDiscount}
            onDiscountChange={setCartDiscount}
          />

          <Button
            className="w-full h-14 md:h-16 text-lg md:text-xl font-black rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all group uppercase tracking-widest"
            onClick={() => {
              setCheckoutOpen(true)
              setIsCartOpen(false)
            }}
            disabled={cart.length === 0}
          >
            Pagar (F9)
            <ShoppingCart className="ml-2 h-5 w-5 md:h-6 md:w-6 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </div>
  )

  if (!store) {
    return (
      <LoadingPage
        title="Cargando POS"
        description="Obteniendo información de la tienda..."
        icon={<Store className="h-8 w-8 text-gray-600" />}
      />
    )
  }

  return (
    <div className={`h-full flex flex-col lg:flex-row transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50 overflow-hidden' : ''}`}>
      <div className="flex-1 min-h-0 flex flex-col h-full relative">
        <div className="p-4 md:p-6 pb-2 md:pb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-col md:flex-row">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg md:text-2xl font-black tracking-tight leading-none">POS</h1>
                <p className="text-[10px] text-muted-foreground uppercase font-black mt-1 hidden md:block tracking-widest">Terminal #01</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2">
                <OfflineIndicator />
                <ShiftSwitcher storeId={store.storeId} currentShift={currentShift} onShiftChange={handleShiftChange} />
                <Button variant="outline" size="sm" onClick={() => setRecentSalesOpen(true)} className="h-9 font-bold rounded-xl px-4">
                  <BarChart3 className="h-4 w-4 mr-2" /> Ventas
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShiftReportOpen(true)} className="h-9 font-bold rounded-xl px-4">
                  <Clock className="h-4 w-4 mr-2" /> Cierre
                </Button>
              </div>

              <div className="md:hidden flex items-center gap-2">
                <OfflineIndicator />
                <ShiftSwitcher storeId={store.storeId} currentShift={currentShift} onShiftChange={handleShiftChange} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border bg-card">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-3xl p-3 border-border shadow-2xl">
                    <DropdownMenuItem onClick={() => setRecentSalesOpen(true)} className="rounded-2xl py-3 px-4 cursor-pointer font-bold gap-3">
                      <div className="p-2 bg-primary/10 rounded-xl text-primary"><BarChart3 className="h-4 w-4" /></div>
                      Ventas Recientes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShiftReportOpen(true)} className="rounded-2xl py-3 px-4 cursor-pointer font-bold gap-3">
                      <div className="p-2 bg-orange-100 rounded-xl text-orange-600"><Clock className="h-4 w-4" /></div>
                      Cierre de Turno
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={toggleFullscreen} className="rounded-2xl py-3 px-4 cursor-pointer font-bold gap-3">
                      <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
                        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                      </div>
                      {isFullscreen ? 'Salir Fullscreen' : 'Pantalla Completa'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="hidden md:flex h-9 w-9">
                {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 flex items-center bg-card border border-border rounded-2xl px-4 shadow-sm focus-within:ring-2 ring-primary/20 transition-all h-12 md:h-14 relative">
              <Search className="h-5 w-5 text-muted-foreground mr-2 shrink-0" />
              <div className="flex-1 min-w-0">
                <ProductSearch storeId={store.storeId} categoryId={selectedCategoryId} isOnline={isOnline} cachedProducts={cachedProducts} onProductSelect={(product) => { addToCart(product); toast.success(`Se añadió ${product.name} al carrito`) }} />
              </div>
            </div>
            <Button onClick={() => setScannerOpen(true)} size="icon" className="h-12 w-12 md:h-14 md:w-14 rounded-2xl shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-95 flex-shrink-0">
              <Camera className="h-5 w-5 md:h-6 md:w-6" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pt-0 pb-32 lg:pb-6">
          {/* Offline mode banner */}
          {!isOnline && (
            <div className="mb-4 flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-xl">
                <WifiOff className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-orange-800 dark:text-orange-200">Modo sin conexión</p>
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  {cacheProductCount > 0
                    ? `${cacheProductCount} productos en cache local. Las ventas se sincronizarán al volver la conexión.`
                    : 'Sin productos en cache. Conecta a internet para cargar productos.'}
                  {pendingCount > 0 && ` (${pendingCount} venta${pendingCount !== 1 ? 's' : ''} pendiente${pendingCount !== 1 ? 's' : ''})`}
                </p>
              </div>
              {pendingCount > 0 && (
                <div className="px-3 py-1 bg-orange-200 dark:bg-orange-800 rounded-full">
                  <span className="text-xs font-black text-orange-800 dark:text-orange-200">{pendingCount}</span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <FavoriteProducts storeId={store.storeId} onProductSelect={(product) => { addToCart(product); toast.success(`Se añadió ${product.name} al carrito`) }} />
            </div>
            <div className="hidden lg:block space-y-6">
              <PersonalStats storeId={store.storeId} refreshTrigger={statRefreshTrigger} />
            </div>
          </div>
        </div>

        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 backdrop-blur-xl border-t border-border z-40 flex items-center justify-between gap-4 shadow-[0_-15px_40px_rgba(0,0,0,0.1)] px-6 rounded-t-[2.5rem] bg-card/80">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1">Total</span>
            <span className="text-2xl font-black text-primary leading-none">{formatCurrency(total)}</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="icon" onClick={() => setIsCartOpen(true)} className="h-14 w-14 rounded-2xl relative bg-card border-border hover:bg-primary/5 transition-all shadow-sm">
              <ShoppingCart className="h-6 w-6 text-primary" />
              {cart.length > 0 && <span className="absolute -top-1 -right-1 h-6 w-6 bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-background animate-in zoom-in">{cart.length}</span>}
            </Button>
            <Button onClick={() => setCheckoutOpen(true)} disabled={cart.length === 0} className="h-14 px-8 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary/25 active:scale-95 transition-all flex items-center gap-2">
              Pagar <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-hidden flex flex-col border-none shadow-2xl">
          <SheetHeader className="sr-only">
            <SheetTitle>Carrito de Compras</SheetTitle>
            <SheetDescription>Visualizar y gestionar los productos en el carrito</SheetDescription>
          </SheetHeader>
          <CartContent />
        </SheetContent>
      </Sheet>

      <div className="hidden lg:flex w-[420px] glass border-l border-border flex flex-col h-full overflow-hidden shadow-2xl relative shrink-0">
        <CartContent />
      </div>

      <BarcodeScanner isOpen={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={handleBarcodeDetected} />
      <RecentSalesDialog storeId={store.storeId} isOpen={recentSalesOpen} onOpenChange={setRecentSalesOpen} onDuplicateSale={duplicateSaleToCart} />
      <ShiftReportDialog storeId={store.storeId} isOpen={shiftReportOpen} onOpenChange={setShiftReportOpen} />

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 pb-0">
            <DialogTitle className="text-2xl font-black uppercase tracking-widest text-primary">Panel de Pago</DialogTitle>
            <DialogDescription className="font-medium">Completa el cobro de la venta terminal #01</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 p-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Método de Pago</Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { method: PaymentMethod.CASH, label: 'Efectivo', icon: Banknote },
                  { method: PaymentMethod.CARD, label: 'Tarjeta', icon: CreditCard },
                  { method: PaymentMethod.TRANSFER, label: 'Transferencia', icon: Receipt },
                  { method: PaymentMethod.QR, label: 'QR', icon: Smartphone },
                ].map(({ method, label, icon: Icon }) => (
                  <Button
                    key={method}
                    type="button"
                    variant={paymentMethod === method ? 'default' : 'outline'}
                    className="flex flex-col items-center gap-1 h-16 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                    onClick={() => setPaymentMethod(method)}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            {paymentMethod === PaymentMethod.CASH && (
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Monto Recibido</Label>
                <div className="relative group">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground/50 transition-colors group-focus-within:text-primary">$</span>
                  <Input type="number" step="0.01" autoFocus value={amountPaid ?? ''} onChange={(e) => setAmountPaid(e.target.value ? Number(e.target.value) : undefined)} placeholder="0.00" className="pl-10 h-20 text-4xl font-black rounded-3xl bg-secondary border-none shadow-inner focus-visible:ring-primary/20 transition-all" />
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4">
                  {[100, 500, 1000, 2000, 5000].map(amount => (
                    <Button key={amount} variant="outline" size="sm" className="h-12 font-black rounded-xl hover:bg-primary/5 hover:border-primary/30 transition-all border-border" onClick={() => setAmountPaid((amountPaid || 0) + amount)}>+{amount}</Button>
                  ))}
                  <Button variant="outline" size="sm" className="h-12 font-black rounded-xl bg-primary/5 text-primary border-primary/20" onClick={() => setAmountPaid(total)}>Exacto</Button>
                </div>
              </div>
            )}
            <div className="p-8 bg-gradient-to-br from-card to-secondary rounded-[2rem] border border-border shadow-inner space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5"><Zap className="h-24 w-24 fill-primary" /></div>
              <div className="flex justify-between items-center text-xs font-black text-muted-foreground uppercase tracking-[0.2em] relative z-10"><span>Total Venta</span><span className="text-foreground text-xl tracking-normal">{formatCurrency(total)}</span></div>
              {paymentMethod === PaymentMethod.CASH && amountPaid && (
                <>
                  <div className="flex justify-between items-center text-xs font-black text-muted-foreground uppercase tracking-[0.2em] relative z-10"><span>Recibido</span><span className="text-secondary-foreground text-xl tracking-normal">{formatCurrency(amountPaid)}</span></div>
                  <div className="flex justify-between items-center pt-6 border-t border-border relative z-10"><span className="text-xs font-black uppercase tracking-[0.2em] text-primary">Vuelto/Cambio</span><span className={`text-4xl font-black tracking-tighter ${change < 0 ? 'text-destructive' : 'text-primary'}`}>{formatCurrency(change)}</span></div>
                </>
              )}
            </div>
          </div>
          <DialogFooter className="p-8 pt-0 gap-3 sm:gap-0">
            <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-bold text-muted-foreground hover:bg-destructive/5 hover:text-destructive" onClick={() => setCheckoutOpen(false)} disabled={isProcessing}>Cancelar</Button>
            <Button className="flex-1 h-20 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20 transition-all active:scale-95" onClick={handleCheckout} disabled={isProcessing || (paymentMethod === PaymentMethod.CASH && amountPaid !== undefined && amountPaid < total)}>{isProcessing ? 'Procesando...' : 'Confirmar Venta'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EmployeeSelector storeId={store?.storeId || ''} isOpen={showEmployeeSelector} onClose={() => setShowEmployeeSelector(false)} onEmployeeSelected={(employeeId, name) => { toast.success(`Empleado activo: ${name}`); router.refresh() }} />
      <SaleSuccessDialog isOpen={successDialogOpen} onClose={() => { setSuccessDialogOpen(false); setLastSale(null) }} sale={lastSale} />

      <Dialog open={expiredWarningOpen} onOpenChange={setExpiredWarningOpen}>
        <DialogContent className="max-w-md rounded-3xl p-8 border-none shadow-2xl bg-gradient-to-b from-background to-destructive/5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-destructive text-xl font-black uppercase tracking-widest"><div className="p-2 bg-destructive/10 rounded-xl"><AlertTriangle className="h-6 w-6" /></div>Producto Vencido</DialogTitle>
            <DialogDescription className="font-medium pt-2">Este producto tiene lotes vencidos en el sistema. ¿Deseas autorizar la venta?</DialogDescription>
          </DialogHeader>
          {expiredWarningProduct && (
            <div className="space-y-4 py-6">
              <div className="p-5 bg-card border border-destructive/20 rounded-2xl shadow-sm">
                <p className="font-black text-lg leading-tight">{expiredWarningProduct.name}</p>
                <div className="flex items-center gap-2 mt-2"><p className="text-[10px] font-black font-mono text-muted-foreground uppercase tracking-widest">SKU: {expiredWarningProduct.sku}</p></div>
                {expiredWarningProduct.nearestExpirationDate && (<div className="mt-4 p-3 bg-destructive/5 rounded-xl border border-destructive/10"><p className="text-xs text-destructive font-black uppercase tracking-widest">Vencimiento: {new Date(expiredWarningProduct.nearestExpirationDate).toLocaleDateString('es-ES')}</p></div>)}
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl flex gap-3"><AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" /><p className="text-[10px] text-amber-800 dark:text-amber-200 font-bold uppercase tracking-widest leading-relaxed">Nota: La venta de productos vencidos puede estar regulada.</p></div>
            </div>
          )}
          <DialogFooter className="gap-3">
            <Button variant="ghost" className="flex-1 h-12 rounded-xl font-bold" onClick={() => { setExpiredWarningOpen(false); setExpiredWarningProduct(null) }}>Cancelar</Button>
            <Button variant="destructive" className="flex-1 h-12 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-destructive/20 transition-all active:scale-95" onClick={confirmAddExpiredProduct}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

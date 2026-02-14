'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { formatCurrency } from '@/lib/utils/currency'
import { LoadingPage } from '@/components/ui/loading'
import { Camera, Trash2, Plus, Minus, ShoppingCart, Store, Clock, BarChart3, AlertTriangle, Maximize2, Minimize2, Search, Zap } from 'lucide-react'
import { PaymentMethod } from '@/lib/db/entities/sale.entity'
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
  const [cart, setCart] = useState<CartItem[]>([])
  const [scannerOpen, setScannerOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [amountPaid, setAmountPaid] = useState<number | undefined>(undefined)
  const [taxEnabled, setTaxEnabled] = useState(false)
  const [defaultTaxRate, setDefaultTaxRate] = useState(0)
  const [taxName, setTaxName] = useState('IVA')
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
  const { activeEmployee, setActiveEmployee } = useActiveEmployee()

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

  // Fetch tax settings and current shift from store
  useEffect(() => {
    if (!store) return

    const fetchData = async () => {
      try {
        // Fetch tax settings
        const taxResponse = await fetch(`/api/stores/${store.storeId}/tax-settings`)
        if (taxResponse.ok) {
          const data = await taxResponse.json()
          setTaxEnabled(data.taxEnabled)
          setDefaultTaxRate(data.defaultTaxRate)
          setTaxName(data.taxName)
        }

        // NUEVO: Auto-detección de turno del usuario logueado
        // Use session data instead of manual fetch
        const currentUser = session?.user

        // Fetch today's shifts
        const shiftsResponse = await fetch(`/api/stores/${store.storeId}/employee-shifts/today`)
        if (shiftsResponse.ok) {
          const shifts = await shiftsResponse.json()

          // Check for active employee from context first, fallback to localStorage
          const activeUserId = activeEmployee?.id || localStorage.getItem('activeUserId')
          const existingActiveShift = activeUserId ? shifts.find((s: any) => s.employeeId === activeUserId) : null

          // Verificar si el usuario logueado tiene turno hoy
          const userShift = currentUser && shifts.find((s: any) => s.employeeId === currentUser.id)

          if (existingActiveShift) {
            // Maintain the existing active shift (could be an employee or the owner)
            setCurrentShift(existingActiveShift)
            console.log(`Maintaining active shift for user: ${existingActiveShift.employee?.name || activeUserId}`)
          } else if (userShift && currentUser) {
            // No active shift, but the logged-in user has a shift today
            setCurrentShift(userShift)

            // Get user's role in this store from session
            const storeInfo = (currentUser as any).stores?.find((s: any) => s.storeId === store.storeId)

            if (storeInfo) {
              setActiveEmployee({
                id: currentUser.id || '',
                name: currentUser.name || '',
                role: storeInfo.employmentRole,
                isOwner: storeInfo.isOwner
              })
            }
            console.log(`Auto-selected shift for logged-in user: ${currentUser.name}`)
          } else {
            // No valid active shift and current user has no shift - show selector
            setShowEmployeeSelector(true)
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchData()
  }, [store, session, activeEmployee?.id])

  const handleBarcodeDetected = async (barcode: string) => {
    if (!store) return

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
      toast.error('Error al buscar el producto')
    }
  }

  const addToCart = async (product: any) => {
    // Check for expiration dates if product tracks them
    let nearestExpirationDate: string | undefined
    let hasExpiredBatches = false

    if (product.trackExpirationDates && store) {
      try {
        // Fetch nearest expiring batch using FEFO service
        const response = await fetch(
          `/api/stores/${store.storeId}/products/${product.id}/batches?sortBy=expirationDate&sortOrder=asc&limit=1`
        )

        if (response.ok) {
          const data = await response.json()
          if (data.batches && data.batches.length > 0) {
            const nearestBatch = data.batches[0]
            nearestExpirationDate = nearestBatch.expirationDate

            // Check if expired
            const expirationDate = new Date(nearestBatch.expirationDate)
            const now = new Date()
            hasExpiredBatches = expirationDate < now

            // Show warning if expired
            if (hasExpiredBatches) {
              setExpiredWarningProduct({ ...product, nearestExpirationDate })
              setExpiredWarningOpen(true)
              return // Don't add to cart yet, wait for confirmation
            }
          }
        }
      } catch (error) {
        console.error('Error checking expiration:', error)
      }
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id)

      // Determine tax rate: product override or store default
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

    toast.success(`Se añadió ${product.name} al carrito (con lote vencido)`, {
      description: 'Advertencia: Este producto tiene lotes vencidos',
    })

    setExpiredWarningOpen(false)
    setExpiredWarningProduct(null)
  }

  const duplicateSaleToCart = (items: any[]) => {
    let allAdded = true
    setCart((prev) => {
      let newCart = [...prev]
      for (const item of items) {
        const existing = newCart.find((i) => i.productId === item.productId)
        if (existing) {
          if (existing.quantity + item.quantity > existing.stock) {
            toast.warning(
              `${existing.name}: Stock insuficiente para agregar ${item.quantity}`
            )
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
            stock: 0, // To be checked on add
            taxRate: 0,
            discount: item.discount || 0,
          })
        }
      }
      return newCart
    })
    if (allAdded) {
      toast.success('Venta duplicada exitosamente')
    }
  }

  const handleShiftChange = (shift: any) => {
    // Clear cart when changing shift
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

  const clearCart = () => {
    setCart([])
  }

  // Calculate totals with dynamic tax rates and item discounts
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
      // NUEVO: Obtener activeUserId del localStorage
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
        paymentMethod: PaymentMethod.CASH,
        tax: Number(tax),
        discount: Number(cartDiscount),
        amountPaid: amountPaid ? Number(amountPaid) : undefined,
      }

      const response = await fetch(`/api/stores/${store.storeId}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Error al completar la venta')
        return
      }

      toast.success('¡Venta completada con éxito!')

      // Store sale data for success dialog
      setLastSale({
        id: result.id,
        total: result.total,
        invoiceUrl: result.invoiceUrl,
      })

      clearCart()
      setCheckoutOpen(false)
      setAmountPaid(undefined)
      setCartDiscount(0)

      // Show success dialog with invoice
      setSuccessDialogOpen(true)

      // Refresh stats
      setStatRefreshTrigger((prev) => prev + 1)
    } catch (error) {
      toast.error('Error al completar la venta')
      console.error('Checkout error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'

      if (isInput && e.key !== 'Escape' && e.key !== 'Tab') {
        return
      }

      switch (e.key.toLowerCase()) {
        case 'f2':
          e.preventDefault()
          setRecentSalesOpen(true)
          break
        case 'f3':
        case 'tab':
          if (e.key === 'Tab' && isInput) return
          e.preventDefault()
            ; (document.querySelector('[placeholder*="Buscar"]') as HTMLInputElement)?.focus()
          break
        case 'escape':
          e.preventDefault()
          setCheckoutOpen(false)
          setRecentSalesOpen(false)
          setShiftReportOpen(false)
          break
        case 'f9':
          e.preventDefault()
          setCheckoutOpen(true)
          break
        case 'f5':
          e.preventDefault()
          if (cart.length > 0) {
            if (confirm('¿Deseas limpiar el carrito?')) {
              clearCart()
              toast.success('Carrito limpiado')
            }
          }
          break
        case 'd':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            setCheckoutOpen(true)
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [cart])

  const change = amountPaid ? (amountPaid > total ? amountPaid - total : 0) : 0

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
      {/* Left: Product Search/Scan */}
      <div className="flex-1 p-4 md:p-6 overflow-auto custom-scrollbar">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Punto de Venta</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Terminal #01</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <ShiftSwitcher
              storeId={store.storeId}
              currentShift={currentShift}
              onShiftChange={handleShiftChange}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRecentSalesOpen(true)}
              className="h-9 hover:bg-primary/5 border-primary/20"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Ventas (F2)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShiftReportOpen(true)}
              className="h-9 hover:bg-primary/5 border-primary/20"
            >
              <Clock className="h-4 w-4 mr-2" />
              Cierre
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="h-9 w-9"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button
              onClick={() => setScannerOpen(true)}
              size="lg"
              className="md:col-span-1 h-16 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 group"
            >
              <Camera className="mr-2 h-6 w-6 group-hover:scale-110 transition-transform" />
              Escanear
            </Button>

            <div className="md:col-span-3 flex items-center bg-card border border-border rounded-2xl px-4 shadow-sm focus-within:ring-2 ring-primary/20 transition-all">
              <Search className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1 ml-2">
                <ProductSearch
                  storeId={store.storeId}
                  categoryId={selectedCategoryId}
                  onProductSelect={(product) => {
                    addToCart(product)
                    toast.success(`Se añadió ${product.name} al carrito`)
                  }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              {/* Categories & Favorites */}
              <FavoriteProducts
                storeId={store.storeId}
                onProductSelect={(product) => {
                  addToCart(product)
                  toast.success(`Se añadió ${product.name} al carrito`)
                }}
              />
            </div>

            <div className="space-y-6">
              {/* Personal Stats */}
              <PersonalStats
                storeId={store.storeId}
                refreshTrigger={statRefreshTrigger}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right: Cart (Sidebar) */}
      <div className="w-full lg:w-[420px] glass border-l border-border/50 flex flex-col h-full overflow-hidden shadow-2xl relative">
        <div className="p-6 border-b border-border/50 flex items-center justify-between bg-primary/5">
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
            className="text-muted-foreground hover:text-destructive transition-colors"
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
              <p className="text-sm">Agrega productos para comenzar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className="group relative bg-card/50 hover:bg-card border border-border/50 rounded-2xl p-4 transition-all hover:shadow-lg hover:-translate-y-0.5 overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0 pr-8">
                      <p className="font-bold text-base line-clamp-1">{item.name}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5 uppercase tracking-tighter">SKU: {item.sku}</p>

                      {item.trackExpirationDates && item.nearestExpirationDate && (
                        <div className={`text-[10px] mt-2 inline-flex items-center px-2 py-0.5 rounded-full font-bold uppercase tracking-tight ${item.hasExpiredBatches ? 'bg-destructive/10 text-destructive' : 'bg-amber-100 text-amber-700'}`}>
                          {item.hasExpiredBatches ? <AlertTriangle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                          {item.hasExpiredBatches ? 'VENCIDO' : `VENCE: ${new Date(item.nearestExpirationDate).toLocaleDateString()}`}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFromCart(item.productId)}
                      className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-end justify-between">
                    <div className="flex items-center bg-secondary/50 rounded-xl p-1 border border-border/50">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateQuantity(item.productId, -1)}
                        disabled={item.quantity <= 1}
                        className="h-8 w-8 rounded-lg"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-10 text-center font-bold text-lg">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateQuantity(item.productId, 1)}
                        disabled={item.quantity >= item.stock}
                        className="h-8 w-8 rounded-lg"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="text-right">
                      {item.discount && item.discount > 0 && (
                        <p className="text-xs text-primary font-medium mb-0.5">
                          -{formatCurrency(item.discount)}
                        </p>
                      )}
                      <p className="text-xl font-black gradient-text">
                        {formatCurrency((item.price * item.quantity) - (item.discount || 0))}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                        {formatCurrency(item.price)} unit.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 bg-card border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.05)] space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-muted-foreground font-medium">
              <span className="uppercase tracking-widest">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {taxEnabled && (
              <div className="flex justify-between text-sm text-muted-foreground font-medium">
                <span className="uppercase tracking-widest">{taxName}</span>
                <span>{formatCurrency(tax)}</span>
              </div>
            )}
            {cartDiscount > 0 && (
              <div className="flex justify-between text-sm text-primary font-bold">
                <span className="uppercase tracking-widest">Descuento Global</span>
                <span>-{formatCurrency(cartDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-4 border-t border-border mt-2">
              <span className="text-base font-bold uppercase tracking-button">Total a Pagar</span>
              <span className="text-3xl font-black text-primary drop-shadow-sm">
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <DiscountControls
              cartTotal={subtotal + tax}
              currentDiscount={cartDiscount}
              onDiscountChange={setCartDiscount}
            />

            <Button
              className="w-full h-16 text-xl font-bold rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all group"
              onClick={() => setCheckoutOpen(true)}
              disabled={cart.length === 0}
            >
              Finalizar Venta (F9)
              <ShoppingCart className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>

      <BarcodeScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleBarcodeDetected}
      />

      <RecentSalesDialog
        storeId={store.storeId}
        isOpen={recentSalesOpen}
        onOpenChange={setRecentSalesOpen}
        onDuplicateSale={duplicateSaleToCart}
      />

      <ShiftReportDialog
        storeId={store.storeId}
        isOpen={shiftReportOpen}
        onOpenChange={setShiftReportOpen}
      />

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pagar</DialogTitle>
            <DialogDescription>
              Completa la venta seleccionando el método de pago
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Monto Recibido</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  autoFocus
                  value={amountPaid ?? ''}
                  onChange={(e) => setAmountPaid(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="0.00"
                  className="pl-8 h-16 text-2xl font-black rounded-2xl bg-secondary/30"
                />
              </div>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[100, 500, 1000, 2000, 5000].map(amount => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    className="h-10 font-bold"
                    onClick={() => setAmountPaid((amountPaid || 0) + amount)}
                  >
                    +{amount}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 font-bold"
                  onClick={() => setAmountPaid(total)}
                >
                  Exacto
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-6 bg-gradient-to-br from-card to-secondary/30 rounded-3xl border border-border shadow-inner space-y-4">
                <div className="flex justify-between items-center text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  <span>Total Venta</span>
                  <span className="text-foreground text-lg">{formatCurrency(total)}</span>
                </div>

                {amountPaid && (
                  <>
                    <div className="flex justify-between items-center text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      <span>Recibido</span>
                      <span className="text-secondary-foreground text-lg">{formatCurrency(amountPaid)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-border">
                      <span className="text-base font-bold uppercase tracking-widest text-primary">Vuelto/Cambio</span>
                      <span className={`text-3xl font-black ${change < 0 ? 'text-destructive' : 'text-primary'}`}>
                        {formatCurrency(change)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              size="lg"
              className="flex-1 h-14 rounded-2xl font-bold"
              onClick={() => setCheckoutOpen(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              size="lg"
              className="flex-1 h-14 rounded-2xl font-bold shadow-lg shadow-primary/20"
              onClick={handleCheckout}
              disabled={isProcessing || (amountPaid !== undefined && amountPaid < total)}
            >
              {isProcessing ? 'Procesando...' : 'Confirmar Venta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee Selector */}
      <EmployeeSelector
        storeId={store?.storeId || ''}
        isOpen={showEmployeeSelector}
        onClose={() => setShowEmployeeSelector(false)}
        onEmployeeSelected={(employeeId, name) => {
          toast.success(`Empleado activo: ${name}`)
          router.refresh()
        }}
      />

      {/* Sale Success Dialog with Invoice */}
      <SaleSuccessDialog
        isOpen={successDialogOpen}
        onClose={() => {
          setSuccessDialogOpen(false)
          setLastSale(null)
        }}
        sale={lastSale}
      />

      {/* Expired Product Warning Dialog */}
      <Dialog open={expiredWarningOpen} onOpenChange={setExpiredWarningOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Advertencia: Producto Vencido
            </DialogTitle>
            <DialogDescription>
              Este producto tiene lotes vencidos. ¿Deseas continuar con la venta?
            </DialogDescription>
          </DialogHeader>

          {expiredWarningProduct && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
                <p className="font-semibold text-sm">{expiredWarningProduct.name}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  SKU: {expiredWarningProduct.sku}
                </p>
                {expiredWarningProduct.nearestExpirationDate && (
                  <p className="text-sm mt-2 text-red-600 font-semibold">
                    Fecha de vencimiento:{' '}
                    {new Date(expiredWarningProduct.nearestExpirationDate).toLocaleDateString('es-ES')}
                  </p>
                )}
              </div>

              <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Nota:</strong> La venta de productos vencidos puede estar regulada.
                  Asegúrate de cumplir con las normativas locales.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setExpiredWarningOpen(false)
                setExpiredWarningProduct(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmAddExpiredProduct}
            >
              Confirmar Venta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

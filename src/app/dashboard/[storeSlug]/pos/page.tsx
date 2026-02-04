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
import { Camera, Trash2, Plus, Minus, ShoppingCart, Store, Clock, BarChart3 } from 'lucide-react'
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
  const { activeEmployee, setActiveEmployee } = useActiveEmployee()

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

  const addToCart = (product: any) => {
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
        },
      ]
    })
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
    <div className="h-full flex flex-col lg:flex-row">
      {/* Left: Product Search/Scan */}
      <div className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-2 mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold">Caja</h1>
          <div className="flex flex-col md:flex-row gap-3 md:gap-2 w-full md:w-auto">
            <ShiftSwitcher
              storeId={store.storeId}
              currentShift={currentShift}
              onShiftChange={handleShiftChange}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRecentSalesOpen(true)}
              title="F2"
              className="w-full md:w-auto"
            >
              Últimas Ventas
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShiftReportOpen(true)}
              className="w-full md:w-auto"
            >
              <Clock className="h-4 w-4 mr-2" />
              Cerrar Turno
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={() => setScannerOpen(true)}
              size="lg"
              className="flex-1 h-14 md:h-12 text-base"
            >
              <Camera className="mr-2 h-5 w-5" />
              Escanear Código de Barras
            </Button>
          </div>

          <ProductSearch
            storeId={store.storeId}
            categoryId={selectedCategoryId}
            onProductSelect={(product) => {
              addToCart(product)
              toast.success(`Se añadió ${product.name} al carrito`)
            }}
          />

          {/* Favorite Products */}
          <FavoriteProducts
            storeId={store.storeId}
            onProductSelect={(product) => {
              addToCart(product)
              toast.success(`Se añadió ${product.name} al carrito`)
            }}
          />

          {/* Personal Stats */}
          <PersonalStats
            storeId={store.storeId}
            refreshTrigger={statRefreshTrigger}
          />
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-full lg:w-96 flex flex-col max-h-[50vh] lg:max-h-none">
        <div className="p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Carrito ({cart.length})
          </h2>
          {currentShift && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Turno: {currentShift.startTime}
              {currentShift.endTime && ` - ${currentShift.endTime}`}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6 space-y-3 md:space-y-4">
          {cart.length === 0 ? (
            <p className="text-center text-gray-500 mt-8">El carrito está vacío</p>
          ) : (
            cart.map((item) => (
              <Card key={item.productId} style={{ borderColor: 'var(--color-accent)' }}>
                <CardContent className="p-3 md:p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <p className="font-medium text-sm md:text-base">{item.name}</p>
                      <p className="text-xs md:text-sm text-gray-500">{item.sku}</p>
                      {item.discount && item.discount > 0 && (
                        <p className="text-xs mt-1" style={{ color: 'var(--color-primary)' }}>
                          Descuento: {formatCurrency(item.discount)}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromCart(item.productId)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" style={{ color: '#ef4444' }} />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.productId, -1)}
                        disabled={item.quantity <= 1}
                        className="h-9 w-9 p-0 md:h-8 md:w-8"
                      >
                        <Minus className="h-4 w-4 md:h-3 md:w-3" />
                      </Button>
                      <span className="w-10 md:w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.productId, 1)}
                        disabled={item.quantity >= item.stock}
                        className="h-9 w-9 p-0 md:h-8 md:w-8"
                      >
                        <Plus className="h-4 w-4 md:h-3 md:w-3" />
                      </Button>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-sm md:text-base">
                        {formatCurrency((item.price * item.quantity) - (item.discount || 0))}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(item.price)} c/u
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="p-4 md:p-6 space-y-4" style={{ borderTop: '1px solid var(--color-primary)' }}>
          <div className="space-y-2">
            <div className="flex justify-between text-sm md:text-base">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {taxEnabled && (
              <div className="flex justify-between text-sm md:text-base">
                <span>{taxName}:</span>
                <span>{formatCurrency(tax)}</span>
              </div>
            )}
            {cartDiscount > 0 && (
              <div className="flex justify-between text-sm md:text-base" style={{ color: 'var(--color-primary)' }}>
                <span>Descuento:</span>
                <span>-{formatCurrency(cartDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg md:text-xl font-bold pt-2" style={{ borderTop: '2px solid var(--color-primary)' }}>
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <DiscountControls
            cartTotal={subtotal + tax}
            currentDiscount={cartDiscount}
            onDiscountChange={setCartDiscount}
          />

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-12 md:h-10"
              onClick={clearCart}
              disabled={cart.length === 0}
            >
              Limpiar
            </Button>
            <Button
              className="flex-1 h-12 md:h-10 text-base"
              onClick={() => setCheckoutOpen(true)}
              disabled={cart.length === 0}
            >
              Pagar (F9)
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

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Monto Pagado (Opcional)</Label>
              <Input
                type="number"
                step="0.01"
                value={amountPaid ?? ''}
                onChange={(e) => setAmountPaid(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Dejar vacío si no se aplica"
              />
            </div>

            {amountPaid && amountPaid > 0 && (
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="font-semibold">{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pagado:</span>
                  <span className="font-semibold">{formatCurrency(amountPaid)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Cambio:</span>
                  <span style={{ color: change < 0 ? '#ef4444' : 'var(--color-primary)' }}>
                    {formatCurrency(change)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCheckoutOpen(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={isProcessing}
            >
              {isProcessing ? 'Procesando...' : 'Completar Venta'}
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
          // No need to manually set localStorage here,
          // EmployeeSelector now uses setActiveEmployee correctly
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
    </div>
  )
}

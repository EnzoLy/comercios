'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, Plus, Trash2, Search } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils/currency'

interface QuoteItem {
  id?: string
  itemType: 'product' | 'service' | 'custom'
  productId?: string
  serviceId?: string
  name: string
  quantity: number
  unitPrice: number
  discount: number
  taxRate: number
}

interface Quote {
  id: string
  clientName: string
  clientPhone?: string
  clientEmail?: string
  notes?: string
  expiresAt?: string
  items: any[]
}

export default function EditQuotePage() {
  const params = useParams()
  const router = useRouter()
  const storeSlug = params.storeSlug as string
  const quoteId = params.quoteId as string
  const [storeId, setStoreId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [items, setItems] = useState<QuoteItem[]>([])
  const [newItemSearch, setNewItemSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showCustomItemForm, setShowCustomItemForm] = useState(false)
  const [customItemName, setCustomItemName] = useState('')
  const [customItemPrice, setCustomItemPrice] = useState('')

  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    notes: '',
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const storeRes = await fetch(`/api/stores?slug=${storeSlug}`)
        const storeData = await storeRes.json()
        const actualStoreId = storeData[0]?.id
        setStoreId(actualStoreId)

        const quoteRes = await fetch(`/api/stores/${actualStoreId}/quotes/${quoteId}`)
        const quote: Quote = await quoteRes.json()

        setFormData({
          clientName: quote.clientName,
          clientPhone: quote.clientPhone || '',
          notes: quote.notes || '',
        })

        const mappedItems = quote.items.map((item: any) => ({
          id: item.id,
          itemType: item.itemType,
          productId: item.productId,
          serviceId: item.serviceId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          taxRate: item.taxRate,
        }))
        setItems(mappedItems)
      } catch (error) {
        console.error('Failed to fetch quote:', error)
      } finally {
        setLoading(false)
      }
    }

    if (storeSlug) fetchData()
  }, [storeSlug, quoteId])

  const searchItems = async (query: string) => {
    if (!query || !storeId) {
      setSearchResults([])
      return
    }

    try {
      const [productsRes, servicesRes] = await Promise.all([
        fetch(`/api/stores/${storeId}/products?search=${query}&pageSize=10`),
        fetch(`/api/stores/${storeId}/services?search=${query}&pageSize=10`),
      ])

      const productsData = await productsRes.json()
      const servicesData = await servicesRes.json()

      const results = [
        ...((productsData.products || []).map((p: any) => ({
          type: 'product',
          id: p.id,
          name: p.name,
          price: p.sellingPrice,
          originalItem: p,
        }))),
        ...((servicesData.services || []).map((s: any) => ({
          type: 'service',
          id: s.id,
          name: s.name,
          price: s.price,
          originalItem: s,
        }))),
      ]

      setSearchResults(results)
    } catch (error) {
      console.error('Failed to search items:', error)
      setSearchResults([])
    }
  }

  const handleAddItem = (result: any) => {
    const newItem: QuoteItem = {
      itemType: result.type as 'product' | 'service',
      ...(result.type === 'product' ? { productId: result.id } : { serviceId: result.id }),
      name: result.name,
      quantity: 1,
      unitPrice: result.price,
      discount: 0,
      taxRate: 0,
    }
    setItems([...items, newItem])
    setNewItemSearch('')
    setSearchResults([])
  }

  const handleAddCustomItem = () => {
    if (!customItemName || !customItemPrice) return

    const newItem: QuoteItem = {
      itemType: 'custom',
      name: customItemName,
      quantity: 1,
      unitPrice: parseFloat(customItemPrice),
      discount: 0,
      taxRate: 0,
    }
    setItems([...items, newItem])
    setCustomItemName('')
    setCustomItemPrice('')
    setShowCustomItemForm(false)
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  const calculateTotals = () => {
    let subtotal = 0
    let totalTax = 0

    items.forEach((item) => {
      const itemSubtotal = item.quantity * item.unitPrice
      const itemDiscount = item.discount || 0
      const itemTaxRate = item.taxRate || 0
      const taxAmount = (itemSubtotal - itemDiscount) * (itemTaxRate / 100)
      subtotal += itemSubtotal
      totalTax += taxAmount
    })

    const total = subtotal + totalTax
    return { subtotal, totalTax, total }
  }

  const { subtotal, totalTax, total } = calculateTotals()

  const handleSubmit = async () => {
    if (!items.length) {
      alert('Debes agregar al menos un item')
      return
    }

    if (!formData.clientName) {
      alert('El nombre del cliente es requerido')
      return
    }

    setSaving(true)

    try {
      const payload = {
        ...formData,
        items: items.map((item) => ({
          itemType: item.itemType,
          productId: item.productId || null,
          serviceId: item.serviceId || null,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          taxRate: item.taxRate,
        })),
        clientPhone: formData.clientPhone || null,
        notes: formData.notes || null,
      }

      const res = await fetch(`/api/stores/${storeId}/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Failed to update quote')
      router.push(`/dashboard/${storeSlug}/quotes/${quoteId}`)
    } catch (error) {
      console.error('Failed to update quote:', error)
      alert('Error al actualizar el presupuesto')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="text-center py-12">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl">
        <Link
          href={`/dashboard/${storeSlug}/quotes/${quoteId}`}
          className="inline-flex items-center gap-2 mb-6 text-sm font-medium hover:opacity-80"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al Presupuesto
        </Link>

        <div className="rounded-lg border bg-card p-6 shadow-sm space-y-6">
          <h1 className="text-2xl font-bold">Editar Presupuesto</h1>

          {/* Client Info */}
          <div className="space-y-4 border-b pb-6">
            <h2 className="text-lg font-semibold">Información del Cliente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Nombre del Cliente *</Label>
                <Input
                  id="clientName"
                  required
                  value={formData.clientName}
                  onChange={(e) =>
                    setFormData({ ...formData, clientName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientPhone">Teléfono</Label>
                <Input
                  id="clientPhone"
                  value={formData.clientPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, clientPhone: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Items del Presupuesto</h2>

            {/* Add Item */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar producto o servicio..."
                  className="pl-10"
                  value={newItemSearch}
                  onChange={(e) => {
                    setNewItemSearch(e.target.value)
                    searchItems(e.target.value)
                  }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCustomItemForm(!showCustomItemForm)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Custom
              </Button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border rounded-lg p-2 max-h-48 overflow-y-auto bg-white dark:bg-gray-950">
                {searchResults.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    type="button"
                    onClick={() => handleAddItem(result)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded flex justify-between items-center text-sm"
                  >
                    <span>{result.name}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {formatCurrency(result.price)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Custom Item Form */}
            {showCustomItemForm && (
              <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-950 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input
                    placeholder="Nombre del item"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Precio"
                    value={customItemPrice}
                    onChange={(e) => setCustomItemPrice(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleAddCustomItem}
                      className="flex-1"
                    >
                      Agregar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCustomItemForm(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Items Table */}
            {items.length > 0 && (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-900">
                      <TableHead>Nombre</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Precio Unit.</TableHead>
                      <TableHead>Descuento</TableHead>
                      <TableHead>% IVA</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => {
                      const itemSubtotal = item.quantity * item.unitPrice
                      const itemDiscount = item.discount || 0
                      const itemTaxRate = item.taxRate || 0
                      const itemTotal =
                        itemSubtotal - itemDiscount + (itemSubtotal - itemDiscount) * (itemTaxRate / 100)

                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="w-20">
                            <Input
                              type="number"
                              step="1"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateItem(index, 'quantity', parseInt(e.target.value))
                              }
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell className="w-24">
                            <Input
                              type="number"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) =>
                                handleUpdateItem(index, 'unitPrice', parseFloat(e.target.value))
                              }
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell className="w-20">
                            <Input
                              type="number"
                              step="0.01"
                              value={item.discount}
                              onChange={(e) =>
                                handleUpdateItem(index, 'discount', parseFloat(e.target.value))
                              }
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell className="w-20">
                            <Input
                              type="number"
                              step="0.01"
                              value={item.taxRate}
                              onChange={(e) =>
                                handleUpdateItem(index, 'taxRate', parseFloat(e.target.value))
                              }
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(itemTotal)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="border-t pt-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>IVA:</span>
              <span>{formatCurrency(totalTax)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

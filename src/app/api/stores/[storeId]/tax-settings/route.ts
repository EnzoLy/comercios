import { NextResponse } from 'next/server'
import { requireStoreAccess } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Store } from '@/lib/db/entities/store.entity'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params
    await requireStoreAccess(storeId)

    const dataSource = await getDataSource()
    const store = await dataSource.getRepository(Store).findOne({
      where: { id: storeId },
    })

    if (!store) {
      return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      taxEnabled: store.taxEnabled,
      defaultTaxRate: store.defaultTaxRate,
      taxName: store.taxName || 'IVA',
    })
  } catch (error) {
    console.error('Error fetching tax settings:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params
    await requireStoreAccess(storeId)

    const { taxEnabled, defaultTaxRate, taxName } = await request.json()

    // Validar datos
    if (defaultTaxRate !== undefined && (defaultTaxRate < 0 || defaultTaxRate > 100)) {
      return NextResponse.json(
        { error: 'La tasa de impuesto debe estar entre 0 y 100' },
        { status: 400 }
      )
    }

    const dataSource = await getDataSource()
    const storeRepo = dataSource.getRepository(Store)

    const store = await storeRepo.findOne({
      where: { id: storeId },
    })

    if (!store) {
      return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
    }

    // Actualizar configuración de impuestos
    store.taxEnabled = taxEnabled ?? store.taxEnabled
    store.defaultTaxRate = defaultTaxRate ?? store.defaultTaxRate
    store.taxName = taxName ?? store.taxName

    await storeRepo.save(store)

    return NextResponse.json({
      message: 'Configuración de impuestos actualizada correctamente',
      taxEnabled: store.taxEnabled,
      defaultTaxRate: store.defaultTaxRate,
      taxName: store.taxName,
    })
  } catch (error) {
    console.error('Error updating tax settings:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

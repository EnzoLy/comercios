import { NextResponse } from 'next/server'
import { requireStoreAccess, isStoreOwner } from '@/lib/auth/permissions'
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
      select: ['id', 'name', 'slug'],
    })

    if (!store) {
      return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      id: store.id,
      name: store.name,
      slug: store.slug,
    })
  } catch (error) {
    console.error('Get store info error:', error)
    return NextResponse.json(
      { error: 'Error al obtener información de la tienda' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params

    // Solo el dueño puede cambiar el nombre y slug de la tienda
    const owner = await isStoreOwner(storeId)
    if (!owner) {
      return NextResponse.json(
        { error: 'Solo el dueño de la tienda puede modificar esta información' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, slug } = body

    // Validaciones
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'El nombre de la tienda es requerido' },
        { status: 400 }
      )
    }

    if (!slug || typeof slug !== 'string' || !slug.trim()) {
      return NextResponse.json(
        { error: 'El slug es requerido' },
        { status: 400 }
      )
    }

    // Validar formato del slug
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: 'El slug solo puede contener letras minúsculas, números y guiones' },
        { status: 400 }
      )
    }

    const dataSource = await getDataSource()
    const storeRepo = dataSource.getRepository(Store)

    // Verificar que el slug no esté en uso por otra tienda
    const existingStore = await storeRepo.findOne({
      where: { slug },
    })

    if (existingStore && existingStore.id !== storeId) {
      return NextResponse.json(
        { error: 'Este slug ya está en uso por otra tienda' },
        { status: 409 }
      )
    }

    // Actualizar la tienda
    await storeRepo.update(
      { id: storeId },
      {
        name: name.trim(),
        slug: slug.trim(),
      }
    )

    const updatedStore = await storeRepo.findOne({
      where: { id: storeId },
      select: ['id', 'name', 'slug'],
    })

    return NextResponse.json({
      success: true,
      store: updatedStore,
      message: 'Información actualizada correctamente',
    })
  } catch (error) {
    console.error('Update store info error:', error)
    return NextResponse.json(
      { error: 'Error al actualizar información de la tienda' },
      { status: 500 }
    )
  }
}

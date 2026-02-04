import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const uploadType = (formData.get('uploadType') as string) || 'image' // 'image' or 'document'
    const folder = (formData.get('folder') as string) || 'products' // 'products', 'suppliers/documents', 'suppliers/logos'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Define valid types and size limits based on upload type
    let validTypes: string[]
    let maxSize: number

    if (uploadType === 'document') {
      validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
      ]
      maxSize = 20 * 1024 * 1024 // 20MB for documents
    } else {
      // Default to image
      validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
      maxSize = 5 * 1024 * 1024 // 5MB for images
    }

    // Validate file type
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed types: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size too large. Maximum size is ${maxSize / (1024 * 1024)}MB.` },
        { status: 400 }
      )
    }

    // Create unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop()
    const filename = `${timestamp}-${randomString}.${extension}`

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', folder)
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filepath = join(uploadsDir, filename)
    await writeFile(filepath, buffer)

    // Return the public URL and metadata
    const fileUrl = `/uploads/${folder}/${filename}`

    return NextResponse.json({
      success: true,
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      // Maintain backward compatibility
      imageUrl: uploadType === 'image' ? fileUrl : undefined,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}

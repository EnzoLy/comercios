import 'reflect-metadata'
import { getDataSource } from '../src/lib/db/data-source'
import { Category } from '../src/lib/db/entities/category.entity'
import { Product } from '../src/lib/db/entities/product.entity'
import { Store } from '../src/lib/db/entities/store.entity'

// Categorías realistas
const categories = [
  { name: 'Frutas y Verduras', sortOrder: 1 },
  { name: 'Carnes y Pescados', sortOrder: 2 },
  { name: 'Lácteos y Huevos', sortOrder: 3 },
  { name: 'Panadería y Pastelería', sortOrder: 4 },
  { name: 'Abarrotes', sortOrder: 5 },
  { name: 'Bebidas', sortOrder: 6 },
  { name: 'Limpieza y Hogar', sortOrder: 7 },
  { name: 'Higiene Personal', sortOrder: 8 },
  { name: 'Mascotas', sortOrder: 9 },
  { name: 'Snacks y Dulces', sortOrder: 10 },
]

// Productos reales con precios realistas
const products = [
  // FRUTAS Y VERDURAS
  { name: 'Manzana Roja', sku: 'FRU001', barcode: '750000001', price: 45.00, category: 'Frutas y Verduras', stock: 50, unit: 'kg' },
  { name: 'Plátano', sku: 'FRU002', barcode: '750000002', price: 35.00, category: 'Frutas y Verduras', stock: 40, unit: 'kg' },
  { name: 'Naranja', sku: 'FRU003', barcode: '750000003', price: 38.00, category: 'Frutas y Verduras', stock: 45, unit: 'kg' },
  { name: 'Limón', sku: 'FRU004', barcode: '750000004', price: 55.00, category: 'Frutas y Verduras', stock: 30, unit: 'kg' },
  { name: 'Papa', sku: 'FRU005', barcode: '750000005', price: 22.00, category: 'Frutas y Verduras', stock: 100, unit: 'kg' },
  { name: 'Zanahoria', sku: 'FRU006', barcode: '750000006', price: 28.00, category: 'Frutas y Verduras', stock: 60, unit: 'kg' },
  { name: 'Tomate', sku: 'FRU007', barcode: '750000007', price: 42.00, category: 'Frutas y Verduras', stock: 55, unit: 'kg' },
  { name: 'Cebolla', sku: 'FRU008', barcode: '750000008', price: 25.00, category: 'Frutas y Verduras', stock: 40, unit: 'kg' },
  { name: 'Chile Verde', sku: 'FRU009', barcode: '750000009', price: 85.00, category: 'Frutas y Verduras', stock: 25, unit: 'kg' },
  { name: 'Aguacate', sku: 'FRU010', barcode: '750000010', price: 95.00, category: 'Frutas y Verduras', stock: 35, unit: 'pza' },
  { name: 'Lechuga', sku: 'FRU011', barcode: '750000011', price: 15.00, category: 'Frutas y Verduras', stock: 30, unit: 'pza' },
  { name: 'Espinaca', sku: 'FRU012', barcode: '750000012', price: 18.00, category: 'Frutas y Verduras', stock: 25, unit: 'manojo' },

  // CARNES Y PESCADOS
  { name: 'Pechuga de Pollo', sku: 'CAR001', barcode: '750000013', price: 125.00, category: 'Carnes y Pescados', stock: 30, unit: 'kg' },
  { name: 'Muslo de Pollo', sku: 'CAR002', barcode: '750000014', price: 95.00, category: 'Carnes y Pescados', stock: 25, unit: 'kg' },
  { name: 'Res Molida', sku: 'CAR003', barcode: '750000015', price: 180.00, category: 'Carnes y Pescados', stock: 20, unit: 'kg' },
  { name: 'Chuleta de Res', sku: 'CAR004', barcode: '750000016', price: 220.00, category: 'Carnes y Pescados', stock: 15, unit: 'kg' },
  { name: 'Pescado Blanco', sku: 'CAR005', barcode: '750000017', price: 150.00, category: 'Carnes y Pescados', stock: 20, unit: 'kg' },
  { name: 'Camarones', sku: 'CAR006', barcode: '750000018', price: 280.00, category: 'Carnes y Pescados', stock: 15, unit: 'kg' },
  { name: 'Salmoón', sku: 'CAR007', barcode: '750000019', price: 320.00, category: 'Carnes y Pescados', stock: 10, unit: 'kg' },
  { name: 'Chorizo', sku: 'CAR008', barcode: '750000020', price: 145.00, category: 'Carnes y Pescados', stock: 25, unit: 'kg' },
  { name: 'Jamón', sku: 'CAR009', barcode: '750000021', price: 185.00, category: 'Carnes y Pescados', stock: 15, unit: 'kg' },
  { name: 'Tocino', sku: 'CAR010', barcode: '750000022', price: 165.00, category: 'Carnes y Pescados', stock: 20, unit: 'kg' },

  // LÁCTEOS Y HUEVOS
  { name: 'Leche Entera 1L', sku: 'LAC001', barcode: '750000023', price: 28.00, category: 'Lácteos y Huevos', stock: 100, unit: 'pza' },
  { name: 'Leche Deslactosada 1L', sku: 'LAC002', barcode: '750000024', price: 32.00, category: 'Lácteos y Huevos', stock: 80, unit: 'pza' },
  { name: 'Yogurt Natural', sku: 'LAC003', barcode: '750000025', price: 22.00, category: 'Lácteos y Huevos', stock: 60, unit: 'pza' },
  { name: 'Queso Oaxaca', sku: 'LAC004', barcode: '750000026', price: 95.00, category: 'Lácteos y Huevos', stock: 40, unit: 'kg' },
  { name: 'Queso Manchego', sku: 'LAC005', barcode: '750000027', price: 180.00, category: 'Lácteos y Huevos', stock: 30, unit: 'kg' },
  { name: 'Mantequilla', sku: 'LAC006', barcode: '750000028', price: 55.00, category: 'Lácteos y Huevos', stock: 50, unit: 'pza' },
  { name: 'Huevos (12 pzas)', sku: 'LAC007', barcode: '750000029', price: 58.00, category: 'Lácteos y Huevos', stock: 80, unit: 'carton' },
  { name: 'Crema', sku: 'LAC008', barcode: '750000030', price: 38.00, category: 'Lácteos y Huevos', stock: 45, unit: 'pza' },
  { name: 'Requesón', sku: 'LAC009', barcode: '750000031', price: 45.00, category: 'Lácteos y Huevos', stock: 35, unit: 'kg' },
  { name: 'Oaxaca Rebanado', sku: 'LAC010', barcode: '750000032', price: 88.00, category: 'Lácteos y Huevos', stock: 25, unit: 'kg' },

  // PANADERÍA Y PASTELERÍA
  { name: 'Pan Blanco', sku: 'PAN001', barcode: '750000033', price: 8.00, category: 'Panadería y Pastelería', stock: 100, unit: 'pza' },
  { name: 'Pan Integral', sku: 'PAN002', barcode: '750000034', price: 12.00, category: 'Panadería y Pastelería', stock: 80, unit: 'pza' },
  { name: 'Bolillo', sku: 'PAN003', barcode: '750000035', price: 6.00, category: 'Panadería y Pastelería', stock: 150, unit: 'pza' },
  { name: 'Concha', sku: 'PAN004', barcode: '750000036', price: 8.00, category: 'Panadería y Pastelería', stock: 120, unit: 'pza' },
  { name: 'Pan Dulce', sku: 'PAN005', barcode: '750000037', price: 10.00, category: 'Panadería y Pastelería', stock: 90, unit: 'pza' },
  { name: 'Pastel de Chocolate', sku: 'PAN006', barcode: '750000038', price: 45.00, category: 'Panadería y Pastelería', stock: 30, unit: 'pza' },
  { name: 'Pastel de Queso', sku: 'PAN007', barcode: '750000039', price: 42.00, category: 'Panadería y Pastelería', stock: 25, unit: 'pza' },
  { name: 'Galletas María', sku: 'PAN008', barcode: '750000040', price: 18.00, category: 'Panadería y Pastelería', stock: 60, unit: 'pqt' },
  { name: 'Galletas Chokis', sku: 'PAN009', barcode: '750000041', price: 22.00, category: 'Panadería y Pastelería', stock: 55, unit: 'pqt' },
  { name: 'Donas', sku: 'PAN010', barcode: '750000042', price: 15.00, category: 'Panadería y Pastelería', stock: 40, unit: 'pza' },

  // ABARROTES
  { name: 'Arroz Blanco 1kg', sku: 'ABA001', barcode: '750000043', price: 24.00, category: 'Abarrotes', stock: 120, unit: 'pqt' },
  { name: 'Frijol Negro 1kg', sku: 'ABA002', barcode: '750000044', price: 38.00, category: 'Abarrotes', stock: 100, unit: 'pqt' },
  { name: 'Frijol Negro 1kg', sku: 'ABA003', barcode: '750000045', price: 42.00, category: 'Abarrotes', stock: 90, unit: 'pqt' },
  { name: 'Pasta Spaghetti 1kg', sku: 'ABA004', barcode: '750000046', price: 28.00, category: 'Abarrotes', stock: 80, unit: 'pqt' },
  { name: 'Aceite Vegetal 1L', sku: 'ABA005', barcode: '750000047', price: 45.00, category: 'Abarrotes', stock: 70, unit: 'pza' },
  { name: 'Sal 1kg', sku: 'ABA006', barcode: '750000048', price: 22.00, category: 'Abarrotes', stock: 150, unit: 'pqt' },
  { name: 'Azúcar 1kg', sku: 'ABA007', barcode: '750000049', price: 26.00, category: 'Abarrotes', stock: 130, unit: 'pqt' },
  { name: 'Café Tostado 500g', sku: 'ABA008', barcode: '750000050', price: 85.00, category: 'Abarrotes', stock: 60, unit: 'pqt' },
  { name: 'Salsa Tomate 500g', sku: 'ABA009', barcode: '750000051', price: 18.00, category: 'Abarrotes', stock: 90, unit: 'pza' },
  { name: 'Atún en Agua', sku: 'ABA010', barcode: '750000052', price: 16.00, category: 'Abarrotes', stock: 80, unit: 'lata' },
  { name: 'Frijol Bayo 1kg', sku: 'ABA011', barcode: '750000053', price: 40.00, category: 'Abarrotes', stock: 95, unit: 'pqt' },
  { name: 'Lentejas 1kg', sku: 'ABA012', barcode: '750000054', price: 48.00, category: 'Abarrotes', stock: 70, unit: 'pqt' },
  { name: 'Garrosa 1kg', sku: 'ABA013', barcode: '750000055', price: 125.00, category: 'Abarrotes', stock: 50, unit: 'pqt' },
  { name: 'Masa de Maíz 1kg', sku: 'ABA014', barcode: '750000056', price: 18.00, category: 'Abarrotes', stock: 110, unit: 'pqt' },

  // BEBIDAS
  { name: 'Coca-Cola 600ml', sku: 'BEB001', barcode: '750000057', price: 15.00, category: 'Bebidas', stock: 150, unit: 'pza' },
  { name: 'Coca-Cola 2L', sku: 'BEB002', barcode: '750000058', price: 28.00, category: 'Bebidas', stock: 100, unit: 'pza' },
  { name: 'Sprite 600ml', sku: 'BEB003', barcode: '750000059', price: 15.00, category: 'Bebidas', stock: 130, unit: 'pza' },
  { name: 'Fanta 600ml', sku: 'BEB004', barcode: '750000060', price: 15.00, category: 'Bebidas', stock: 125, unit: 'pza' },
  { name: 'Agua Natural 600ml', sku: 'BEB005', barcode: '750000061', price: 12.00, category: 'Bebidas', stock: 200, unit: 'pza' },
  { name: 'Agua Mineral 1L', sku: 'BEB006', barcode: '750000062', price: 18.00, category: 'Bebidas', stock: 150, unit: 'pza' },
  { name: 'Jugo de Naranja 1L', sku: 'BEB007', barcode: '750000063', price: 35.00, category: 'Bebidas', stock: 60, unit: 'pza' },
  { name: 'Cerveza 6-pack', sku: 'BEB008', barcode: '750000064', price: 85.00, category: 'Bebidas', stock: 80, unit: 'pqt' },
  { name: 'Cerveza Lata', sku: 'BEB009', barcode: '750000065', price: 22.00, category: 'Bebidas', stock: 200, unit: 'pza' },
  { name: 'Refresco de Manzana 1L', sku: 'BEB010', barcode: '750000066', price: 20.00, category: 'Bebidas', stock: 90, unit: 'pza' },
  { name: 'Té Helado 500ml', sku: 'BEB011', barcode: '750000067', price: 14.00, category: 'Bebidas', stock: 110, unit: 'pza' },
  { name: 'Energy Drink 473ml', sku: 'BEB012', barcode: '750000068', price: 32.00, category: 'Bebidas', stock: 70, unit: 'pza' },
  { name: 'Jugo Natural 1L', sku: 'BEB013', barcode: '750000069', price: 42.00, category: 'Bebidas', stock: 40, unit: 'pza' },

  // LIMPIEZA Y HOGAR
  { name: 'Detergente Líquido 1L', sku: 'LIM001', barcode: '750000070', price: 45.00, category: 'Limpieza y Hogar', stock: 60, unit: 'pza' },
  { name: 'Cloro 1L', sku: 'LIM002', barcode: '750000071', price: 35.00, category: 'Limpieza y Hogar', stock: 80, unit: 'pza' },
  { name: 'Escoba', sku: 'LIM003', barcode: '750000072', price: 55.00, category: 'Limpieza y Hogar', stock: 40, unit: 'pza' },
  { name: 'Trapeador de Algodón', sku: 'LIM004', barcode: '750000073', price: 68.00, category: 'Limpieza y Hogar', stock: 35, unit: 'pza' },
  { name: 'Jabón de Trastes 1kg', sku: 'LIM005', barcode: '750000074', price: 75.00, category: 'Limpieza y Hogar', stock: 50, unit: 'kg' },
  { name: 'Suavitel 1L', sku: 'LIM006', barcode: '750000075', price: 52.00, category: 'Limpieza y Hogar', stock: 65, unit: 'pza' },
  { name: 'Papel Higiénico 12 rollos', sku: 'LIM007', barcode: '750000076', price: 145.00, category: 'Limpieza y Hogar', stock: 45, unit: 'pqt' },
  { name: 'Servilletas 100 pzas', sku: 'LIM008', barcode: '750000077', price: 28.00, category: 'Limpieza y Hogar', stock: 70, unit: 'pqt' },
  { name: 'Esponja Multiuso', sku: 'LIM009', barcode: '750000078', price: 18.00, category: 'Limpieza y Hogar', stock: 90, unit: 'pza' },
  { name: 'Pinol', sku: 'LIM010', barcode: '750000079', price: 85.00, category: 'Limpieza y Hogar', stock: 55, unit: 'kg' },

  // HIGIENE PERSONAL
  { name: 'Champú 400ml', sku: 'HIG001', barcode: '750000080', price: 65.00, category: 'Higiene Personal', stock: 70, unit: 'pza' },
  { name: 'Acondicionador 400ml', sku: 'HIG002', barcode: '750000081', price: 68.00, category: 'Higiene Personal', stock: 65, unit: 'pza' },
  { name: 'Jabón de Tocador', sku: 'HIG003', barcode: '750000082', price: 35.00, category: 'Higiene Personal', stock: 80, unit: 'pza' },
  { name: 'Pasta Dental 100ml', sku: 'HIG004', barcode: '750000083', price: 28.00, category: 'Higiene Personal', stock: 90, unit: 'pza' },
  { name: 'Cepillo Dental', sku: 'HIG005', barcode: '750000084', price: 32.00, category: 'Higiene Personal', stock: 85, unit: 'pza' },
  { name: 'Desodorante Roll-on', sku: 'HIG006', barcode: '750000085', price: 55.00, category: 'Higiene Personal', stock: 75, unit: 'pza' },
  { name: 'Colonia 100ml', sku: 'HIG007', barcode: '750000086', price: 95.00, category: 'Higiene Personal', stock: 50, unit: 'pza' },
  { name: 'Crema Corporal 250ml', sku: 'HIG008', barcode: '750000087', price: 78.00, category: 'Higiene Personal', stock: 55, unit: 'pza' },
  { name: 'Shampoo Niños', sku: 'HIG009', barcode: '750000088', price: 58.00, category: 'Higiene Personal', stock: 60, unit: 'pza' },
  { name: 'Protector Solar', sku: 'HIG010', barcode: '750000089', price: 125.00, category: 'Higiene Personal', stock: 40, unit: 'pza' },

  // MASCOTAS
  { name: 'Alimento Perro 2kg', sku: 'MAS001', barcode: '750000090', price: 85.00, category: 'Mascotas', stock: 35, unit: 'pqt' },
  { name: 'Alimento Gato 2kg', sku: 'MAS002', barcode: '750000091', price: 88.00, category: 'Mascotas', stock: 30, unit: 'pqt' },
  { name: 'Cama Perro Mediana', sku: 'MAS003', barcode: '750000092', price: 450.00, category: 'Mascotas', stock: 15, unit: 'pza' },
  { name: 'Cama Gato', sku: 'MAS004', barcode: '750000093', price: 320.00, category: 'Mascotas', stock: 20, unit: 'pza' },
  { name: 'Juguete Perro', sku: 'MAS005', barcode: '750000094', price: 45.00, category: 'Mascotas', stock: 25, unit: 'pza' },
  { name: 'Collara Perro', sku: 'MAS006', barcode: '750000095', price: 35.00, category: 'Mascotas', stock: 40, unit: 'pza' },
  { name: 'Piedra Sanitaria Gato', sku: 'MAS007', barcode: '750000096', price: 48.00, category: 'Mascotas', stock: 50, unit: 'pza' },

  // SNACKS Y DULCES
  { name: 'Papas Fritas 50g', sku: 'SNA001', barcode: '750000097', price: 12.00, category: 'Snacks y Dulces', stock: 100, unit: 'pqt' },
  { name: 'Doritos', sku: 'SNA002', barcode: '750000098', price: 14.00, category: 'Snacks y Dulces', stock: 90, unit: 'pqt' },
  { name: 'Cheetos', sku: 'SNA003', barcode: '750000099', price: 13.00, category: 'Snacks y Dulces', stock: 95, unit: 'pqt' },
  { name: 'Chocolates Kinder', sku: 'SNA004', barcode: '750000100', price: 18.00, category: 'Snacks y Dulces', stock: 80, unit: 'pza' },
  { name: 'M&Ms', sku: 'SNA005', barcode: '750000101', price: 22.00, category: 'Snacks y Dulces', stock: 75, unit: 'pqt' },
  { name: 'Gomas de Mascar', sku: 'SNA006', barcode: '750000102', price: 8.00, category: 'Snacks y Dulces', stock: 120, unit: 'pqt' },
  { name: 'Paleta Payaso', sku: 'SNA007', barcode: '750000103', price: 6.00, category: 'Snacks y Dulces', stock: 150, unit: 'pza' },
  { name: 'Paleta Micho', sku: 'SNA008', barcode: '750000104', price: 6.00, category: 'Snacks y Dulces', stock: 145, unit: 'pza' },
  { name: 'Galletas Marías', sku: 'SNA009', barcode: '750000105', price: 18.00, category: 'Snacks y Dulces', stock: 85, unit: 'pqt' },
  { name: 'Galletas Emperador', sku: 'SNA010', barcode: '750000106', price: 16.00, category: 'Snacks y Dulces', stock: 90, unit: 'pqt' },
  { name: 'Polvorones', sku: 'SNA011', barcode: '750000107', price: 12.00, category: 'Snacks y Dulces', stock: 100, unit: 'pqt' },
  { name: 'Galletas Arcoíris', sku: 'SNA012', barcode: '750000108', price: 15.00, category: 'Snacks y Dulces', stock: 95, unit: 'pqt' },
  { name: 'Chicles Menta', sku: 'SNA013', barcode: '750000109', price: 5.00, category: 'Snacks y Dulces', stock: 200, unit: 'pqt' },
]

async function seedProducts() {
  console.log('🌱 Iniciando seed de productos...')

  try {
    // Get data source
    const dataSource = await getDataSource()
    const categoryRepo = dataSource.getRepository(Category)
    const productRepo = dataSource.getRepository(Product)
    const storeRepo = dataSource.getRepository(Store)

    // Get first store (or ask for store ID)
    const store = await storeRepo.findOne({ where: {} })

    if (!store) {
      console.error('❌ No hay tiendas en la base de datos. Crea una tienda primero.')
      process.exit(1)
    }

    console.log(`📦 Usando tienda: ${store.name} (${store.slug})`)

    // Create categories
    console.log('\n📁 Creando categorías...')
    const createdCategories: Map<string, string> = new Map()

    for (const cat of categories) {
      const existingCategory = await categoryRepo.findOne({
        where: { storeId: store.id, name: cat.name }
      })

      if (existingCategory) {
        console.log(`  ✓ Categoría ya existe: ${cat.name}`)
        createdCategories.set(cat.name, existingCategory.id)
      } else {
        const category = categoryRepo.create({
          ...cat,
          storeId: store.id,
          isActive: true,
        })
        const saved = await categoryRepo.save(category)
        createdCategories.set(cat.name, saved.id)
        console.log(`  ✅ Categoría creada: ${cat.name}`)
      }
    }

    // Create products
    console.log('\n📦 Creando productos...')
    let createdCount = 0
    let updatedCount = 0

    for (const prod of products) {
      const categoryId = createdCategories.get(prod.category)

      if (!categoryId) {
        console.error(`  ❌ No se encontró categoría: ${prod.category}`)
        continue
      }

      const existingProduct = await productRepo.findOne({
        where: { storeId: store.id, sku: prod.sku }
      })

      if (existingProduct) {
        console.log(`  ⚠️  Producto ya existe: ${prod.name}`)
        updatedCount++
      } else {
        const product = productRepo.create({
          name: prod.name,
          sku: prod.sku,
          barcode: prod.barcode,
          costPrice: prod.price * 0.7, // 30% margen
          sellingPrice: prod.price,
          currentStock: prod.stock,
          minStockLevel: Math.max(5, Math.floor(prod.stock * 0.2)),
          maxStockLevel: Math.floor(prod.stock * 2),
          unit: prod.unit,
          categoryId,
          storeId: store.id,
          isActive: true,
          trackStock: true,
          taxRate: 16, // IVA 16%
          overrideTaxRate: false,
        })
        await productRepo.save(product)
        console.log(`  ✅ ${prod.name} - $${prod.price.toFixed(2)} ${prod.unit}`)
        createdCount++
      }
    }

    console.log(`\n✨ Resumen:`)
    console.log(`   📁 Categorías totales: ${categories.length}`)
    console.log(`   📦 Productos creados: ${createdCount}`)
    console.log(`   📦 Productos ya existentes: ${updatedCount}`)
    console.log(`   📦 Total productos en tienda: ${products.length}`)
    console.log(`\n✅ Seed completado exitosamente!`)

    await dataSource.destroy()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error durante el seed:', error)
    process.exit(1)
  }
}

seedProducts()

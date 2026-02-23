# Sistema de Gestión Comercial

Un sistema integral de gestión de puntos de venta (POS) e inventario **multi-tenant** construido con tecnologías modernas. Diseñado para negocios minoristas que necesitan control avanzado de inventario, análisis de ventas, gestión de empleados y operaciones offline.

## Tabla de Contenidos

- [Características Principales](#características-principales)
- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Funcionalidades Detalladas](#funcionalidades-detalladas)
- [Arquitectura](#arquitectura)
- [Comandos de Base de Datos](#comandos-de-base-de-datos)
- [Desarrollo](#desarrollo)

---

## Características Principales

### 🏪 Multi-Tenant
- Cada tienda es un **tenant independiente**
- Múltiples usuarios pueden estar asociados a varias tiendas
- Completa **separación de datos** entre tiendas
- Los datos de productos, ventas e inventario se separan por tienda

### 📱 Sistema POS (Punto de Venta)
- **POS en tiempo real** optimizado para ventas rápidas
- Escaneo de códigos de barras
- Cálculo automático de impuestos
- Descuentos por artículo o por total
- Procesamiento de múltiples **métodos de pago**
- Impresión de recibos
- **Modo offline** completo
- Soporte para productos pesables (vendidos por kilogramo)

### 📊 Gestión de Inventario
- Control de stock en tiempo real
- Historial completo de movimientos de inventario
- Ajustes manuales de stock
- Alertas de bajo stock
- Categorización de productos
- Múltiples códigos de barras por producto (EAN-13, UPC-A, CODE-128, etc.)
- Importación/exportación en Excel

### 💼 Gestión de Empleados
- **Autenticación por PIN** para operarios de POS
- **Autenticación QR** para inicio rápido de turnos
- Control de turnos y jornadas
- Asignación de roles específicos:
  - **SUPER_ADMIN**: Administrador de plataforma
  - **ADMIN**: Administrador de tienda completo
  - **MANAGER**: Gerente con acceso limitado
  - **STOCK_KEEPER**: Gestor de inventario
  - **CASHIER**: Solo acceso a POS
- Historial de cambios de contraseña

### 📈 Analytics e Informes
- **Dashboard de análisis** en tiempo real
- Visualización de ventas por:
  - Período (día, semana, mes)
  - Categoría de producto
  - Empleado/Operario
  - Producto individual
- Gráficos interactivos
- Exportación de reportes
- Análisis de tendencias

### 🛒 Gestión de Compras
- **Órdenes de compra** con seguimiento
- Gestión de proveedores
- Historial de compras
- Recepción de mercadería
- Control de costos de producto

### 💳 Sistema de Proveedores
- Base de datos de proveedores
- Contactos y términos de pago
- Documentos adjuntos
- Historial de transacciones
- Seguimiento de pagos

### 🧾 Facturas Digitales
- Generación automática de facturas
- Código QR para verificación
- Impresión amigable
- Visualización en navegador
- Almacenamiento de historial

### 🔄 Modo Offline
- Operación **sin conexión a internet**
- Sincronización automática cuando vuelve la conexión
- **Cola de operaciones** local
- Soporte para:
  - Creación de ventas
  - Actualización de productos
  - Creación de nuevos productos
- Reintentos automáticos con backoff exponencial

### 🎨 Personalización
- Temas de color personalizables por usuario
- Interfaz responsive
- Soporte para múltiples idiomas (extensible)

---

## Requisitos Previos

### Sistema
- **Node.js** 18+ o superior
- **pnpm** 8+ (gestor de paquetes)
- **PostgreSQL** 13+ o **Supabase**
- Navegador moderno (Chrome, Firefox, Safari, Edge)

### Base de Datos
- Supabase PostgreSQL (recomendado para producción)
- PostgreSQL local para desarrollo

---

## Instalación

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd comercios
```

### 2. Instalar Dependencias

```bash
pnpm install
```

### 3. Configurar Variables de Entorno

Copiar el archivo de ejemplo:
```bash
cp .env.local.example .env
```

Editar `.env` con tus valores:

```env
# Base de Datos
DATABASE_URL=postgresql://user:password@host:6543/database

# NextAuth
NEXTAUTH_SECRET=<generar con: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000

# Opcional: URL para producción
NEXTAUTH_URL_INTERNAL=<tu-url-interna>
```

### 4. Configurar Base de Datos

```bash
# Probar conexión
pnpm db:test

# Ejecutar migraciones
pnpm db:migrate

# Crear usuario admin inicial
pnpm db:create-admin
```

### 5. Iniciar el Servidor

```bash
# Desarrollo
pnpm dev

# Abrir http://localhost:3000
```

---

## Configuración

### Variables de Entorno Recomendadas

```env
# Base de Datos
DATABASE_URL=postgresql://[user]:[password]@[host]:6543/[database]

# NextAuth (Autenticación)
NEXTAUTH_SECRET=<generar con openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000

# Producción
NODE_ENV=production
NEXTAUTH_URL=https://tu-dominio.com
```

### Para Supabase Específicamente

1. Crear proyecto en [Supabase](https://supabase.com)
2. Obtener **DATABASE_URL** desde configuración de base de datos
3. Usar el **puerto pooler (6543)** en lugar del puerto directo
4. Generar `NEXTAUTH_SECRET`
5. Ejecutar migraciones: `pnpm db:migrate`

---

## Estructura del Proyecto

```
comercios/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── dashboard/               # Dashboard principal
│   │   ├── pos/                     # Punto de venta
│   │   ├── admin/                   # Panel admin
│   │   ├── api/                     # API endpoints
│   │   │   ├── auth/               # Autenticación
│   │   │   ├── stores/             # Endpoints por tienda
│   │   │   └── admin/              # Endpoints admin
│   │   └── invoice/                # Visualización de facturas
│   │
│   ├── components/
│   │   ├── ui/                      # Componentes Radix UI
│   │   ├── dashboard/               # Componentes del dashboard
│   │   ├── pos/                     # Componentes de POS
│   │   └── forms/                   # Formularios reutilizables
│   │
│   ├── lib/
│   │   ├── auth/                    # Configuración NextAuth
│   │   ├── db/
│   │   │   ├── entities/           # Modelos TypeORM
│   │   │   ├── migrations/         # Migraciones SQL
│   │   │   └── data-source.ts      # Configuración TypeORM
│   │   ├── offline/                 # Sistema offline
│   │   └── utils/                   # Utilidades
│   │
│   ├── hooks/                        # React hooks personalizados
│   ├── contexts/                     # Context API
│   └── styles/                       # Estilos globales
│
├── public/                           # Archivos estáticos
├── scripts/                          # Scripts de base de datos
└── tests/                            # Tests unitarios y E2E
```

---

## Funcionalidades Detalladas

### 1. 🔐 Autenticación y Autorización

#### Métodos de Login
- **Email/Contraseña** (solo ADMIN y OWNER)
- **Código QR** (todos los roles, ideal para POS)
- **PIN** (para operarios de POS)

#### Roles y Permisos

| Rol | POS | Inventario | Empleados | Analytics | Configuración |
|-----|-----|-----------|-----------|-----------|---------------|
| **SUPER_ADMIN** | ✅ | ✅ | ✅ | ✅ | ✅ (Global) |
| **ADMIN** | ✅ | ✅ | ✅ | ✅ | ✅ (Tienda) |
| **MANAGER** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **STOCK_KEEPER** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **CASHIER** | ✅ | ❌ | ❌ | ❌ | ❌ |

### 2. 🛍️ Gestión de Productos

#### Características
- Crear, editar, eliminar productos
- Descripción y especificaciones
- Precios (costo y venta)
- Categorización jerárquica
- Múltiples códigos de barras (EAN-13, UPC, CODE-128)
- Imágenes de producto
- Stock por almacén/tienda
- Productos pesables (venta por kg)
- Activo/Inactivo

#### Categorías
- Estructura jerárquica
- Comisiones por categoría (extensible)
- Filtros de búsqueda

### 3. 📦 Gestión de Inventario

#### Movimientos de Stock
- Ajustes manuales
- Recepción de compras
- Devoluciones de clientes
- Pérdidas/Mermas
- Auditoría completa de cambios

#### Reportes
- Stock actual por producto
- Stock bajo alertas
- Rotación de inventario
- Historial de movimientos
- Exportación en Excel

### 4. 💰 Punto de Venta (POS)

#### Funciones de Venta
- Búsqueda rápida de productos
- Escaneo de códigos de barras
- Cantidades y precios editable
- Cálculo automático de impuestos
- Descuentos (por producto o total)
- Múltiples métodos de pago:
  - Efectivo
  - Tarjeta débito/crédito
  - Cheque
  - Transferencia
  - Billeteras digitales
- Cambio automático
- Devoluciones de productos

#### Características Avanzadas
- Búsqueda de cliente en transacciones previas
- Generación de recibos
- Impresión térmica
- Historial de transacciones
- Cierre de turno/caja
- Cuadratura de caja

#### Modo Offline
- Operación sin conexión
- Sincronización automática
- Indicador de estado de conexión

### 5. 👥 Gestión de Empleados

#### Administración de Personal
- Alta, baja, modificación de empleados
- Asignación a tiendas
- Asignación de roles
- Cambio de contraseñas forzado
- Historial de actividades

#### Turnos y Jornadas
- Creación de turnos
- Check-in/Check-out
- Cierre de turno
- Reconciliación de caja
- Reportes por empleado
- Horas trabajadas

#### Autenticación de Empleados
- PIN de 4-6 dígitos
- Tokens QR para rápido acceso
- Revocación de acceso
- Sesiones activas

### 6. 📊 Analytics y Reportes

#### Dashboard Principal
- Total de ventas hoy
- Comparativa periodo anterior
- Transacciones por hora
- Métodos de pago utilizados
- Top 10 productos

#### Gráficos Disponibles
- **Ventas por Fecha**: Línea de tendencia
- **Ventas por Categoría**: Gráfico circular/barras
- **Ventas por Empleado**: Ranking de desempeño
- **Productos Más Vendidos**: Top 20
- **Margen de Ganancia**: Por producto/categoría

#### Exportación
- Descarga de reportes en Excel
- PDF con gráficos
- Datos históricos

### 7. 🛒 Órdenes de Compra

#### Funcionalidades
- Crear órdenes a proveedores
- Seguimiento del estado
- Recepción parcial o total
- Validación de cantidad vs. factura
- Historial de compras
- Cálculo de costos
- Integración con inventario

### 8. 🏢 Gestión de Proveedores

#### Información de Proveedor
- Nombre y descripción
- Contactos (email, teléfono)
- Dirección
- Términos de pago
- Descuentos por volumen
- Documentos adjuntos
- Historial de compras

#### Reportes
- Compras por proveedor
- Promedio de entrega
- Evaluación de desempeño

### 9. 🧾 Sistema de Facturas Digitales

#### Características
- Generación automática por venta
- Número de serie automático
- Código QR único
- Detalles completos de transacción
- Información fiscal

#### Funciones
- Vista previa en navegador
- Impresión optimizada
- Descarga en PDF
- Reedición de facturas
- Resumen fiscal

### 10. 🔄 Sistema Offline

#### Arquitectura
- Queue de operaciones en localStorage
- Sincronización automática
- Reintentos inteligentes
- Indicadores visuales

#### Operaciones Soportadas
- Creación de ventas
- Actualización de productos
- Creación de productos
- Consulta de inventario

### 11. ⚙️ Panel Administrativo

#### Para SUPER_ADMIN
- Gestión de tiendas
- Gestión de usuarios globales
- Estadísticas de plataforma
- Configuración general

#### Para ADMIN (por tienda)
- Configuración de tienda
- Métodos de pago
- Impuestos y tarifas
- Temas y personalización

---

## Arquitectura

### Stack Tecnológico

#### Frontend
- **Framework**: Next.js 16 con App Router
- **Lenguaje**: TypeScript
- **UI**: Radix UI + Tailwind CSS v4
- **Gráficos**: Recharts
- **Formularios**: React Hook Form + Zod
- **Animaciones**: Framer Motion
- **Notificaciones**: Sonner
- **Impresión**: React-to-Print

#### Backend
- **Runtime**: Node.js (Next.js)
- **API**: API Routes (Next.js)
- **Autenticación**: NextAuth v5
- **ORM**: TypeORM
- **Base de Datos**: PostgreSQL/Supabase

#### Librerías Especializadas
- **Escaneo de códigos**: @ericblade/quagga2
- **Generación de QR**: qrcode, qrcode.react
- **Excel**: XLSX
- **Manejo de fechas**: date-fns

### Patrones de Arquitectura

#### Multi-Tenancy
- Separación por `storeId`
- Middleware que valida acceso
- Headers inyectados en API:
  - `x-store-id`
  - `x-store-slug`
  - `x-user-id`
  - `x-employment-role`

#### Repository Pattern
```typescript
import { getRepository } from '@/lib/db'
import { Product } from '@/lib/db/entities/product.entity'

const productRepo = await getRepository(Product)
const products = await productRepo.find({
  where: { storeId },
  relations: ['category', 'barcodes']
})
```

#### Context + Hooks
- `ActiveEmployeeContext`: Empleado activo en POS
- `ThemeContext`: Preferencias de tema
- `use-offline-pos`: Operaciones offline
- `use-permission`: Control de permisos
- `use-store`: Acceso a datos de tienda

---

## Modelos de Base de Datos

### Entidades Principales

#### User
- Usuarios de plataforma
- Email, contraseña, rol global
- Preferencias (tema, idioma)

#### Store
- Tiendas/sucursales
- Nombre, slug, dirección
- Configuración local
- Estado (activa/inactiva)

#### Employment
- Relación Usuario-Tienda
- Rol específico por tienda
- PIN para POS
- Fecha de inicio/fin

#### Product
- Productos con precios
- Costo y precio de venta
- Descripción
- Relación con categoría

#### ProductBarcode
- Múltiples códigos por producto
- Tipos: EAN-13, UPC-A, CODE-128, etc.

#### Category
- Categorías de productos
- Estructura jerárquica
- Configuración de comisiones

#### Sale & SaleItem
- Transacciones de venta
- Detalles de cada producto vendido
- Método de pago
- Empleado responsable

#### StockMovement
- Auditoría de inventario
- Tipo: entrada, salida, ajuste
- Usuario responsable
- Motivo del movimiento

#### EmployeeShift
- Turnos del empleado
- Hora inicio/fin
- Estado (abierto/cerrado)

#### ShiftClose
- Cierre de turno
- Cuadratura de caja
- Discrepancias

#### Supplier
- Proveedores
- Contactos y términos

#### PurchaseOrder
- Órdenes de compra
- Estado de entrega
- Items y cantidades

#### DigitalInvoice
- Facturas generadas
- Serie y número
- QR de verificación

---

## Comandos de Base de Datos

### Verificar Conexión
```bash
pnpm db:test
```
Valida la conexión a PostgreSQL/Supabase y lista todas las tablas.

### Crear Usuario Admin
```bash
pnpm db:create-admin
```
Crea interactivamente un usuario ADMIN con tienda inicial.

### Semillar Datos de Prueba
```bash
pnpm db:seed-products
```
Carga productos de ejemplo para testing.

### Ejecutar Migraciones
```bash
pnpm db:migrate
```
Ejecuta todas las migraciones pendientes.

### Migraciones Específicas
```bash
pnpm db:migrate-subscription    # Migración de suscripciones
pnpm db:migrate-payment-methods # Migración de métodos de pago
```

---

## Desarrollo

### Comandos de Desarrollo

```bash
# Servidor de desarrollo
pnpm dev

# Build de producción
pnpm build

# Servidor de producción
pnpm start

# Linting
pnpm lint

# Tests unitarios
pnpm test:unit
pnpm test:unit:watch
pnpm test:unit:ui

# Tests E2E
pnpm test:e2e
pnpm test:e2e:ui
pnpm test:e2e:headed
pnpm test:e2e:debug

# Cobertura de tests
pnpm test:coverage

# Todos los tests
pnpm test:all
```

### Estructura de Carpetas de Código

```
src/
├── app/                                    # Next.js App Router
│   ├── auth/signin, /signup               # Páginas de autenticación
│   ├── dashboard/                          # Dashboard principal
│   │   ├── select-store                   # Selector de tienda
│   │   └── [storeSlug]/
│   │       ├── pos                        # Punto de venta
│   │       ├── products                   # Gestión de productos
│   │       ├── categories                 # Gestión de categorías
│   │       ├── inventory                  # Movimientos de stock
│   │       ├── suppliers                  # Gestión de proveedores
│   │       ├── purchase-orders            # Órdenes de compra
│   │       ├── employees                  # Gestión de empleados
│   │       ├── shifts                     # Gestión de turnos
│   │       ├── sales                      # Historial de ventas
│   │       ├── analytics                  # Dashboard analítico
│   │       ├── reports                    # Reportes
│   │       ├── settings                   # Configuración de tienda
│   │       └── my-access                  # Tokens QR de empleado
│   ├── admin/                              # Admin global
│   │   └── stores                         # Gestión de tiendas
│   ├── pos/[storeSlug]                     # POS standalone
│   ├── invoice/[invoiceId]                 # Visualización de factura
│   ├── api/
│   │   ├── auth/                           # Endpoints de autenticación
│   │   │   ├── [...nextauth]              # NextAuth configuración
│   │   │   ├── register                   # Registro de usuarios
│   │   │   ├── login                      # Login
│   │   │   ├── qr-login                   # Login por QR
│   │   │   ├── user-pin                   # Gestión de PIN
│   │   │   ├── change-password            # Cambio de contraseña
│   │   │   └── me                         # Datos del usuario actual
│   │   ├── stores/[storeId]/               # Endpoints por tienda
│   │   │   ├── products                   # CRUD de productos
│   │   │   ├── categories                 # CRUD de categorías
│   │   │   ├── sales                      # Creación de ventas
│   │   │   ├── employees                  # CRUD empleados
│   │   │   ├── employee-shifts            # Gestión de turnos
│   │   │   ├── suppliers                  # CRUD proveedores
│   │   │   ├── purchase-orders            # CRUD órdenes
│   │   │   ├── analytics/                 # Endpoints de analytics
│   │   │   │   ├── overview               # Resumen general
│   │   │   │   ├── sales-by-date          # Ventas por fecha
│   │   │   │   ├── sales-by-category      # Ventas por categoría
│   │   │   │   ├── sales-by-employee      # Ventas por empleado
│   │   │   │   └── sales-by-product       # Ventas por producto
│   │   │   └── ...otros recursos
│   │   ├── admin/                          # Endpoints de super admin
│   │   │   ├── stores                     # Gestión global de tiendas
│   │   │   ├── users                      # Gestión de usuarios
│   │   │   └── subscriptions              # Gestión de suscripciones
│   │   └── upload                         # Carga de archivos
│   └── layout.tsx                         # Layout raíz
│
├── components/
│   ├── ui/                                 # Componentes Radix base
│   │   ├── button                         # Botones
│   │   ├── dialog                         # Modales
│   │   ├── form                           # Elementos de formulario
│   │   ├── input                          # Inputs
│   │   ├── select                         # Selectores
│   │   ├── table                          # Tablas
│   │   └── ...más componentes
│   ├── dashboard/                          # Componentes del dashboard
│   │   ├── sidebar                        # Navegación lateral
│   │   ├── header                         # Encabezado
│   │   └── ...layouts
│   ├── pos/                                # Componentes POS
│   │   ├── product-search                 # Búsqueda de productos
│   │   ├── cart                           # Carrito de compras
│   │   ├── payment                        # Procesamiento de pago
│   │   ├── receipt                        # Recibo
│   │   └── ...componentes POS
│   └── forms/                              # Formularios reutilizables
│       ├── product-form
│       ├── employee-form
│       └── ...más formularios
│
├── lib/
│   ├── auth/
│   │   └── auth.config.ts                 # Configuración NextAuth
│   ├── db/
│   │   ├── data-source.ts                 # Conexión TypeORM
│   │   ├── entities/                      # Modelos de base de datos
│   │   │   ├── user.entity.ts
│   │   │   ├── store.entity.ts
│   │   │   ├── product.entity.ts
│   │   │   ├── sale.entity.ts
│   │   │   └── ...más entidades
│   │   └── migrations/                    # Scripts SQL
│   ├── offline/
│   │   ├── queue.ts                       # Gestor de cola
│   │   └── products-cache.ts              # Cache de productos
│   └── utils/                              # Utilidades
│       ├── helpers.ts
│       └── ...funciones comunes
│
├── hooks/                                  # React Hooks personalizados
│   ├── use-offline-pos.ts                 # Operaciones offline
│   ├── use-permission.ts                  # Control de permisos
│   ├── use-store.ts                       # Acceso a datos de tienda
│   ├── use-theme.ts                       # Gestión de tema
│   └── ...más hooks
│
├── contexts/                               # Context API
│   ├── active-employee-context.tsx        # Empleado activo
│   └── theme-context.tsx                  # Tema de usuario
│
└── styles/                                 # Estilos globales
    └── globals.css
```

### Convenciones de Código

- **Componentes**: PascalCase
- **Archivos**: kebab-case
- **Variables**: camelCase
- **Constantes**: UPPER_SNAKE_CASE
- **Tipos TypeScript**: PascalCase con interfaz o type

### Testing

#### Unit Tests (Vitest)
```bash
pnpm test:unit:watch
```

#### E2E Tests (Playwright)
```bash
pnpm test:e2e:ui
```

---

## Rutas Principales

### Públicas
- `/` - Página de inicio
- `/auth/signin` - Inicio de sesión
- `/auth/signup` - Registro de usuario

### Protegidas por Autenticación
- `/dashboard` - Dashboard principal
- `/dashboard/select-store` - Selector de tienda
- `/dashboard/[storeSlug]/*` - Rutas de tienda

### Admin
- `/admin/stores` - Gestión de tiendas global
- `/admin/users` - Gestión de usuarios

### POS
- `/pos/[storeSlug]` - Punto de venta independiente

### Facturas
- `/invoice/[invoiceId]` - Visualización y impresión

---

## Performance y Optimización

### Frontend
- Server Components para reducir bundle
- Code splitting automático
- Image optimization con Next.js
- Caching inteligente con SWR

### Backend
- Índices en base de datos
- Pool de conexiones
- Caché de productos en offline
- Paginación en listas grandes

### Base de Datos
- Índices en columnas frecuentemente consultadas
- Normalización de esquema
- Connection pooling (máx 10 conexiones)

---

## Seguridad

### Autenticación
- JWT con NextAuth v5
- Cookies seguras (HttpOnly, Secure, SameSite)
- Expiración de sesión (30 días)
- Cambio forzado de contraseña

### Autorización
- Middleware que valida acceso a rutas
- Control basado en roles (RBAC)
- Validación de pertenencia a tienda
- Headers inyectados verificados en API

### Base de Datos
- Preparación de statements (previene SQL injection)
- Encriptación de contraseñas (bcryptjs)
- Auditoría de cambios en inventario
- Logs de acceso a datos sensibles

### API
- Rate limiting (extensible)
- Validación de entrada con Zod
- CORS configurado
- CSRF protection por defecto

---

## Deployment

### Requisitos de Producción
- Node.js 18+ en servidor
- PostgreSQL 13+
- SSL/TLS para HTTPS
- Variables de entorno configuradas

### Pasos para Deployment
1. Construir aplicación: `pnpm build`
2. Ejecutar migraciones: `pnpm db:migrate`
3. Iniciar con: `pnpm start`
4. Configurar CI/CD con GitHub Actions u otra plataforma

---

## Solución de Problemas

### Conexión a Base de Datos
```bash
pnpm db:test
```
Verifica la cadena de conexión y permisos.

### Problemas de Autenticación
- Verificar `NEXTAUTH_SECRET` está configurado
- Verificar `NEXTAUTH_URL` coincide con dominio
- Limpiar cookies del navegador
- Revisar logs de NextAuth

### Offline no sincroniza
- Verificar conexión a internet
- Revisar console del navegador
- Limpiar localStorage si hay errores
- Revisar logs del servidor

---

## Roadmap Futuro

- [ ] Soporte para múltiples idiomas completo
- [ ] Sistema de suscripción mejorado
- [ ] Integración con pasarelas de pago
- [ ] App móvil nativa
- [ ] Machine learning para predicción de demanda
- [ ] Integración con redes sociales

---

## Contribución

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crear rama de feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

---

## Licencia

Este proyecto está bajo licencia privada. Contactar para más información.

---

## Soporte y Contacto

Para reportar problemas, preguntas o sugerencias:
- 📧 Email: [soporte@ejemplo.com]
- 🐛 Issues: GitHub Issues
- 💬 Discussions: GitHub Discussions

---

## Changelog

### v0.1.0
- Lanzamiento inicial
- Funcionalidad POS completa
- Gestión de inventario
- Sistema de análisis
- Autenticación multi-factor

---

**Última actualización**: Febrero 2026

**Documentación para desarrolladores**: Ver `CLAUDE.md` para pautas de desarrollo específicas.

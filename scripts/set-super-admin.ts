import 'reflect-metadata'
import { getDataSource } from '../src/lib/db'
import { User, UserRole } from '../src/lib/db/entities/user.entity'

async function setSuperAdmin() {
  const args = process.argv.slice(2)
  const email = args[0]

  if (!email) {
    console.error('❌ Error: Debes proporcionar un email')
    console.log('\nUso: pnpm tsx scripts/set-super-admin.ts <email>')
    console.log('Ejemplo: pnpm tsx scripts/set-super-admin.ts admin@example.com')
    process.exit(1)
  }

  try {
    const dataSource = await getDataSource()
    const userRepo = dataSource.getRepository(User)

    // Find user by email
    const user = await userRepo.findOne({ where: { email } })

    if (!user) {
      console.error(`❌ No se encontró ningún usuario con el email: ${email}`)
      process.exit(1)
    }

    // Check current role
    console.log(`\n📋 Usuario encontrado:`)
    console.log(`   Nombre: ${user.name}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Rol actual: ${user.role}`)

    // Update to SUPER_ADMIN
    if (user.role === UserRole.SUPER_ADMIN) {
      console.log(`\n✅ El usuario ya tiene el rol SUPER_ADMIN`)
    } else {
      user.role = UserRole.SUPER_ADMIN
      await userRepo.save(user)
      console.log(`\n✅ Rol actualizado a SUPER_ADMIN exitosamente!`)
    }

    console.log(`\n🚀 Ahora puedes acceder a /admin/stores`)
    process.exit(0)
  } catch (error) {
    console.error('❌ Error al actualizar el rol:', error)
    process.exit(1)
  }
}

setSuperAdmin()

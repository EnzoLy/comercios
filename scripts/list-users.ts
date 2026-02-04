import 'reflect-metadata'
import { getDataSource } from '../src/lib/db'
import { User } from '../src/lib/db/entities/user.entity'

async function listUsers() {
  try {
    const dataSource = await getDataSource()
    const userRepo = dataSource.getRepository(User)

    const users = await userRepo.find({
      order: { createdAt: 'DESC' }
    })

    if (users.length === 0) {
      console.log('❌ No hay usuarios en la base de datos')
      process.exit(0)
    }

    console.log(`\n📋 Lista de usuarios (${users.length} total):\n`)
    console.log('─'.repeat(80))

    users.forEach((user, index) => {
      const status = user.isActive ? '✅' : '❌'
      console.log(`${index + 1}. ${status} ${user.name}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Rol: ${user.role}`)
      console.log(`   ID: ${user.id}`)
      console.log('─'.repeat(80))
    })

    console.log(`\n💡 Para hacer un usuario SUPER_ADMIN, ejecuta:`)
    console.log(`   pnpm tsx scripts/set-super-admin.ts <email>\n`)

    process.exit(0)
  } catch (error) {
    console.error('❌ Error al listar usuarios:', error)
    process.exit(1)
  }
}

listUsers()

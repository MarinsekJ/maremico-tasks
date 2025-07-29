import { PrismaClient } from '../src/generated/prisma'
import { hashPassword } from '../src/lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const adminPassword = await hashPassword('password123')
  const admin = await prisma.user.upsert({
    where: { email: 'maremico@gmail.com' },
    update: {},
    create: {
      name: 'Admin',
      surname: 'User',
      username: 'admin',
      email: 'maremico@gmail.com',
      password: adminPassword,
      userType: 'ADMIN',
    },
  })


  console.log('✅ Database seeded successfully!')
  console.log('👤 Login credentials:')
  console.log('   Admin: admin / password123')

}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 
import { PrismaClient } from '../src/generated/prisma'
import { hashPassword } from '../src/lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const adminPassword = await hashPassword('password123')
  const admin = await prisma.user.upsert({
    where: { email: 'admin@mtask.com' },
    update: {},
    create: {
      name: 'Admin',
      surname: 'User',
      username: 'admin',
      email: 'admin@mtask.com',
      password: adminPassword,
      userType: 'ADMIN',
    },
  })

  // Create regular users
  const user1Password = await hashPassword('password123')
  const user1 = await prisma.user.upsert({
    where: { email: 'john@mtask.com' },
    update: {},
    create: {
      name: 'John',
      surname: 'Doe',
      username: 'john',
      email: 'john@mtask.com',
      password: user1Password,
      userType: 'REGULAR_USER',
    },
  })

  const user2Password = await hashPassword('password123')
  const user2 = await prisma.user.upsert({
    where: { email: 'jane@mtask.com' },
    update: {},
    create: {
      name: 'Jane',
      surname: 'Smith',
      username: 'jane',
      email: 'jane@mtask.com',
      password: user2Password,
      userType: 'REGULAR_USER',
    },
  })

  const user3Password = await hashPassword('password123')
  const user3 = await prisma.user.upsert({
    where: { email: 'mike@mtask.com' },
    update: {},
    create: {
      name: 'Mike',
      surname: 'Johnson',
      username: 'mike',
      email: 'mike@mtask.com',
      password: user3Password,
      userType: 'REGULAR_USER',
    },
  })

  // Create groups
  const salesGroup = await prisma.group.upsert({
    where: { name: 'Sales Team' },
    update: {},
    create: {
      name: 'Sales Team',
      description: 'Sales and marketing team',
      color: '#3B82F6',
    },
  })

  const techGroup = await prisma.group.upsert({
    where: { name: 'Technical Team' },
    update: {},
    create: {
      name: 'Technical Team',
      description: 'Development and IT team',
      color: '#10B981',
    },
  })

  const supportGroup = await prisma.group.upsert({
    where: { name: 'Support Team' },
    update: {},
    create: {
      name: 'Support Team',
      description: 'Customer support team',
      color: '#F59E0B',
    },
  })

  // Add users to groups
  await prisma.userGroup.upsert({
    where: {
      userId_groupId: {
        userId: admin.id,
        groupId: salesGroup.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      groupId: salesGroup.id,
    },
  })

  await prisma.userGroup.upsert({
    where: {
      userId_groupId: {
        userId: admin.id,
        groupId: techGroup.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      groupId: techGroup.id,
    },
  })

  await prisma.userGroup.upsert({
    where: {
      userId_groupId: {
        userId: admin.id,
        groupId: supportGroup.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      groupId: supportGroup.id,
    },
  })

  await prisma.userGroup.upsert({
    where: {
      userId_groupId: {
        userId: user1.id,
        groupId: salesGroup.id,
      },
    },
    update: {},
    create: {
      userId: user1.id,
      groupId: salesGroup.id,
    },
  })

  await prisma.userGroup.upsert({
    where: {
      userId_groupId: {
        userId: user2.id,
        groupId: techGroup.id,
      },
    },
    update: {},
    create: {
      userId: user2.id,
      groupId: techGroup.id,
    },
  })

  await prisma.userGroup.upsert({
    where: {
      userId_groupId: {
        userId: user3.id,
        groupId: supportGroup.id,
      },
    },
    update: {},
    create: {
      userId: user3.id,
      groupId: supportGroup.id,
    },
  })

  // Create sample tasks
  const task1 = await prisma.task.create({
    data: {
      title: 'Review quarterly sales report',
      description: 'Analyze Q4 sales performance and prepare presentation',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'WAITING',
      type: 'ADMIN_TASK',
      assignedUserId: user1.id,
      creatorId: admin.id,
    },
  })

  const task2 = await prisma.task.create({
    data: {
      title: 'Update website content',
      description: 'Update product descriptions and pricing on the website',
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      status: 'IN_PROGRESS',
      type: 'REGULAR_TASK',
      assignedUserId: user2.id,
      creatorId: user2.id,
      timeSum: 3600, // 1 hour
    },
  })

  const task3 = await prisma.task.create({
    data: {
      title: 'Prepare customer training materials',
      description: 'Create training documentation for new customers',
      status: 'COMPLETED',
      type: 'REGULAR_TASK',
      assignedUserId: user3.id,
      creatorId: user3.id,
      timeSum: 7200, // 2 hours
    },
  })

  // Create sample group tasks
  const groupTask1 = await prisma.groupTask.create({
    data: {
      title: 'Launch new product campaign',
      description: 'Coordinate marketing campaign for new mattress line',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      status: 'WAITING',
      groupId: salesGroup.id,
    },
  })

  const groupTask2 = await prisma.groupTask.create({
    data: {
      title: 'Database optimization',
      description: 'Optimize database performance and implement caching',
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      status: 'IN_PROGRESS',
      groupId: techGroup.id,
    },
  })

  // Add some time tracking to group tasks
  await prisma.groupTaskTime.create({
    data: {
      userId: user2.id,
      groupTaskId: groupTask2.id,
      timeSpent: 5400, // 1.5 hours
    },
  })

  console.log('✅ Database seeded successfully!')
  console.log('👤 Login credentials:')
  console.log('   Admin: admin / password123')
  console.log('   User 1: john / password123')
  console.log('   User 2: jane / password123')
  console.log('   User 3: mike / password123')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 
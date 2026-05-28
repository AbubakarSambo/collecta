import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Wiping database...');

  // Delete in reverse-dependency order
  await prisma.auditLog.deleteMany();
  await prisma.importJob.deleteMany();
  await prisma.reminderLog.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.charge.deleteMany();
  await prisma.feeAssignment.deleteMany();
  await prisma.fee.deleteMany();
  await prisma.member.deleteMany();
  await prisma.verificationRequest.deleteMany();
  await prisma.network.deleteMany();
  await prisma.emailVerificationToken.deleteMany();
  await prisma.user.deleteMany();

  console.log('Done. Seeding...');

  // ── Platform super admin ──────────────────────────────────────────────────
  const superAdminPassword = await bcrypt.hash('superadmin123', 10);

  const superAdmin = await prisma.user.create({
    data: {
      email: 'super@collecta.local',
      password: superAdminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      isPlatformAdmin: true,
      isEmailVerified: true,
    },
  });

  console.log(`✓ Platform admin: ${superAdmin.email} / superadmin123`);

  // ── Test network admin ────────────────────────────────────────────────────
  const networkAdminPassword = await bcrypt.hash('password123', 10);

  const networkAdmin = await prisma.user.create({
    data: {
      email: 'admin@greenpark.local',
      password: networkAdminPassword,
      firstName: 'Green',
      lastName: 'Park',
      role: 'NETWORK_ADMIN',
      isEmailVerified: true,
      network: {
        create: {
          name: 'Greenpark Estate',
          slug: 'greenpark',
          description: 'A test estate network',
          networkType: 'ESTATE',
          currency: 'NGN',
          country: 'NG',
          isVerified: true,
          verificationStatus: 'APPROVED',
          isActive: true,
        },
      },
    },
  });

  console.log(`✓ Network admin:  ${networkAdmin.email} / password123`);
  console.log(`  Portal: http://localhost:5173/pay/greenpark`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

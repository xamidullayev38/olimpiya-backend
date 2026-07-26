import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

// Tizimda mavjud bo'lgan barcha permission kodlari (FT-26 asosida kengaytiriladi)
const PERMISSIONS: { code: string; module: string; description: string }[] = [
  { code: 'participant.create', module: 'participants', description: 'Ishtirokchi qo\'shish' },
  { code: 'participant.read', module: 'participants', description: 'Ishtirokchini ko\'rish' },
  { code: 'participant.update', module: 'participants', description: 'Ishtirokchini tahrirlash' },
  { code: 'participant.delete', module: 'participants', description: 'Ishtirokchini o\'chirish/bloklash' },
  { code: 'participant.import', module: 'participants', description: 'Ommaviy import qilish' },
  { code: 'badge.print', module: 'badges', description: 'Badge generatsiya/chop etish' },
  { code: 'zone.manage', module: 'zones', description: 'Zonalarni boshqarish' },
  { code: 'accreditation_type.manage', module: 'accreditation', description: 'Akkreditatsiya turlarini boshqarish' },
  { code: 'meal_schedule.manage', module: 'meal', description: 'Ovqatlanish jadvalini boshqarish' },
  { code: 'scan.access', module: 'scan', description: 'Zona kirish skani' },
  { code: 'scan.meal', module: 'scan', description: 'Ovqatlanish skani' },
  { code: 'report.view', module: 'reports', description: 'Hisobot va dashboardni ko\'rish' },
  { code: 'report.export', module: 'reports', description: 'Hisobot eksport qilish' },
  { code: 'user.manage', module: 'system', description: 'Tizim foydalanuvchilarini boshqarish' },
  { code: 'role.manage', module: 'system', description: 'Rol va huquqlarni boshqarish' },
  { code: 'device.manage', module: 'system', description: 'Skaner qurilmalarni boshqarish' },
  { code: 'audit_log.view', module: 'system', description: 'Audit logni ko\'rish' },
];

const ROLES: { name: string; description: string; isSystem: boolean; permissions: string[] }[] = [
  {
    name: 'SUPER_ADMIN',
    description: 'Tizim egasi - barcha huquqlar',
    isSystem: true,
    permissions: PERMISSIONS.map((p) => p.code),
  },
  {
    name: 'OPERATOR',
    description: 'Akkreditatsiya xodimi',
    isSystem: true,
    permissions: ['participant.create', 'participant.read', 'participant.update', 'participant.import', 'badge.print', 'report.view'],
  },
  {
    name: 'ZONE_MANAGER',
    description: 'Zona menejeri',
    isSystem: true,
    permissions: ['report.view'],
  },
  {
    name: 'SCANNER_OPERATOR',
    description: 'Qo\'riqchi / Nazoratchi',
    isSystem: true,
    permissions: ['scan.access'],
  },
  {
    name: 'KITCHEN_STAFF',
    description: 'Oshxona xodimi',
    isSystem: true,
    permissions: ['scan.meal'],
  },
  {
    name: 'ANALYST',
    description: 'Kuzatuvchi / Tahlilchi (read-only)',
    isSystem: true,
    permissions: ['report.view', 'report.export'],
  },
];

async function main() {
  console.log('Seeding permissions...');
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { module: perm.module, description: perm.description },
      create: perm,
    });
  }

  console.log('Seeding roles...');
  for (const role of ROLES) {
    const created = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description, isSystem: role.isSystem },
      create: { name: role.name, description: role.description, isSystem: role.isSystem },
    });

    for (const permCode of role.permissions) {
      const perm = await prisma.permission.findUnique({ where: { code: permCode } });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: created.id, permissionId: perm.id } },
        update: {},
        create: { roleId: created.id, permissionId: perm.id },
      });
    }
  }

  // Ilk Super Admin foydalanuvchisi. Parol albatta birinchi kirishdan keyin o'zgartirilishi shart (mustChangePassword=true).
  const superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  const existingAdmin = await prisma.systemUser.findUnique({ where: { username: 'superadmin' } });

  if (!existingAdmin && superAdminRole) {
    const initialPassword = process.env.SEED_SUPERADMIN_PASSWORD || 'ChangeMe!12345_' + Math.random().toString(36).slice(2, 8);
    const passwordHash = await argon2.hash(initialPassword);

    const admin = await prisma.systemUser.create({
      data: {
        fullName: 'Super Administrator',
        username: 'superadmin',
        passwordHash,
        mustChangePassword: true,
      },
    });

    await prisma.userRole.create({
      data: { userId: admin.id, roleId: superAdminRole.id },
    });

    console.log('=================================================');
    console.log(' SUPER ADMIN YARATILDI');
    console.log(' Username:', admin.username);
    console.log(' Vaqtinchalik parol:', initialPassword);
    console.log(' MUHIM: Birinchi kirishda parolni albatta almashtiring!');
    console.log('=================================================');
  }

  console.log('Seed muvaffaqiyatli yakunlandi.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

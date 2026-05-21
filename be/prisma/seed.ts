import bcrypt from 'bcryptjs';
import { PrismaClient, User, UserRole } from '@prisma/client';

export interface AdminSeedConfig {
  name: string;
  email: string;
  password: string;
  bcryptRounds: number;
}

export interface SeedResult {
  roles: UserRole[];
  admin: Omit<User, 'password'>;
  action: 'created' | 'restored' | 'updated-role' | 'unchanged';
}

function requireSeedEnv(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required seed environment variable: ${key}`);
  }

  return value;
}

export function getAdminSeedConfig(): AdminSeedConfig {
  return {
    name: requireSeedEnv('ADMIN_SEED_NAME'),
    email: requireSeedEnv('ADMIN_SEED_EMAIL'),
    password: requireSeedEnv('ADMIN_SEED_PASSWORD'),
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
  };
}

export function sanitizeUser(user: User): Omit<User, 'password'> {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function seedRolesAndAdmin(
  prisma: PrismaClient,
  config: AdminSeedConfig,
): Promise<SeedResult> {
  const existingAdmin = await prisma.user.findUnique({
    where: { email: config.email },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(config.password, config.bcryptRounds);

    const created = await prisma.user.create({
      data: {
        name: config.name,
        email: config.email,
        password: hashedPassword,
        role: UserRole.ADMIN,
        isActive: true,
      },
    });

    return {
      roles: [UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.STUDENT],
      admin: sanitizeUser(created),
      action: 'created',
    };
  }

  if (existingAdmin.deletedAt) {
    const restored = await prisma.user.update({
      where: { email: config.email },
      data: {
        deletedAt: null,
        deletedBy: null,
        isActive: true,
        role: UserRole.ADMIN,
      },
    });

    return {
      roles: [UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.STUDENT],
      admin: sanitizeUser(restored),
      action: 'restored',
    };
  }

  if (existingAdmin.role !== UserRole.ADMIN) {
    const updatedRole = await prisma.user.update({
      where: { email: config.email },
      data: {
        role: UserRole.ADMIN,
        isActive: true,
      },
    });

    return {
      roles: [UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.STUDENT],
      admin: sanitizeUser(updatedRole),
      action: 'updated-role',
    };
  }

  return {
    roles: [UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.STUDENT],
    admin: sanitizeUser(existingAdmin),
    action: 'unchanged',
  };
}

export async function seedOptionalUser(
  prisma: PrismaClient,
  role: UserRole,
  envPrefix: 'INSTRUCTOR_SEED' | 'STUDENT_SEED',
) {
  const emailKey = `${envPrefix}_EMAIL`;
  const nameKey = `${envPrefix}_NAME`;
  const passKey = `${envPrefix}_PASSWORD`;

  const email = process.env[emailKey];
  const name = process.env[nameKey];
  const password = process.env[passKey];

  if (!email || !name || !password) {
    return { action: 'skipped' as const, user: null };
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    const hashed = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10));
    const created = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role,
        isActive: true,
      },
    });

    return { action: 'created' as const, user: sanitizeUser(created) };
  }

  if (existing.deletedAt) {
    const restored = await prisma.user.update({
      where: { email },
      data: { deletedAt: null, deletedBy: null, isActive: true, role },
    });
    return { action: 'restored' as const, user: sanitizeUser(restored) };
  }

  if (existing.role !== role) {
    const updated = await prisma.user.update({ where: { email }, data: { role, isActive: true } });
    return { action: 'updated-role' as const, user: sanitizeUser(updated) };
  }

  return { action: 'unchanged' as const, user: sanitizeUser(existing) };
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const result = await seedRolesAndAdmin(prisma, getAdminSeedConfig());
    // eslint-disable-next-line no-console
    console.log(`Admin seed completed: ${result.action}`);

    // Optional: seed an instructor if env vars provided
    const instr = await seedOptionalUser(prisma, UserRole.INSTRUCTOR, 'INSTRUCTOR_SEED');
    if (instr.action !== 'skipped') {
      // eslint-disable-next-line no-console
      console.log(`Instructor seed: ${instr.action}`);
    }

    // Optional: seed a student if env vars provided
    const stud = await seedOptionalUser(prisma, UserRole.STUDENT, 'STUDENT_SEED');
    if (stud.action !== 'skipped') {
      // eslint-disable-next-line no-console
      console.log(`Student seed: ${stud.action}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main();
}

import { prisma } from "../../../infrastructure/database/prisma";

export class AuthRepository {
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        roleAssignments: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findByPhone(phone: string) {
    return prisma.user.findUnique({
      where: {
        phone,
      },
    });
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        roleAssignments: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async create(data: {
    email?: string;
    phone?: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
  }) {
    return prisma.user.create({
      data,
    });
  }

  async updateLastLogin(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }
}

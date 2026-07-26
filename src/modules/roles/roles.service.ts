import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { RolesRepository } from './repositories/roles.repository';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(
    private rolesRepo: RolesRepository,
    private prisma: PrismaService,
  ) {}

  findAllRoles() {
    return this.rolesRepo.findMany();
  }

  findAllPermissions() {
    return this.rolesRepo.findAllPermissions();
  }

  async createRole(dto: CreateRoleDto) {
    const existing = await this.rolesRepo.findByName(dto.name);
    if (existing) throw new ConflictException('Bu nomdagi rol allaqachon mavjud');
    return this.rolesRepo.create({ name: dto.name, description: dto.description });
  }

  async assignPermissions(roleId: string, dto: AssignPermissionsDto) {
    const role = await this.rolesRepo.findById(roleId);
    if (!role) throw new NotFoundException('Rol topilmadi');

    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: dto.permissionCodes } },
    });

    if (permissions.length !== dto.permissionCodes.length) {
      throw new BadRequestException('Ba\'zi permission kodlari mavjud emas');
    }

    await this.rolesRepo.assignPermissions(roleId, permissions.map((p) => p.id));

    return this.rolesRepo.findById(roleId);
  }

  async deleteRole(roleId: string) {
    const role = await this.rolesRepo.findById(roleId);
    if (!role) throw new NotFoundException('Rol topilmadi');
    if (role.isSystem) throw new BadRequestException('Tizim rolini o\'chirib bo\'lmaydi');
    await this.prisma.role.delete({ where: { id: roleId } });
    return { success: true };
  }
}

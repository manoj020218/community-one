import { Role, IRoleDocument } from './role.model';
import { CreateRoleDto, UpdateRoleDto } from './role.types';
import { NotFoundError, ConflictError } from '../../common/errors/AppError';

export class RoleService {
  async create(dto: CreateRoleDto): Promise<IRoleDocument> {
    const existing = await Role.findOne({ code: dto.code.toUpperCase() });
    if (existing) throw new ConflictError(`Role ${dto.code} already exists`);
    return Role.create({ ...dto, code: dto.code.toUpperCase() });
  }

  async findAll(): Promise<IRoleDocument[]> {
    return Role.find({ isActive: true }).sort({ code: 1 });
  }

  async findByCode(code: string): Promise<IRoleDocument> {
    const role = await Role.findOne({ code: code.toUpperCase(), isActive: true });
    if (!role) throw new NotFoundError('Role');
    return role;
  }

  async findById(id: string): Promise<IRoleDocument> {
    const role = await Role.findById(id);
    if (!role) throw new NotFoundError('Role');
    return role;
  }

  async update(id: string, dto: UpdateRoleDto): Promise<IRoleDocument> {
    const role = await Role.findByIdAndUpdate(id, dto, { new: true, runValidators: true });
    if (!role) throw new NotFoundError('Role');
    return role;
  }

  async getPermissionsForRole(code: string): Promise<string[]> {
    const role = await Role.findOne({ code: code.toUpperCase() });
    return role?.permissions || [];
  }
}

export const roleService = new RoleService();

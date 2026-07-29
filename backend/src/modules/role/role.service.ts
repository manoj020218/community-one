import { Role, IRoleDocument } from './role.model';
import { CreateRoleDto, UpdateRoleDto } from './role.types';
import { NotFoundError, ConflictError, AuthorizationError } from '../../common/errors/AppError';

// Roles that operate above the society level. Society-scoped staff (e.g. SOCIETY_ADMIN)
// have ROLE_READ to manage their own society's roles, but must never see or be able to
// look up the permission sets of platform-operator roles.
const PLATFORM_ROLE_CODES = ['JENIX_SUPER_ADMIN', 'JENIX_SUPPORT'];

export class RoleService {
  async create(dto: CreateRoleDto): Promise<IRoleDocument> {
    const existing = await Role.findOne({ code: dto.code.toUpperCase() });
    if (existing) throw new ConflictError(`Role ${dto.code} already exists`);
    return Role.create({ ...dto, code: dto.code.toUpperCase() });
  }

  async findAll(requesterRoleCode: string): Promise<IRoleDocument[]> {
    const query: any = { isActive: true };
    if (!PLATFORM_ROLE_CODES.includes(requesterRoleCode)) query.code = { $nin: PLATFORM_ROLE_CODES };
    return Role.find(query).sort({ code: 1 });
  }

  async findByCode(code: string): Promise<IRoleDocument> {
    const role = await Role.findOne({ code: code.toUpperCase(), isActive: true });
    if (!role) throw new NotFoundError('Role');
    return role;
  }

  async findById(id: string, requesterRoleCode: string): Promise<IRoleDocument> {
    const role = await Role.findById(id);
    if (!role) throw new NotFoundError('Role');
    if (PLATFORM_ROLE_CODES.includes(role.code) && !PLATFORM_ROLE_CODES.includes(requesterRoleCode)) {
      throw new AuthorizationError('Access denied to this role');
    }
    return role;
  }

  async update(id: string, dto: UpdateRoleDto, requesterRoleCode: string): Promise<IRoleDocument> {
    const existing = await Role.findById(id);
    if (!existing) throw new NotFoundError('Role');
    if (PLATFORM_ROLE_CODES.includes(existing.code) && !PLATFORM_ROLE_CODES.includes(requesterRoleCode)) {
      throw new AuthorizationError('Access denied to this role');
    }
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

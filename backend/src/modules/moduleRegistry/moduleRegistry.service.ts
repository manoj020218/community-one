import { ModuleRegistry, SocietyModuleConfig, IModuleRegistryDocument, ISocietyModuleConfigDocument } from './moduleRegistry.model';
import { NotFoundError } from '../../common/errors/AppError';

export class ModuleRegistryService {
  async getAllModules(): Promise<IModuleRegistryDocument[]> {
    return ModuleRegistry.find({ isActive: true }).sort({ code: 1 });
  }

  async getModuleByCode(code: string): Promise<IModuleRegistryDocument> {
    const module = await ModuleRegistry.findOne({ code: code.toUpperCase() });
    if (!module) throw new NotFoundError('Module');
    return module;
  }

  async getSocietyModules(societyId: string): Promise<any[]> {
    const allModules = await ModuleRegistry.find({ isActive: true });
    const configs = await SocietyModuleConfig.find({ societyId });
    const configMap = new Map(configs.map((c) => [c.moduleCode, c]));

    return allModules.map((module) => {
      const config = configMap.get(module.code);
      return {
        ...module.toObject(),
        isEnabled: config?.isEnabled ?? (module.code === 'CORE'),
        enabledAt: config?.enabledAt,
        settings: config?.settings,
      };
    });
  }

  async enableModule(societyId: string, moduleCode: string, userId: string): Promise<ISocietyModuleConfigDocument> {
    const module = await ModuleRegistry.findOne({ code: moduleCode });
    if (!module) throw new NotFoundError('Module');

    return SocietyModuleConfig.findOneAndUpdate(
      { societyId, moduleCode },
      { isEnabled: true, enabledAt: new Date(), enabledBy: userId },
      { upsert: true, new: true }
    );
  }

  async disableModule(societyId: string, moduleCode: string): Promise<ISocietyModuleConfigDocument | null> {
    if (moduleCode === 'CORE') throw new Error('CORE module cannot be disabled');
    return SocietyModuleConfig.findOneAndUpdate(
      { societyId, moduleCode },
      { isEnabled: false },
      { new: true }
    );
  }

  async isModuleEnabled(societyId: string, moduleCode: string): Promise<boolean> {
    if (moduleCode === 'CORE') return true;
    const config = await SocietyModuleConfig.findOne({ societyId, moduleCode });
    return config?.isEnabled ?? false;
  }
}

export const moduleRegistryService = new ModuleRegistryService();

import { DataSource, EntityTarget, FindManyOptions, FindOneOptions, Repository } from 'typeorm';

export class BaseRepository<T extends { id: string }> {
  protected repo: Repository<T>;

  constructor(entity: EntityTarget<T>, dataSource: DataSource) {
    this.repo = dataSource.getRepository(entity);
  }

  findById(id: string, options?: FindOneOptions<T>): Promise<T | null> {
    return this.repo.findOne({ where: { id } as never, ...options });
  }

  findAll(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repo.find(options);
  }

  save(entity: Partial<T>): Promise<T> {
    return this.repo.save(entity as T);
  }

  async update(id: string, partial: Partial<T>): Promise<T | null> {
    await this.repo.update(id, partial as never);
    return this.findById(id);
  }

  delete(id: string): Promise<void> {
    return this.repo.delete(id).then(() => undefined);
  }
}

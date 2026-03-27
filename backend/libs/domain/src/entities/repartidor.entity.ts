import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Entrega } from './entrega.entity';

@Entity('repartidores')
export class Repartidor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  nombre!: string;

  @Column()
  zona!: string;

  @Column({ default: true })
  disponible!: boolean;

  @OneToMany(() => Entrega, (e) => e.repartidor)
  entregas!: Entrega[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Recinto } from './recinto.entity';
import { Producto } from './producto.entity';

@Entity('tiendas')
export class Tienda {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  nombre!: string;

  @Column()
  zona!: string;

  @Column({ default: true })
  activa!: boolean;

  @ManyToOne(() => Recinto, (r) => r.tiendas)
  recinto!: Recinto;

  @Column()
  recintoId!: string;

  @OneToMany(() => Producto, (p) => p.tienda)
  productos!: Producto[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

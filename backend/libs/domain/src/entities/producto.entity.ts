import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Tienda } from './tienda.entity';

@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  nombre!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precio!: number;

  @Column({ type: 'int', default: 0 })
  stock!: number;

  @Column({ default: true })
  disponible!: boolean;

  @Column({ nullable: true })
  descripcion!: string;

  @Column({ nullable: true })
  imagen!: string;

  @ManyToOne(() => Tienda, (t) => t.productos)
  tienda!: Tienda;

  @Column()
  tiendaId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

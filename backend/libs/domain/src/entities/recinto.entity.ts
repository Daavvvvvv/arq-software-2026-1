import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Evento } from './evento.entity';
import { Tienda } from './tienda.entity';

@Entity('recintos')
export class Recinto {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  nombre!: string;

  @Column()
  ciudad!: string;

  @Column({ type: 'int' })
  capacidad!: number;

  @OneToMany(() => Evento, (e) => e.recinto)
  eventos!: Evento[];

  @OneToMany(() => Tienda, (t) => t.recinto)
  tiendas!: Tienda[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

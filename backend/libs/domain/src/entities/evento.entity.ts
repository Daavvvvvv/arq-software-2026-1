import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Recinto } from './recinto.entity';
import { Boleta } from './boleta.entity';

@Entity('eventos')
export class Evento {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  nombre!: string;

  @Column()
  artista!: string;

  @Column({ type: 'timestamp' })
  fecha!: Date;

  @Column({ default: false })
  activo!: boolean;

  @ManyToOne(() => Recinto, (r) => r.eventos)
  recinto!: Recinto;

  @Column()
  recintoId!: string;

  @OneToMany(() => Boleta, (b) => b.evento)
  boletas!: Boleta[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

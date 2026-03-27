import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Usuario } from './usuario.entity';
import { Evento } from './evento.entity';

@Entity('boletas')
export class Boleta {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  codigoQR!: string;

  @Column()
  zona!: string;

  @Column()
  fila!: string;

  @Column()
  asiento!: string;

  @Column({ default: false })
  vinculada!: boolean;

  @ManyToOne(() => Usuario, (u) => u.boletas, { nullable: true })
  usuario!: Usuario | null;

  @Column({ nullable: true })
  usuarioId!: string | null;

  @ManyToOne(() => Evento, (e) => e.boletas)
  evento!: Evento;

  @Column()
  eventoId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

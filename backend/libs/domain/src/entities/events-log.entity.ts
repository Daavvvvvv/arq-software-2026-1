import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('events_log')
export class EventsLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  eventType!: string;

  @Column()
  pedidoId!: string;

  @Column({ nullable: true })
  correlationId!: string;

  @Column({ nullable: true })
  tenantId!: string;

  @Column({ type: 'jsonb', nullable: true })
  payload!: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;
}

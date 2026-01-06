import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DecisionsController } from './decisions.controller';
import { DecisionsService } from './decisions.service';
import { Decision } from '../../entities/decision.entity';
import { Audit } from '../../entities/audit.entity';
import { ChangeSet } from '../../entities/change-set.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Decision, Audit, ChangeSet]),
  ],
  controllers: [DecisionsController],
  providers: [DecisionsService],
  exports: [DecisionsService],
})
export class DecisionsModule {}

import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UserRole } from '@saas/shared';

@Controller('api/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('personal')
  async getPersonalDashboard(@CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.getPersonalDashboard(user.id);
  }

  @Get('manager')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async getManagerDashboard() {
    return this.reportsService.getManagerDashboard();
  }

  @Get('export/csv')
  async exportCsv(@Res() res: Response) {
    const csv = await this.reportsService.exportTasksToCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="tasks-report.csv"');
    res.send(csv);
  }
}

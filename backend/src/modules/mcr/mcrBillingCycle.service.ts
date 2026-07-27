import { IBillingPlanDocument } from './billingPlan.model';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SPANS: Record<string, number> = { MONTHLY: 1, QUARTERLY: 3, HALF_YEARLY: 6, YEARLY: 12, ONE_TIME: 0 };

export interface McrBillingCycle {
  billingPeriodKey: string;
  billingPeriodLabel: string;
  issueDate: Date;
  dueDate: Date;
}

export class McrBillingCycleService {
  normalizeDate(date: Date): Date {
    return this.utcDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }

  buildDueDate(issueDate: Date, dueDay: number): Date {
    const normalizedIssueDate = this.normalizeDate(issueDate);
    const currentMonthDue = this.utcDate(normalizedIssueDate.getUTCFullYear(), normalizedIssueDate.getUTCMonth(), dueDay);
    return currentMonthDue >= normalizedIssueDate
      ? currentMonthDue
      : this.utcDate(normalizedIssueDate.getUTCFullYear(), normalizedIssueDate.getUTCMonth() + 1, dueDay);
  }

  listDueCycles(plan: IBillingPlanDocument, asOf: Date, limit: number): McrBillingCycle[] {
    if (plan.frequency === 'ONE_TIME') {
      const cycle = this.buildOneTimeCycle(plan);
      return cycle && cycle.issueDate <= asOf ? [cycle] : [];
    }

    const span = SPANS[plan.frequency] || 1;
    const anchor = new Date(Date.UTC(plan.effectiveFrom.getUTCFullYear(), plan.effectiveFrom.getUTCMonth(), 1));
    const cycles: McrBillingCycle[] = [];
    for (let index = 0; index < 240 && cycles.length < limit; index += 1) {
      const cycleStart = this.addMonths(anchor, index * span);
      const issueDate = this.utcDate(cycleStart.getUTCFullYear(), cycleStart.getUTCMonth(), plan.billingDay);
      if (issueDate > asOf) break;
      if (plan.effectiveTo && issueDate > plan.effectiveTo) break;
      if (issueDate < plan.effectiveFrom) continue;
      cycles.push(this.buildCycle(plan, cycleStart, issueDate));
    }
    return cycles;
  }

  private buildOneTimeCycle(plan: IBillingPlanDocument): McrBillingCycle | null {
    const scheduledIssueDate = this.utcDate(plan.effectiveFrom.getUTCFullYear(), plan.effectiveFrom.getUTCMonth(), plan.billingDay);
    const issueDate = scheduledIssueDate >= plan.effectiveFrom ? scheduledIssueDate : this.normalizeDate(plan.effectiveFrom);
    if (plan.effectiveTo && issueDate > plan.effectiveTo) return null;
    return this.buildCycle(plan, new Date(Date.UTC(issueDate.getUTCFullYear(), issueDate.getUTCMonth(), 1)), issueDate);
  }

  private buildCycle(plan: IBillingPlanDocument, cycleStart: Date, issueDate: Date): McrBillingCycle {
    return {
      billingPeriodKey: this.periodKey(plan.frequency, cycleStart, issueDate),
      billingPeriodLabel: this.periodLabel(plan.frequency, cycleStart, issueDate),
      issueDate,
      dueDate: this.buildDueDate(issueDate, plan.dueDay),
    };
  }

  private periodKey(frequency: string, cycleStart: Date, issueDate: Date) {
    const year = cycleStart.getUTCFullYear();
    const month = `${cycleStart.getUTCMonth() + 1}`.padStart(2, '0');
    if (frequency === 'MONTHLY') return `${year}-${month}`;
    if (frequency === 'QUARTERLY') return `${year}-${month}-Q`;
    if (frequency === 'HALF_YEARLY') return `${year}-${month}-HY`;
    if (frequency === 'YEARLY') return `${year}-${month}-YR`;
    return issueDate.toISOString().slice(0, 10);
  }

  private periodLabel(frequency: string, cycleStart: Date, issueDate: Date) {
    const name = `${MONTHS[cycleStart.getUTCMonth()]} ${cycleStart.getUTCFullYear()}`;
    if (frequency === 'MONTHLY') return name;
    if (frequency === 'QUARTERLY') return `Quarter starting ${name}`;
    if (frequency === 'HALF_YEARLY') return `Half-year starting ${name}`;
    if (frequency === 'YEARLY') return `Year starting ${name}`;
    return `One-time ${issueDate.toISOString().slice(0, 10)}`;
  }

  private addMonths(date: Date, months: number): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  }

  private utcDate(year: number, month: number, day: number): Date {
    return new Date(Date.UTC(year, month, this.clampDay(year, month, day)));
  }

  private clampDay(year: number, month: number, day: number) {
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return Math.min(day, lastDay);
  }
}

export const mcrBillingCycleService = new McrBillingCycleService();

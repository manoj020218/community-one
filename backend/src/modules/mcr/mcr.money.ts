import { ValidationError } from '../../common/errors/AppError';

export function assertPaiseAmount(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new ValidationError(`${field} must be a non-negative paise integer`);
  }
}

export function sumPaise(values: number[]): number {
  values.forEach((value, index) => assertPaiseAmount(value, `values[${index}]`));
  return values.reduce((total, value) => total + value, 0);
}

export function assertLedgerMovement(debitPaise: number, creditPaise: number): void {
  assertPaiseAmount(debitPaise, 'debitPaise');
  assertPaiseAmount(creditPaise, 'creditPaise');

  if ((debitPaise === 0 && creditPaise === 0) || (debitPaise > 0 && creditPaise > 0)) {
    throw new ValidationError('Exactly one of debitPaise or creditPaise must be greater than zero');
  }
}

export function calculateRunningBalance(
  previousBalancePaise: number,
  debitPaise: number,
  creditPaise: number
): number {
  // The running balance is a signed net position (negative means the flat is in credit/advance),
  // so unlike individual debit/credit movements it must not be forced non-negative here.
  if (!Number.isInteger(previousBalancePaise)) {
    throw new ValidationError('previousBalancePaise must be an integer');
  }
  assertLedgerMovement(debitPaise, creditPaise);
  return previousBalancePaise + debitPaise - creditPaise;
}

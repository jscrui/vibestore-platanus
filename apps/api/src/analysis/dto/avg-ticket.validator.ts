import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isAvgTicketValue', async: false })
export class IsAvgTicketValueConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === undefined || value === null) {
      return true;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) && value >= 0;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === 'low' || normalized === 'mid' || normalized === 'high';
    }

    return false;
  }

  defaultMessage(): string {
    return 'avgTicket must be a non-negative number or one of low|mid|high';
  }
}

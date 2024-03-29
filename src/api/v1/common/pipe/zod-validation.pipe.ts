import { PipeTransform, Injectable } from '@nestjs/common';
import { ZodSchema } from 'zod';
import { errorHandler } from '../../utils';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (err) {
      return errorHandler(err);
    }
  }
}

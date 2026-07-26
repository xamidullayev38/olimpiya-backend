import { PartialType } from '@nestjs/mapped-types';
import { CreateAccreditationTypeDto } from './create-accreditation-type.dto';

export class UpdateAccreditationTypeDto extends PartialType(CreateAccreditationTypeDto) {}

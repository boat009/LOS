import { IsArray, IsBoolean, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnswerItemDto {
  @ApiProperty()
  @IsUUID()
  questionId: string;

  @ApiProperty()
  value: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  fileUrls: string[];
}

export class SaveAnswersDto {
  @ApiProperty({ type: [AnswerItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerItemDto)
  answers: AnswerItemDto[];

  @ApiPropertyOptional({ description: 'Save as draft (true) or final submit (false)', default: true })
  @IsOptional()
  @IsBoolean()
  isDraft: boolean;
}

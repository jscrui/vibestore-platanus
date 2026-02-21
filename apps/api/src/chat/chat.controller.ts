import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';

import { ApiErrorDto } from '../analysis/dto/analysis.dto';
import { ChatMessageRequestDto, ChatSessionResponseDto } from './dto/chat.dto';
import { ChatService } from './chat.service';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @ApiOperation({
    summary: 'Iniciar sesión de chat de captura de requisitos',
  })
  @ApiOkResponse({
    description: 'Sesión iniciada correctamente.',
    type: ChatSessionResponseDto,
  })
  @Post('session/start')
  startSession(): ChatSessionResponseDto {
    return this.chatService.startSession();
  }

  @ApiOperation({
    summary: 'Enviar mensaje al chat y obtener estado de captura',
  })
  @ApiOkResponse({
    description: 'Respuesta del asistente con avance de captura.',
    type: ChatSessionResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Mensaje inválido.',
    type: ApiErrorDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Sesión cerrada por demasiados intentos no permitidos.',
    type: ApiErrorDto,
  })
  @Post('session/message')
  async sendMessage(@Body() body: ChatMessageRequestDto): Promise<ChatSessionResponseDto> {
    return this.chatService.processMessage(body.sessionId, body.message);
  }
}

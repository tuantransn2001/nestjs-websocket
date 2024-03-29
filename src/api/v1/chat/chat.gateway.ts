import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Inject, Logger, UseGuards } from '@nestjs/common';
import { Server as SocketServer, Socket } from 'socket.io';
import { EVENTS } from './constants/event';
import { ChatService } from './chat.service';

import { WsGuard } from '../common/guard/wsGuard';
import { WsAuthMiddleware } from '../common/middleware/wsAuth.middleware';
import {
  GetAllUserNotificationDto,
  MarkReadNotificationDto,
  RemoveNotificationDto,
} from '../notification/shared/notification.interface';
import { NotificationService } from '../notification/notification.service';
import { ZodValidationPipe } from '../common/pipe/zod-validation.pipe';

import { RemoveNotificationSchema } from '../notification/shared/notification.schema';
import { JoinRoomDTO, JoinRoomSchema } from './dto/input/join-room.dto';
import {
  SendRoomMessageDTO,
  SendRoomMessageSchema,
} from './dto/input/send-room-message.dto';
import {
  DeleteMessageDTO,
  DeleteMessageSchema,
} from './dto/input/delete-message.dto';
import {
  DeleteConversationDTO,
  DeleteConversationSchema,
} from './dto/input/delete-conversation.dto';
import {
  RequestMessageSchema,
  RequestRoomMessageDTO,
} from './dto/input/request-room-message.dto';
import {
  RequestContactListDTO,
  RequestContactListSchema,
} from './dto/input/request-contact-list.dto';
import {
  EditMessageDTO,
  EditMessageSchema,
} from './dto/input/edit-message.dto';
import { TypingDTO, TypingSchema } from './dto/input/typing.dto';

@UseGuards(WsGuard)
@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger();
  @WebSocketServer()
  webSocketServer: SocketServer;

  constructor(
    @Inject('MessageService')
    private readonly chatService: ChatService,
    private readonly notificationService: NotificationService,
  ) {}
  // ? ====================================================
  // ? ===================== CONNECT ====================== /* =>> DONE
  // ? ====================================================
  public async handleConnection(@ConnectedSocket() client: Socket) {
    this.logger.log(`⚡: Client is connected { id: ${client.id} }`);
  }
  // ? ====================================================
  // ? ==================== DISCONNECT ==================== /* =>> DONE
  // ? ====================================================
  public handleDisconnect(@ConnectedSocket() client: Socket) {
    this.logger.log(`⚡️: Client disconnected { id: ${client.id} }`);
  }
  // ? ====================================================
  // ? ==================== AUTHENTICATE ================== /* =>> DONE
  // ? ====================================================
  public afterInit(client: Socket) {
    // * Server will check client is allowed to access the server or not here...
    // ? If accepted -> continuing...
    // ! If not accepted -> throw an error back to client using server socket emit
    this.logger.log(`⚡️: Client is authenticating...`);
    client.use(WsAuthMiddleware() as any);
  }
  // ? ====================================================
  // ? ==================== JOIN ROOM ===================== /* =>> DONE
  // ? ====================================================
  @SubscribeMessage(EVENTS.CLIENT.JOIN_ROOM)
  public listenClientJoinRoom(
    @MessageBody(new ZodValidationPipe(JoinRoomSchema))
    clientJoinRoomDTO: JoinRoomDTO,
  ) {
    return this.chatService.handleClientJoinRoom(
      clientJoinRoomDTO,
      this.webSocketServer,
    );
  }
  // ? ====================================================
  // ? ================ SEND ROOM MESSAGE ================= /* =>> DONE
  // ? ====================================================
  @SubscribeMessage(EVENTS.CLIENT.SEND_ROOM_MESSAGE)
  public async listenClientSendRoomMessage(
    @MessageBody(new ZodValidationPipe(SendRoomMessageSchema))
    clientSendRoomMessDTO: SendRoomMessageDTO,
  ) {
    const isConversationExist =
      clientSendRoomMessDTO.hasOwnProperty('conversationID') &&
      clientSendRoomMessDTO.conversationID !== '';
    if (isConversationExist) {
      const response = await this.chatService.handleClientSendRoomMessage(
        clientSendRoomMessDTO,
      );
      this.webSocketServer.sockets.emit(
        EVENTS.SERVER.RECEIVE_ROOM_MESSAGE,
        response,
      );
    } else {
      const response = await this.chatService.handleClientSendFirstRoomMessage(
        clientSendRoomMessDTO,
      );

      this.webSocketServer.sockets.emit(
        EVENTS.SERVER.RECEIVE_ROOM_MESSAGE,
        response,
      );
    }
  }
  // ? ====================================================
  // ? ===================== TYPING ======================= /* =>> Checking... -> Rebuild...
  // ? ====================================================
  @SubscribeMessage(EVENTS.CLIENT.TYPING)
  public async listenUserTyping(
    @MessageBody(new ZodValidationPipe(TypingSchema)) typingDTO: TypingDTO,
  ) {
    const response = this.chatService.handleTyping(typingDTO);

    this.webSocketServer.sockets.emit(EVENTS.SERVER.IS_TYPING, response);
  }
  // ? ====================================================
  // ? ================= DELETE MESSAGE =================== /* =>> DONE
  // ? ====================================================
  @SubscribeMessage(EVENTS.CLIENT.DELETE_MESSAGE)
  public async listenUserDeleteMessageByID(
    @MessageBody(new ZodValidationPipe(DeleteMessageSchema))
    deleteMessageDTO: DeleteMessageDTO,
  ) {
    const response = await this.chatService.handleDeleteMessageConversation(
      deleteMessageDTO,
    );
    this.webSocketServer.sockets.emit(
      EVENTS.SERVER.DELETE_MESSAGE_RESULT,
      response,
    );
  }
  // ? ====================================================
  // ? =============== DELETE CONVERSATION ================ /* =>> DONE
  // ? ====================================================
  @SubscribeMessage(EVENTS.CLIENT.DELETE_CONVERSATION)
  public async listenUserDeleteConversationByID(
    @MessageBody(new ZodValidationPipe(DeleteConversationSchema))
    deleteConversationDTO: DeleteConversationDTO,
  ) {
    const response = await this.chatService.handleDeleteConversation(
      deleteConversationDTO,
    );

    this.webSocketServer.sockets.emit(
      EVENTS.SERVER.DELETE_CONVERSATION_RESULT,
      response,
    );
  }
  // ? ====================================================
  // ? ================ REQUEST ROOM MESSAGE ============== /* =>> DONE
  // ? ====================================================
  @SubscribeMessage(EVENTS.CLIENT.REQUEST_ROOM_MESSAGE)
  public async listenClientRequestRoomMessages(
    @MessageBody(new ZodValidationPipe(RequestMessageSchema))
    requestRoomMessageDTO: RequestRoomMessageDTO,
  ) {
    const response = await this.chatService.handleGetRoomMessages(
      requestRoomMessageDTO,
    );

    this.webSocketServer.sockets.emit(
      EVENTS.SERVER.RECEIVE_ROOM_MESSAGE,
      response,
    );
  }
  // ? ====================================================
  // ? =============== REQUEST CONTACT LIST =============== /* =>> DONE
  // ? ====================================================
  @SubscribeMessage(EVENTS.CLIENT.REQUEST_CONTACT_LIST)
  public async listenClientRequestContactList(
    @MessageBody(new ZodValidationPipe(RequestContactListSchema))
    requestContactListDTO: RequestContactListDTO,
  ) {
    const response = await this.chatService.handleGetContactList(
      requestContactListDTO,
    );
    this.webSocketServer.sockets.emit(
      EVENTS.SERVER.RECEIVE_CONTACT_LIST,
      response,
    );
  }
  // ? ====================================================
  // ? ==================== EDIT MESSAGE ================== /* =>> DONE
  // ? ====================================================
  @SubscribeMessage(EVENTS.CLIENT.EDIT_MESSAGE)
  public async listenClientEditMessage(
    @MessageBody(new ZodValidationPipe(EditMessageSchema))
    editMessageDTO: EditMessageDTO,
  ) {
    const response = await this.chatService.handleEditMessage(editMessageDTO);

    this.webSocketServer.sockets.emit(
      EVENTS.SERVER.EDIT_MESSAGE_RESULT,
      response,
    );
  }
  // ? ====================================================
  // ? ===================== BLOCK USER =================== /* =>> DOING
  // ? ====================================================
  @SubscribeMessage(EVENTS.CLIENT.BLOCK)
  public async listenClientBlock() {
    return this.chatService.handleBlockUser();
  }
  // ? ====================================================
  // ? =================== FORWARD MESSAGE ================ /* =>> DOING
  // ? ====================================================
  @SubscribeMessage(EVENTS.CLIENT.BLOCK)
  public async listenClientForwardMessage() {
    return this.chatService.handleForwardMessage();
  }

  // ? ====================================================
  // ? ================== REQUEST NOTIFICATION ============ /* =>> DONE
  // ? ====================================================
  @SubscribeMessage(EVENTS.CLIENT.REQUEST_NOTIFICATION)
  public async listenClientRequestNotification(
    @MessageBody() getAllUserNotificationDto: GetAllUserNotificationDto,
  ) {
    const response = await this.notificationService.getAll(
      getAllUserNotificationDto,
    );

    this.webSocketServer.sockets.emit(
      EVENTS.SERVER.RECEIVE_NOTIFICATION,
      response,
    );
  }

  // ? ====================================================
  // ? ================ MARK READ NOTIFICATION ============ /* =>> DONE
  // ? ====================================================
  @SubscribeMessage(EVENTS.CLIENT.MARK_READ_NOTIFICATION)
  public async listenClientRequestMarkReadNotification(
    @MessageBody() markReadNotificationDto: MarkReadNotificationDto,
  ) {
    const response = await this.notificationService.markRead(
      markReadNotificationDto.id,
    );

    this.webSocketServer.sockets.emit(
      EVENTS.SERVER.MARK_READ_NOTIFICATION_RESULT,
      response,
    );
  }

  // ? ====================================================
  // ? ================ MARK READ NOTIFICATION ============ /* =>> DONE
  // ? ====================================================
  @SubscribeMessage(EVENTS.CLIENT.REMOVE_NOTIFICATION)
  public async listenClientRequestRemoveNotification(
    @MessageBody(new ZodValidationPipe(RemoveNotificationSchema))
    removeNotificationDto: RemoveNotificationDto,
  ) {
    const response = await this.notificationService.remove(
      removeNotificationDto.id,
    );

    this.webSocketServer.sockets.emit(
      EVENTS.SERVER.REMOVE_NOTIFICATION_RESULT,
      response,
    );
  }
}

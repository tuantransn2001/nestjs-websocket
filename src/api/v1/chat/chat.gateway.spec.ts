import { Test } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway';
import { INestApplication } from '@nestjs/common';
import { ChatService } from './chat.service';
import { modelDefineProvider } from '../common/provider';
import { ConversationSchema } from '../schema/conversation.schema';
import { UnibertyServices } from '../uniberty/uniberty.service';
import { DatabaseModule } from '../database/database.module';
import { MODEL_NAME } from '../ts/enums/common';
async function createNestApp(): Promise<INestApplication> {
  const testingModule = await Test.createTestingModule({
    imports: [DatabaseModule],
    providers: [
      ...modelDefineProvider(MODEL_NAME.CONVERSATION, ConversationSchema),
      ChatGateway,
      ChatService,
      UnibertyServices,
    ],
  }).compile();
  return testingModule.createNestApplication();
}
describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let app: INestApplication;

  beforeAll(async () => {
    // Instantiate the app
    app = await createNestApp();
    // Get the gateway instance from the app instance
    gateway = app.get<ChatGateway>(ChatGateway);

    app.listen(3000);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});

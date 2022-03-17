import {newNotifierFactory, NotificationType} from "./notifier";
import {loadConfig} from "config";
import notifyDiscordSale from 'lib/discord/notifyDiscordSale';
import notifyTwitter from 'lib/twitter/notifyTwitter';
import queue from "queue";
jest.mock('lib/discord');

jest.mock("lib/twitter/notifyTwitter", () => {
  return jest.fn();
});

jest.mock("lib/discord/notifyDiscordSale", () => {
  return jest.fn();
});

describe("notifier", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const nQueue = queue({
    autostart: true,
  })

  it("notify with discord client", async () => {
    const factory = await newNotifierFactory({
      ...(loadConfig()),
      discordBotToken: 'NzMxOTEyNDE1ODA5MzcyMTYx.Xws8jg.FyEo5gn-X98Mb6cvVr-ayOOuIYM',
    }, nQueue);

    const notifier = await factory.create({
      mintAddress: 'D4dUtkktkGFe9cgiZ4P9p851oeWPUxeyhkJNF2WkKUge',
      discordChannelId: '953547142360862741',
    });
    await notifier.notify(NotificationType.Sale, {"test": "test"});

    expect(notifyDiscordSale).toHaveBeenCalledTimes(1);
    expect(notifyTwitter).toHaveBeenCalledTimes(0);
  });

  it("notify with twitter client", async () => {
    jest.unmock('lib/discord');
    const factory = await newNotifierFactory({
      ...(loadConfig()),
      twitter: {
        appKey: 'app-x',
        appSecret: 'app-secret-1',
        accessSecret: 'xx-1',
        accessToken: 'token',
      },
    }, nQueue);

    const notifier = await factory.create({
      mintAddress: 'add-xxaa-12',
      discordChannelId: 'test',
    });
    await notifier.notify(NotificationType.Sale, {});

    expect(notifyDiscordSale).toHaveBeenCalledTimes(0);
    expect(notifyTwitter).toHaveBeenCalledTimes(1);
  });
});

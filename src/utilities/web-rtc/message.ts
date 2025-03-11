import { WebRTC } from "@utilities/web-rtc";

type MessageData = { message: string };

export function messageMixin<TBase extends new (...args: any[]) => WebRTC>(Base: TBase) {
  return class extends Base {
    public sendMessage!: (data: MessageData, peerId?: string) => void;
    constructor(...args: any[]) {
      super(...args);
      this.registerMessageActions();
    }
    private registerMessageActions(): void {
      const [sendMessage, getMessage] = this.room.makeAction<MessageData>("message");
      this.sendMessage = sendMessage;
      getMessage((data, peerId) => {
        try {
          if (!this.isMessageData(data)) {
            throw new Error(`Invalid data payload: ${JSON.stringify(data)}`);
          }
          console.log(`Got message from ${peerId}: ${data.message}`);
        } catch (error) {
          console.error(error);
        }
      });
    }
    private isMessageData(data: any): data is MessageData {
      return (
        typeof data === "object" &&
        data !== null &&
        "message" in data &&
        typeof data.message === "string"
      );
    }
  };
}

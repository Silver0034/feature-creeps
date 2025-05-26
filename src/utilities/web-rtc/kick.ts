import { elements } from "@utilities/elements";
import { Role, state } from "@utilities/state";
import { WebRTC } from "@utilities/web-rtc";

type KickData = { reason: string };

export function kickMixin<TBase extends new (...args: any[]) => WebRTC>(Base: TBase) {
  return class extends Base {
    public sendKick!: (data: KickData, peerId?: string) => void;
    constructor(...args: any[]) {
      super(...args);
      this.registerKickActions();
    }
    private registerKickActions(): void {
      const [sendKick, getKick] = this.room.makeAction<KickData>("kick");
      this.sendKick = sendKick;
      getKick((data, peerId) => {
        try {
          if (state.role != Role.Client) {
            throw new Error(`Ignoring kick sent by ${peerId} to a ${Role[state.role]}: ${data.reason}`);
          }
          if (peerId !== state.hostId) {
            throw new Error(`Ignoring kick from a non-host peer: ${peerId}`);
          }
          if (!this.isKickData(data)) {
            throw new Error(`Invalid data payload: ${JSON.stringify(data)}`);
          }

          console.log(`Got kick from ${peerId}: ${data.reason}`);
          const taskElement = document.createElement('p');
          taskElement.textContent = `Kicked! ${data.reason}`;
          taskElement.style.color = 'red';
          elements.client.messages.appendChild(taskElement);

          // Completely hide the UI, regardless of anything else that may be
          // happening.
          elements.client.roomDiv.style.display = "none";
          elements.client.nameDiv.style.display = "none";
          elements.client.connectDiv.style.display = "none";
          elements.client.introDiv.style.display = "none";
          elements.client.abilityDiv.style.display = "none";

          // Mark self as kicked to reject any future messages.
          state.role = Role.Kicked;
        } catch (error) {
          console.error(error);
        }
      });
    }
    private isKickData(data: any): data is KickData {
      return (
        typeof data === "object" &&
        data !== null &&
        "reason" in data &&
        typeof data.reason === "string"
      );
    }
  };
}

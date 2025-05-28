import { create, type TimeSync } from 'timesync';
import { Role, state } from '@utilities/state';
import { Timer } from '@utilities/timer';
import { WebRTC } from '@utilities/web-rtc';
import { elements } from '@utilities/elements';

type TimerData = { type: TimerType, target: number };

export enum TimerType {
  Name,
  Ability,
  Cancel
}

export function timesyncMixin<TBase extends new (...args: any[]) => WebRTC>(Base: TBase) {
  return class extends Base {
    private ts: TimeSync;
    private timer: Timer | undefined = undefined;
    public sendTimesync!: (data: object, peerId?: string) => void;
    public sendTimer!: (data: TimerData, peerId?: string) => void;
    constructor(...args: any[]) {
      super(...args);
      this.ts = create({ peers: [], interval: 10000 });
      console.log(`Created TimeSync.`);
      this.registerTimesyncActions();
    }
    private registerTimesyncActions(): void {
      const [sendTimesync, getTimesync] = this.room.makeAction<any>('timesync');
      this.sendTimesync = sendTimesync;
      // Override the send method to route messages through WebRTC.
      this.ts.send = (to: string, data: object, _: number): Promise<void> => {
        return new Promise((resolve, reject) => {
          try {
            console.log(`Sending TimeSync to ${to}: ${data}`);
            this.sendTimesync(data, to);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      };
      getTimesync((data, peerId) => {
        console.log(`Got TimeSync from ${peerId}: ${data}`);
        if (peerId === state.hostId) {
          this.ts.receive(peerId, data);
        }
      });
      const [sendTimer, getTimer] = this.room.makeAction<TimerData>("timer");
      this.sendTimer = sendTimer;
      getTimer(async (data, peerId) => {
        try {
          if (!this.isTimerData(data)) {
            throw new Error(`Invalid data payload: ${JSON.stringify(data)}`);
          }
          if (state.role != Role.Client) {
            throw new Error(`Ignoring timer sent by ${peerId} to a ${Role[state.role]}: ${data.target}`);
          }
          if (data.type === TimerType.Cancel) {
            if (this.timer) {
              this.timer.cancel();
            }
            return;
          }
          // Ignore duplicate timers.
          if (this.timer && (this.now() / 1000) < this.timer.getEndTime()) {
            throw new Error(`Ignoring duplicate timer sent by ${peerId}.`);
          }
          // Create a local, synchronized copy of the timer.
          this.timer = new Timer(this, data.target, true, elements.client.timer);
        } catch (error) {
          console.error(error);
        }
      });
    }
    private isTimerData(data: any): data is TimerData {
      return (
        typeof data === "object" &&
        data !== null &&
        "type" in data &&
        Object.values(TimerType).includes(data.type) &&
        "target" in data &&
        typeof data.target === "number"
      );
    }
    public updatePeersList(): void {
      this.ts.destroy();
      let peers = state.players.map((player) => player.peerId);
      if (state.role == Role.Client && state.hostId) {
        peers.push(state.hostId);
      }
      this.ts = create({ peers: peers, interval: 10000 });
      this.registerTimesyncActions();
      console.log(`Updated TimeSync.`);
    }
    public now(): number {
      return this.ts.now();
    }

    public broadcastTimer(type: TimerType, time: number, isAbsolute: boolean = false,
      timerElement?: HTMLElement, onComplete?: () => void) {
      try {
        if (this.timer && (this.now() / 1000) < this.timer.getEndTime()) {
          throw new Error(`Ignoring duplicate timer.`);
        }
        this.timer = new Timer(this, time, isAbsolute, timerElement, onComplete);
        const endTime = this.timer.getEndTime();
        this.sendTimer({ type: type, target: endTime });
      } catch (error) {
        console.error(error);
      }
    }
    public broadcastTimerCancel() {
      if (this.timer) {
        this.timer.cancel();
        this.sendTimer({ type: TimerType.Cancel, target: 0 });
      }
    }
  };
}

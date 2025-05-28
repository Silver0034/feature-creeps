import { WebRTC } from "@utilities/web-rtc";
import { timesyncMixin } from "@utilities/web-rtc/timesync";

const TimerRTCServer = timesyncMixin(WebRTC);

export class Timer {
  private rtc: InstanceType<typeof TimerRTCServer>;
  private endTime: number;
  private onComplete?: () => void;
  private timerElement: HTMLElement | undefined;
  private timeout: NodeJS.Timeout | undefined;

  constructor(rtc: InstanceType<typeof TimerRTCServer>, time: number,
    isAbsolute: boolean = true, timerElement?: HTMLElement,
    onComplete?: () => void) {
    this.rtc = rtc;
    if (isAbsolute) {
      this.endTime = time;
    } else {
      this.endTime = this.rtc.now() / 1000 + time;
    }
    this.onComplete = onComplete;
    this.timerElement = timerElement;
    this.step = this.step.bind(this);
    this.step();
  }

  private step(): void {
    const timeInSec = this.rtc.now() / 1000;
    // Check to see if the timer crossed the target threshold.
    if (timeInSec > this.endTime) {
      if (this.timerElement) {
        this.timerElement.innerText = "Time's up!";
      }
      // Trigger callback.
      if (this.onComplete) {
        this.onComplete();
      }
      // Stop running time steps.
      return;
    }
    const timeLeft = Math.round(this.endTime - timeInSec);
    if (this.timerElement) {
      this.timerElement.innerText = timeLeft.toString();
    }
    // Try to account for the imprecision of setTimeout.
    const timeCorrection = Math.round(timeInSec) - timeInSec;
    // Time the next time step to run right as the next second ticks down.
    this.timeout = setTimeout(this.step, timeCorrection * 1000 + 1000);
  }

  public cancel(): void {
    if (this.timeout !== undefined) {
      clearTimeout(this.timeout);
      this.endTime = 0;
      this.timeout = undefined;
    }
    if (this.timerElement) {
      this.timerElement.innerText = "Cancelled";
    }
  }

  // Returns the end time in seconds.
  public getEndTime(): number {
    return this.endTime;
  }
}
// Example mixin based on custom Trystero events example.

import { WebRTC } from "@utilities/web-rtc";

type DrinkData = { drink: string; withIce: boolean };

export function drinkMixin<TBase extends new (...args: any[]) => WebRTC>(Base: TBase) {
  return class extends Base {
    public sendDrink!: (data: DrinkData, peerId?: string) => void;
    constructor(...args: any[]) {
      super(...args);
      this.registerDrinkActions();
    }
    private registerDrinkActions(): void {
      const [sendDrink, getDrink] = this.room.makeAction<DrinkData>("drink");
      this.sendDrink = sendDrink;
      getDrink((data, peerId) => {
        try {
          if (!this.isDrinkData(data)) {
            throw new Error(`Invalid data payload: ${JSON.stringify(data)}`);
          }
          console.log(`Got a ${data.drink} with${data.withIce ? "" : "out"} ice from ${peerId}`);
        } catch (error) {
          console.error(error);
        }
      });
    }
    private isDrinkData(data: any): data is DrinkData {
      return typeof data.drink === "string" && typeof data.withIce === "boolean";
    }
  };
}

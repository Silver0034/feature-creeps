import { promises } from "@utilities/promises"
import { validateAbility, balanceAbility, generateClass, combat } from "@utilities/prompts"
import { state } from "@utilities/state";
import { WebRTC } from "@utilities/web-rtc";

type AbilityData = { ability: string };
type AbilityFBData = { feedback: string };

export function abilityMixin<TBase extends new (...args: any[]) => WebRTC>(Base: TBase) {
  return class extends Base {
    public sendAbility!: (data: AbilityData, peerId?: string) => void;
    public sendAbilityFB!: (data: AbilityFBData, peerId?: string) => void;
    constructor(...args: any[]) {
      super(...args);
      this.registerAbilityActions();
    }
    private registerAbilityActions(): void {
      const [sendAbility, getAbility] = this.room.makeAction<AbilityData>("ability");
      this.sendAbility = sendAbility;
      getAbility(async (data, peerId) => {
        try {
          if (!this.isAbilityData(data)) {
            throw new Error(`Invalid data payload: ${JSON.stringify(data)}`);
          }
          console.log(`Got ability from ${peerId}: ${data.ability}`);
          const player = state.players.find(player => player.peerId === peerId);
          if (!player) {
            throw Error(`Could not find player with peerId ${peerId}`);
          }
          const [isValid, validation] = await validateAbility(player.sheet, data.ability);
          if (!isValid && validation) {
            sendAbilityFB({ feedback: validation });
            return;
          }
          if (isValid) {
            const resolver = promises.playersResolve.get(peerId);
            if (!resolver) {
              throw Error(`No pending ability promise found for peerId: ${peerId}`);
            }
            // Resolve the promise so game logic knows this player is ready.
            resolver();

            // TODO: Assuming it's a strength for now.
            player.sheet.strengths.push(data.ability);
            // Only add a complimentary weakness if it isn't already there.
            if (player.sheet.strengths.length < player.sheet.weaknesses.length) {
              player.sheet.weaknesses.push(await balanceAbility(player.sheet, data.ability, true));
            }
            player.sheet.level = state.round;
            player.sheet.className = await generateClass(player.sheet);
            // NOTE: Pushing this should ensure that battles are usually
            // resolved in the order of the list, for faster roundBattle logic.
            promises.battles.push(combat(player.sheet, state.enemies[state.round - 1]));
          }
        } catch (error) {
          console.error(error);
        }
      });
      const [sendAbilityFB, getAbilityFB] = this.room.makeAction<AbilityFBData>("abilityFB");
      this.sendAbilityFB = sendAbilityFB;
      // TODO: If possible, vibrate and make a sound if we get feedback.
      getAbilityFB(async (data, peerId) => {
        try {
          if (!this.isAbilityFBData(data)) {
            throw new Error(`Invalid data payload: ${JSON.stringify(data)}`);
          }
          console.log(`Got ability feedback from ${peerId}: ${data.feedback}`);
          let retryAbility: string | null = null;
          while (!retryAbility) {
            // TODO: Replace with GUI functionality.
            retryAbility = prompt(data.feedback);
          }
          await sendAbility({ ability: retryAbility }, peerId)
          console.log(`${data.feedback}`);
        } catch (error) {
          console.error(error);
        }
      });
    }
    private isAbilityData(data: any): data is AbilityData {
      return (
        typeof data === "object" &&
        data !== null &&
        "ability" in data &&
        typeof data.ability === "string"
      );
    }
    private isAbilityFBData(data: any): data is AbilityFBData {
      return (
        typeof data === "object" &&
        data !== null &&
        "feedback" in data &&
        typeof data.feedback === "string"
      );
    }
  };
}
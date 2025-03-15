import { promptWithValidation } from "@utilities/game-logic-host";
import { promises } from "@utilities/promises"
import { validateAbility, balanceAbility, generateClass, combat } from "@utilities/prompts"
import { state } from "@utilities/state";
import { WebRTC } from "@utilities/web-rtc";

type AbilityData = { ability: string };
type AbilityFBData = { feedback: string };

export function abilityMixin<TBase extends new (...args: any[]) => WebRTC>(Base: TBase) {
  return class extends Base {
    private inProgress = new Set<string>();
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
          if(this.inProgress.has(peerId)) {
            throw new Error(`${peerId} sent too many abilities. Ignoring ${data.ability}`);
          }
          this.inProgress.add(peerId);
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
            // TODO: Assuming it's a strength for now.
            player.sheet.strengths.push(data.ability);
            // Only add a complimentary weakness if it isn't already there.
            if (player.sheet.strengths.length > player.sheet.weaknesses.length) {
              player.sheet.weaknesses.push(await balanceAbility(player.sheet, data.ability, true));
            }
            player.sheet.level = state.round;
            player.sheet.className = await generateClass(player.sheet);

            // Wait until all required sheet components have generated before resolving.
            const resolver = promises.playersResolve.get(peerId);
            if (!resolver) {
              throw Error(`No pending ability promise found for peerId: ${peerId}`);
            }
            // Resolve the promise so game logic knows this player is ready.
            resolver();

            // NOTE: Pushing this should ensure that battles are usually
            // resolved in the order of the list, for faster roundBattle logic.
            promises.battles.push(combat(player.sheet, state.enemies[state.round - 1]));
          }
        } catch (error) {
          console.error(error);
        }
        this.inProgress.delete(peerId);
      });
      const [sendAbilityFB, getAbilityFB] = this.room.makeAction<AbilityFBData>("abilityFB");
      this.sendAbilityFB = sendAbilityFB;
      // TODO: If possible, vibrate and make a sound if we get feedback.
      getAbilityFB(async (data, peerId) => {
        try {
          if (!this.isAbilityFBData(data)) {
            throw new Error(`Invalid data payload: ${JSON.stringify(data)}`);
          }
          // TODO: Display this in the GUI.
          console.log(`Got ability feedback from ${peerId}: ${data.feedback}`);

          // TODO: Re-enable ability form in the GUI.

          // Make sure the user knows that they need to revise their answer.
          // TODO: Make this optional.
          navigator.vibrate(200);
          // TODO: Play a notification tone too.
          // TODO: Maybe even an obnoxious flash?
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
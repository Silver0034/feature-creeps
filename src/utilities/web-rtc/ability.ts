import * as AsyncLock from "async-lock";
import { elements } from "@utilities/elements";
import { notify } from "@utilities/game-logic-client";
import { promises } from "@utilities/promises";
import { validateAbility, fallbackAbility, balanceAbility, generateClass, combat } from "@utilities/wrapper";
import { GameState, Role, state } from "@utilities/state";
import { WebRTC } from "@utilities/web-rtc";

type AbilityData = { ability: string, useFallback: boolean };
type AbilityFBData = { isValid: boolean, feedback: string };

export function abilityMixin<TBase extends new (...args: any[]) => WebRTC>(Base: TBase) {
  return class extends Base {
    private abilityLock = new AsyncLock.default();
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
          if (state.role != Role.Host) {
            throw new Error(`Ignoring ability sent by ${peerId} to a ${Role[state.role]}: ${data}`);
          }
          if (state.gameState != GameState.RoundAbilities) {
            throw new Error(`Ignoring ability sent by ${peerId} while in the ${GameState[state.gameState]} state: ${data}`);
          }
          // Each peerId gets their own lock.
          // This ensures that double-submissions can be checked for duplicates one at a time.
          await this.abilityLock.acquire(peerId, async () => {
            if (this.inProgress.has(peerId)) {
              throw new Error(`${peerId} sent too many abilities. Ignoring ${data.ability}`);
            }
            this.inProgress.add(peerId);
          });
          console.log(`Got ability from ${peerId}: ${data}`);
          const player = state.players.find(player => player.peerId === peerId);
          if (!player) {
            throw Error(`Could not find player with peerId ${peerId}`);
          }
          // Ignore the ability if it exceeds the character's level.
          if (player.sheet.strengths.length > state.round) {
            throw Error(`Ignoring player-provided ability from peerId ${peerId} that already has ${player.sheet.strengths.length} abilities in round ${state.round}: ${data.ability}`);
          }
          // If a fallback ability is suggested, use that instead of validation.
          if (data.useFallback) {
            player.sheet.strengths.push(await fallbackAbility(player.sheet));
            sendAbilityFB({
              isValid: true,
              feedback: "We chose an ability for you."
            }, peerId);
          } else {
            const [isValid, validation] = await validateAbility(player.sheet, data.ability);
            sendAbilityFB({
              isValid: isValid,
              feedback: validation ?
                validation :
                "This ability conflicts with your existing abilities."
            }, peerId);
            if (!isValid) {
              this.inProgress.delete(peerId);
              return;
            }
            player.sheet.strengths.push(data.ability);
          }
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
          // NOTE: Pushing this should ensure that battles are usually
          // resolved in the order of the list, for faster roundBattle logic.
          promises.battles.push(combat(player.sheet, state.enemies[state.round - 1]));

          // Resolve the promise so game logic knows this player is ready.
          resolver();
        } catch (error) {
          console.error(error);
        }
        this.inProgress.delete(peerId);
      });
      const [sendAbilityFB, getAbilityFB] = this.room.makeAction<AbilityFBData>("abilityFB");
      this.sendAbilityFB = sendAbilityFB;
      getAbilityFB(async (data, peerId) => {
        try {
          if (!this.isAbilityFBData(data)) {
            throw new Error(`Invalid data payload: ${JSON.stringify(data)}`);
          }
          if (state.role != Role.Client) {
            throw new Error(`Ignoring ability feedback sent by ${peerId} to a ${Role[state.role]}: ${data.feedback}`);
          }
          if (state.gameState != GameState.RoundAbilities) {
            throw new Error(`Ignoring ability feedback sent by ${peerId} while in the ${GameState[state.gameState]} state: ${data.feedback}`);
          }
          if (data.isValid) {
            console.log("Ability accepted!");
            const taskElement = document.createElement('p');
            taskElement.textContent = `Ability accepted!`;
            elements.client.messages.appendChild(taskElement);
            // Clear the text after 5 seconds.
            setTimeout(() => {
              if (elements.client.messages.contains(taskElement)) {
                elements.client.messages.removeChild(taskElement);
              }
            }, 5000);

            elements.client.sheet.style.display = "none";
            return;
          }
          console.log(`Got ability feedback from ${peerId}: ${data.feedback}`);
          this.handleInvalidAbility(data.feedback);
        } catch (error) {
          console.error(error);
        }
      });
    }
    private isAbilityData(data: any): data is AbilityData {
      return (
        typeof data === "object" && data !== null &&
        "ability" in data && typeof data.ability === "string" &&
        (
          (data.ability.length > 0) ||
          ("useFallback" in data && typeof data.useFallback === "boolean")
        )
      );
    }
    private isAbilityFBData(data: any): data is AbilityFBData {
      return (
        typeof data === "object" &&
        data !== null &&
        "feedback" in data &&
        typeof data.feedback === "string" &&
        "isValid" in data &&
        typeof data.isValid === "boolean"
      );
    }
    public handleInvalidAbility(feedback: string) {
      if (state.role != Role.Client) {
        throw new Error(`Triggered handling of an invalid ability on a non-client: ${feedback}`);
      }
      elements.client.feedback.innerText = `Invalid ability: ${feedback}`;

      // Re-enable ability form in the GUI.
      elements.client.abilityDiv.style.display = "inline";

      // Make sure the user knows that they need to revise their answer.
      notify();
    }
  };
}
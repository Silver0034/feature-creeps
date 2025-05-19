import { elements } from "@utilities/elements";
import * as prompts from "@utilities/prompts";

function wrapFunction(fn: (...args: any[]) => Promise<any>): (...args: any[]) => Promise<any> {
  return async function (...args: any[]): Promise<any> {
    // Create a new <p> element for the task
    const taskElement = document.createElement('p');
    taskElement.textContent = `Running: ${fn.name}`;
    elements.host.loadStatus.appendChild(taskElement);

    try {
      const result = await fn(...args);

      // Update the task element to show completion
      taskElement.textContent = `Finished: ${fn.name}`;
      // Remove after 5 seconds
      setTimeout(() => {
        elements.host.loadStatus.removeChild(taskElement);
      }, 5000);

      return result;
    } catch (error) {
      // Handle errors
      taskElement.textContent = `Failed: ${fn.name}`;
      setTimeout(() => {
        elements.host.loadStatus.removeChild(taskElement);
      }, 5000);
      throw error;
    }
  };
}

export const isStrength = wrapFunction(prompts.isStrength);
export const balanceAbility = wrapFunction(prompts.balanceAbility);
export const generateClass = wrapFunction(prompts.generateClass);
export const validateAbility = wrapFunction(prompts.validateAbility);
export const combat = wrapFunction(prompts.combat);
export const generateEnemy = wrapFunction(prompts.generateEnemy);
export const genBattleRoyale = wrapFunction(prompts.genBattleRoyale);
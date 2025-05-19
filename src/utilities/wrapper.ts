import { elements } from "@utilities/elements";
import * as prompts from "@utilities/prompts";

/**
 * Wraps a function to display custom status messages in the UI.
 * @param fn The function to wrap.
 * @param customMessages Optional custom message handlers for "running" and "finished".
 */
function wrapFunction(
  fn: (...args: any[]) => Promise<any>,
  customMessages?: {
    running?: (args: any[]) => string;
    finished?: (result: any) => string;
    error?: (error: any) => string;
  }
): (...args: any[]) => Promise<any> {
  return async function (...args: any[]): Promise<any> {
    const taskElement = document.createElement('p');
    const customHandler = customMessages;

    // Set the "Running" message.
    if (customHandler && customHandler.running) {
      taskElement.textContent = customHandler.running(args);
    } else {
      taskElement.textContent = `Running: ${fn.name}`;
    }

    elements.host.loadStatus.appendChild(taskElement);

    try {
      const result = await fn(...args);

      // Set the "Finished" message.
      if (customHandler && customHandler.finished) {
        taskElement.textContent = customHandler.finished(result);
      } else {
        taskElement.textContent = `Finished: ${fn.name}`;
      }

      setTimeout(() => {
        elements.host.loadStatus.removeChild(taskElement);
      }, 5000);

      return result;
    } catch (error) {
      // Set the "Failed" message.
      if (customHandler && customHandler.error) {
        taskElement.textContent = customHandler.error(error);
      } else {
        // Fallback to a generic error message.
        taskElement.textContent = `${fn.name} ${error}`;
      }

      setTimeout(() => {
        elements.host.loadStatus.removeChild(taskElement);
      }, 15000);

      throw error;
    }
  };
}

export const isStrength = wrapFunction(prompts.isStrength);
export const balanceAbility = wrapFunction(prompts.balanceAbility);
export const generateClass = wrapFunction(prompts.generateClass);
export const validateAbility = wrapFunction(prompts.validateAbility, {
  running: (args: any[]) => `Validating ${args[0].name}'s provided ability`,
  finished: (result: any) => `Ability is ${result[0][0] ? "not valid" : "valid "}`,
  error: (error: any) => `Failed to check ability: ${error}`
});
export const combat = wrapFunction(prompts.combat, {
  running: (args: any[]) => `Generating combat between ${args[0].name} and ${args[1].name}`,
  finished: (result: any) => `Generated combat between ${result[2].name} and ${result[3].name}`,
  error: (error: any) => `Failed to generate combat: ${error}`
});
export const generateEnemy = wrapFunction(prompts.generateEnemy, {
  running: (args: any[]) => `Generating a level ${args[0]} enemy`,
  finished: (result: any) => `Generated a level ${result.level} enemy`,
  error: (error: any) => `Failed to generate an enemy: ${error}`
});
export const genBattleRoyale = wrapFunction(prompts.genBattleRoyale);
// TODO: Untested, LLM generated code.

import { elements } from "@utilities/elements";
import { state, type PlayerData } from "@utilities/state";

// const playerElements = new Map();
// function syncPlayerStatuses() {
//   const currentPlayers = state.players;
//   const currentPeerIds = new Set(currentPlayers.map(p => p.peerId));

//   // Step 1: Process all current players
//   currentPlayers.forEach(player => {
//     const peerId = player.peerId;
//     const name = player.sheet?.name || 'Unknown Player';
//     const status = player.status || 'Unknown';

//     if (!playerElements.has(peerId)) {
//       // Create new element
//       const li = document.createElement('li');
//       li.textContent = `${name}: ${status}`;
//       li.dataset.peerId = peerId; // Store peerId for lookup
//       elements.host.playersStatus.appendChild(li);
//       playerElements.set(peerId, li);
//     } else {
//       // Update existing element
//       const li = playerElements.get(peerId);
//       if (li) {
//         li.textContent = `${name}: ${status}`;
//       }
//     }
//   });

//   // Step 2: Remove elements for players no longer in the state
//   playerElements.forEach((li, peerId) => {
//     if (!currentPeerIds.has(peerId)) {
//       elements.host.playersStatus.removeChild(li);
//       playerElements.delete(peerId);
//     }
//   });
// }

// export class PlayerStatusManager {
//   private container: HTMLElement;
//   private playerElements: Map<string, HTMLElement>;
//   private intervalId: NodeJS.Timeout | undefined;

//   /**
//    * @param {HTMLElement} container - The DOM element where player status list will be rendered.
//    * @param {Array<PlayerData>} initialPlayers - Initial list of player data.
//    */
//   constructor(container: HTMLElement, initialPlayers: Array<PlayerData> = []) {
//     this.container = container;
//     this.playerElements = new Map(); // Map<peerId, HTMLElement>
//     this._initUI();
//     this._syncWithPlayers(initialPlayers);
//   }

//   /**
//    * Initialize the DOM structure.
//    */
//   _initUI(): void {
//     // Ensure a <ul> exists inside the container
//     if (!this.container.querySelector("ul")) {
//       const ul = document.createElement("ul");
//       this.container.appendChild(ul);
//     }
//   }

//   /**
//    * Sync the UI with the current list of players.
//    * @param {Array<PlayerData>} players - List of player data.
//    */
//   _syncWithPlayers(players: Array<PlayerData>) {
//     const currentPeerIds = new Set(players.map(p => p.peerId));

//     // Step 1: Add or update players
//     players.forEach(player => {
//       const peerId = player.peerId;
//       const name = player.sheet?.name || "Unknown Player";
//       const status = player.status || "Unknown";

//       if (!this.playerElements.has(peerId)) {
//         this._addPlayerElement(peerId, name, status);
//       } else {
//         this._updatePlayerElement(peerId, name, status);
//       }
//     });

//     // Step 2: Remove players no longer in the list
//     this.playerElements.forEach((el, peerId) => {
//       if (!currentPeerIds.has(peerId)) {
//         this._removePlayerElement(peerId);
//       }
//     });
//   }

//   /**
//    * Add a new player to the DOM.
//    * @param {string} peerId - Unique identifier for the player.
//    * @param {string} name - Player's name.
//    * @param {string} status - Player's current status.
//    */
//   _addPlayerElement(peerId: string, name: string, status: string) {
//     const li = document.createElement("li");
//     li.textContent = `${name}: ${status}`;
//     li.dataset.peerId = peerId;
//     this.container.querySelector("ul").appendChild(li);
//     this.playerElements.set(peerId, li);
//   }

//   /**
//    * Update an existing player's status in the DOM.
//    * @param {string} peerId - Unique identifier for the player.
//    * @param {string} name - Player's name.
//    * @param {string} status - Player's current status.
//    */
//   _updatePlayerElement(peerId: string, name: string, status: string) {
//     const el = this.playerElements.get(peerId);
//     if (el) {
//       el.textContent = `${name}: ${status}`;
//     }
//   }

//   /**
//    * Remove a player from the DOM.
//    * @param {string} peerId - Unique identifier for the player.
//    */
//   _removePlayerElement(peerId: string) {
//     const el = this.playerElements.get(peerId);
//     if (el) {
//       el.remove();
//       this.playerElements.delete(peerId);
//     }
//   }

//   /**
//    * Add a player to the list.
//    * @param {PlayerData} player - Player data object.
//    */
//   addPlayer(player: PlayerData) {
//     const peerId = player.peerId;
//     const name = player.sheet?.name || "Unknown Player";
//     const status = player.status || "Unknown";

//     if (!this.playerElements.has(peerId)) {
//       this._addPlayerElement(peerId, name, status);
//     } else {
//       this._updatePlayerElement(peerId, name, status);
//     }
//   }

//   /**
//    * Remove a player from the list.
//    * @param {string} peerId - Unique identifier for the player.
//    */
//   removePlayer(peerId: string) {
//     this._removePlayerElement(peerId);
//   }

//   /**
//    * Update a player's status.
//    * @param {string} peerId - Unique identifier for the player.
//    * @param {string} newStatus - New status to apply.
//    */
//   updatePlayerStatus(peerId: string, newStatus: string) {
//     const player = state.players.find(p => p.peerId === peerId);
//     if (!player) return;

//     const name = player.sheet?.name || "Unknown Player";
//     this._updatePlayerElement(peerId, name, newStatus);
//   }

//   /**
//    * Sync the UI with the current state of players.
//    */
//   sync() {
//     this._syncWithPlayers(state.players);
//   }

//   /**
//    * Start periodic updates (e.g., every 1000ms).
//    * @param {number} interval - Update interval in milliseconds.
//    */
//   startPeriodicUpdates(interval = 1000) {
//     this.intervalId = setInterval(() => {
//       this.sync();
//     }, interval);
//   }

//   /**
//    * Stop periodic updates.
//    */
//   stopPeriodicUpdates() {
//     if (this.intervalId) {
//       clearInterval(this.intervalId);
//     }
//   }
// }
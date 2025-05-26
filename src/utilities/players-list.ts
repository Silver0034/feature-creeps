import { elements } from "@utilities/elements";
import { state, type PlayerData } from "@utilities/state";

const playerElements = new Map();

export function setPlayerStatus(player: PlayerData, status: string) {
    player.status = status;
    syncPlayerStatus();
}

export function syncPlayerStatus() {
  const currentPlayers = state.players;
  const currentPeerIds = new Set(currentPlayers.map(p => p.peerId));

  // Process all current players.
  currentPlayers.forEach(player => {
    const peerId = player.peerId;
    const name = player.sheet?.name || 'Unknown Player';
    const status = player.status || 'Unknown';
    const isVIP = peerId === state.vipId;
    const vipMarker = isVIP ? '⭐' : '';

    if (!playerElements.has(peerId)) {
      // Create new element.
      const li = document.createElement('li');
      li.textContent = `${vipMarker}${name}: ${status}`;
      elements.host.playersStatus.appendChild(li);
      playerElements.set(peerId, li);
    } else {
      // Update existing element.
      const li = playerElements.get(peerId);
      if (li) {
        li.textContent = `${vipMarker}${name}: ${status}`;
      }
    }
  });

  // Remove elements for players no longer in the game.
  playerElements.forEach((li, peerId) => {
    if (!currentPeerIds.has(peerId)) {
      elements.host.playersStatus.removeChild(li);
      playerElements.delete(peerId);
    }
  });
}

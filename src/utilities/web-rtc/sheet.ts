import { selfId } from "trystero/mqtt";
import { CharacterSheet } from "@utilities/character-sheet";
import { updateSheet } from "@utilities/game-logic-client";
import { state, Role } from "@utilities/state";
import { WebRTC } from "@utilities/web-rtc";

type SheetData = { sheet: string, peerId: string };

export function sheetMixin<TBase extends new (...args: any[]) => WebRTC>(Base: TBase) {
  return class extends Base {
    // NOTE: Must send using sendSheet({ sheet: player.sheet.toJSON(), peerId: player.peerId });.
    public sendSheet!: (data: SheetData, peerId?: string) => void;
    constructor(...args: any[]) {
      super(...args);
      this.registerSheetActions();
    }
    private registerSheetActions(): void {
      const [sendSheet, getSheet] = this.room.makeAction<SheetData>("sheet");
      this.sendSheet = sendSheet;
      getSheet((data, peerId) => {
        try {
          if (!this.isSheetData(data)) {
            throw new Error(`Invalid data payload: ${JSON.stringify(data)}`);
          }
          if (state.role != Role.Client) {
            throw new Error(`Ignoring character sheet sent by ${peerId} to a ${Role[state.role]}: ${data.sheet}`);
          }
          console.log(`Got sheet from ${peerId} for peer ${data.peerId}: ${data.sheet}`);
          const sheet = CharacterSheet.fromJSON(data.sheet);
          // Update player sheet.
          const player = state.players.find(player => player.peerId === data.peerId);
          if (!player) {
            state.players.push({
              sheet: sheet,
              secret: "",
              peerId: selfId,
              status: ""
            });
          } else {
            player.sheet = sheet;
          }
          // Display your own sheet on screen.
          if (data.peerId === selfId) {
            updateSheet(sheet);
          }
        } catch (error) {
          console.error(error);
        }
      });
    }
    private isSheetData(data: any): data is SheetData {
      return (
        typeof data === "object" &&
        data !== null &&
        "sheet" in data &&
        "peerId" in data &&
        typeof data.peerId === "string"
      );
    }
  };
}
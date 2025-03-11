import { selfId } from "trystero";
import { WebRTC } from "@utilities/web-rtc";
import { state } from "@utilities/state";
import { CharacterSheet } from "@utilities/character-sheet";

type SheetData = { sheet: string };

export function sheetMixin<TBase extends new (...args: any[]) => WebRTC>(Base: TBase) {
  return class extends Base {
    // NOTE: Must send using sendSheet({sheet: sheet.toJSON(false)});.
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
          console.log(`Got sheet from ${peerId}: ${data.sheet}`);
          // Update personal player sheet.
          const player = state.players.find(player => player.peerId === selfId);
          if (!player) {
            // TODO: No secret may be a problem here. We don't use the field for now though.
            state.players.push({
              sheet: CharacterSheet.fromJSON(data.sheet),
              secret: "",
              peerId: selfId
            });
          } else {
            player.sheet = CharacterSheet.fromJSON(data.sheet);
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
        Object.values(CharacterSheet).includes(data.sheet)
      );
    }
  };
}
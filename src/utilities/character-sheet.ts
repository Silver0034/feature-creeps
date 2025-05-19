import { state } from "@utilities/state";

export interface CharacterSheetData {
	name: string
	className: string
	level: number
	strengths: string[]
	weaknesses: string[]
	wins?: number
}

export class CharacterSheet {
	constructor(
		public name: string = 'Unknown',
		public className: string = 'Unknown',
		public level: number = 0,
		public strengths: string[] = [],
		public weaknesses: string[] = [],
		public wins: number = 0,
	) { }

	toString(): string {
		const strengthsStr =
			this.strengths.length > 0 ? this.strengths.join('\n') : 'None yet!'
		const weaknessesStr =
			this.weaknesses.length > 0
				? this.weaknesses.join('\n')
				: 'None yet!'

		return `Name: ${this.name}
Class: ${this.className}
Level: ${this.level}
Strengths:
${strengthsStr}
Weaknesses:
${weaknessesStr}`
	}

	// TODO: Make the number of strengths and weaknesses no more than the character's level.
	static getSchema(level: number, numAbilities: number): object | string {
		// NOTE: The local inference engine only supports a subset of the required schema features. As a result, we cannot use minItems or const. This may generate slightly different character sheets than we want.
		if (state.options.inference.engine === "local") {
			return `{
				"properties": {
					"name": { "type": "string" },
					"className": { "type": "string"},
					"level": {"type": "integer"},
					"strengths": {
						"type": "array",
						"items": {"type": "string"}
					},
					"weaknesses": {
						"type": "array",
						"items": {"type": "string"}
					}
				},
				"required": ["name", "className", "level", "strengths", "weaknesses"],
				"type": "object"
			}`
		}
		else {
			return {
				properties: {
					name: { type: 'string' },
					className: { type: 'string' },
					level: { const: level },
					// level: { type: 'integer' },
					strengths: {
						type: 'array',
						items: { type: 'string' },
						contains: numAbilities
					},
					weaknesses: {
						type: 'array',
						items: { type: 'string' },
						contains: numAbilities
					}
				},
				required: ['name', 'className', 'level', 'strengths', 'weaknesses']
			}
		}
	}

	toJSON(hideWins = true as boolean): string {
		// This approach prevents a recursive call to toJSON() because the json
		// object copy isn't explicitly a CharacterSheet.
		let json = {
			name: this.name,
			className: this.className,
			level: this.level,
			strengths: this.strengths,
			weaknesses: this.weaknesses
		} as any;
		if(!hideWins) {
			// Wins may bias the AI to have characters steamroll. Remove them.
			json.wins = this.wins;
		}
		return JSON.stringify(json);
	}

	static fromJSON(json: string): CharacterSheet {
		const parsedJson = JSON.parse(json);

		// Extract required properties.
		const { name, className, level, strengths, weaknesses } = parsedJson;

		// Handle optional properties with default values.
		const wins = parsedJson.wins ?? 0;

		return new CharacterSheet(
			name,
			className,
			level,
			strengths,
			weaknesses,
			wins,
		);
	}

}

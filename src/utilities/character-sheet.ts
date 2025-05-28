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
			this.strengths.length > 0
				? this.strengths.map(s => `- ${s}`).join('\n')
				: 'None yet!'
		const weaknessesStr =
			this.weaknesses.length > 0
				? this.weaknesses.map(w => `- ${w}`).join('\n')
				: 'None yet!'

		return `Name: ${this.name}
Class: ${this.className}
Level: ${this.level}
Strengths:
${strengthsStr}
Weaknesses:
${weaknessesStr}`
	}

	static getSchema(level: number): object {
		// NOTE: The local inference engine only supports a subset of the
		// required schema features. As a result, we cannot use minItems or
		// const. This may generate slightly different character sheets than we
		// want.
		if (state.options.inference.engine === "local") {
			return {
				"properties": {
					"name": { "type": "string" },
					"className": { "type": "string" },
					"level": { "type": "integer" },
					"strengths": {
						"type": "array",
						"items": { "type": "string" }
					},
					"weaknesses": {
						"type": "array",
						"items": { "type": "string" }
					}
				},
				"required": ["name", "className", "level", "strengths", "weaknesses"],
				"type": "object"
			};
		} else {
			return {
				properties: {
					name: { type: 'string' },
					className: { type: 'string' },
					level: { const: level },
					strengths: {
						type: 'array',
						items: { type: 'string' },
						minItems: Math.max(1, Math.min(5, level)),
						maxItems: Math.max(1, Math.min(5, level))
					},
					weaknesses: {
						type: 'array',
						items: { type: 'string' },
						minItems: Math.max(1, Math.min(3, 20 - level)),
						maxItems: Math.max(1, Math.min(3, 20 - level))
					}
				},
				required: ['name', 'className', 'level', 'strengths', 'weaknesses']
			};
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
		if (!hideWins) {
			// Wins may bias the AI to have characters steamroll. Remove them.
			json.wins = this.wins;
		}
		return JSON.stringify(json);
	}

	static fromJSON(json: string): CharacterSheet {
		let parsedJson = JSON.parse(json);
		// Some implementations of json_object schema enforcement return a JSON
		// array with one element. We must strip it down to the desired object.
		if (Array.isArray(parsedJson)) {
			parsedJson = parsedJson[0];
		}

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

import { state } from "@utilities/state"

export interface CharacterSheetData {
	name: string
	// TODO: Gender?
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

	static getSchema(level: number): object | string {
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
						minItems: 1
					},
					weaknesses: {
						type: 'array',
						items: { type: 'string' },
						minItems: 1
					}
				},
				required: ['name', 'className', 'level', 'strengths', 'weaknesses']
			}
		}
	}

	toJSON(hideWins = true as boolean): string {
		// Remove private fields.
		if (hideWins) {
			// Create a copy of the object.
			const copy = { ...this } as { [key: string]: any };
			// Wins may bias the AI to have characters steamroll. Remove them.
			delete copy.wins;
			// Return the JSON string.
			return JSON.stringify(copy);
		}
		// Return the JSON string.
		return JSON.stringify(this);
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

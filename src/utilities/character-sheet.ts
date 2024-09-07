export interface CharacterSheetData {
	name: string
	className: string
	level: number
	strengths: string[]
	weaknesses: string[]
	wins?: number
	pvpWins?: number
}

export class CharacterSheet {
	constructor(
		public name: string = 'Unknown',
		public className: string = 'Unknown',
		public level: number = 0,
		public strengths: string[] = [],
		public weaknesses: string[] = [],
		public wins: number = 0,
	) {}

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

	static getSchema(level: number): object {
		return {
			properties: {
				name: { type: 'string' },
				className: { type: 'string' },
				level: { const: level },
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

	toJSON(hideWins = true as boolean): string {
		// Create a copy of the object
		const copy = { ...this } as { [key: string]: any }

		// Remove private fields
		if (hideWins) {
			delete copy.wins
			delete copy.pvpWins
		}

		// Return the JSON string
		return JSON.stringify(copy)
	}

	static fromJSON(json: string): CharacterSheet {
		const { name, className, level, strengths, weaknesses, wins, pvpWins } =
			JSON.parse(json)
		return new CharacterSheet(
			name,
			className,
			level,
			strengths,
			weaknesses,
			wins,
		)
	}
}

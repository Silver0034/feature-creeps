import { CharacterSheet } from '@utilities/character-sheet.ts'
import { client, FormatSchema } from "@utilities/openai.ts"
import { state } from "@utilities/state"

export async function IsStrength(
    character: CharacterSheet,
    ability: string
): Promise<boolean> {
    const reply = await client.chat.completions.create({
        model: state.inference.modelName, response_format: { 'type': 'json_object', 'schema': FormatSchema({ "type": "object", "properties": { "Rationale": { "type": "string" }, "Decision": { "type": "string", "enum": ["Strength", "Weakness"] } }, "required": ["Rationale", "Decision"] }) }, stop: "<|end|>", messages: [
            {
                'role': 'system',
                'content': `You are an expert in character analysis. Your task is to evaluate a given trait and determine whether it should be classified as a strength or a weakness. Analyze the impact this trait would have on a character, considering its potential benefits and drawbacks. Provide a clear and logical rationale for your decision, and conclude with whether the trait is ultimately a strength or a weakness. Provide the output in JSON format, with a field called "Rationale" with a brief explanation why the ability is or is not helpful and a field called "Decision" containing the value of either "Strength" or "Weakness".

Instructions:
1. Evaluate the Trait: Consider the trait’s potential effects on a character's abilities, interactions, and overall well-being. Think about how it could be used advantageously or how it might hinder the character.
2. Provide a Rationale: Offer a well-reasoned explanation that justifies why this trait would be considered a strength or a weakness. This rationale should address both the positive and negative aspects of the trait, if applicable.
3. Final Decision: After analyzing the trait, clearly state whether it is classified as a strength or a weakness based on your rationale.

Examples:
Input: "Perfect Memory"
Rationale: "Having a perfect memory allows a character to recall every detail they've ever encountered, making them extremely knowledgeable and effective in situations requiring precise information. The advantages of such detailed recall are considerable."
Decision: "Strength"

Input: "Chronic Fatigue"
Rationale: "Chronic fatigue severely limits a character's ability to perform physically and mentally, leading to reduced productivity and effectiveness in most situations. The constant exhaustion overshadows any potential benefits, as it hampers the character’s ability to engage fully in their environment."
Decision: "Weakness"`,
            },
            {
                'role': 'user',
                'content': `Input: ${ability}`
            }
        ]
    });
    console.log("IsStrength", reply)
    const parsedResponse = JSON.parse(reply.choices[0].message.content);

    let isHelpful: boolean = true;
    switch (parsedResponse?.Decision) {
        case 'Strength':
            isHelpful = true;
            break;
        case 'Weakness':
            isHelpful = false;
            break;
        default:
            throw new Error('No decision was reported by the conflict detector.');
    }
    return isHelpful;
}

export async function BalanceAbility(
    character: CharacterSheet,
    ability: string,
    isStrength: boolean
): Promise<string> {
    const reply = await client.chat.completions.create({
        model: state.inference.modelName, response_format: { 'type': 'json_object', 'schema': FormatSchema({"type": "object", "properties": {"Strength": {"type": "string"}, "Weakness": {"type": "string"}},"required": [isStrength ? "Weakness" : "Strength"]}) }, stop: "<|end|>", messages: [
            {
                'role': 'system',
                'content': `You are an expert in designing balanced character abilities. For each strength or weakness given, your task is to generate a corresponding weakness or strength of equal power level. The strength should be a notable advantage, while the weakness should be a significant disadvantage. The strengths and weaknesses generally should not be directly related, but they must be of equivalent impact on the character’s overall capabilities. The output should be formatted as JSON. If a strength was provided, a weakness in a field named "Weakness" should be provided. Likewise, if a weakness was provided, a strength in a field named "Strength" should be provided.

Instructions:
1. When Given a Strength: Generate a weakness that matches the strength in terms of how it impacts the character's abilities, balancing the overall power. The weakness should present a substantial challenge to the character, hindering them in a way that offsets the benefit of their strength.
2. When Given a Weakness: Generate a strength that compensates for the weakness by providing the character with a powerful advantage. This strength should enhance the character’s abilities, balancing the overall power.

Examples:

Strength: Superhuman Strength
Weakness: Crippling Anxiety

Weakness: Chronic Pain
Strength: Invulnerability

Strength: Mild Luck
Weakness: Bad Dreams

Strength: Always Finds a Penny
Weakness: Jinxed

Weakness: Prone to Fainting
Strength: Always Knows the Time

Strength: Artistic Talent
Weakness: Memory Loss

Weakness: Extreme Claustrophobia
Strength: Flight

Strength: Mind Control
Weakness: Social Pariah

Weakness: Random Amnesia
Strength: Reality Manipulation`,
            },
            {
                'role': 'user',
                'content': `${isStrength ? "Strength" : "Weakness"}: ${ability}`
            }
        ]
    });
    console.log("BalanceAbility", reply)
    const parsedResponse = JSON.parse(reply.choices[0].message.content);

    if (isStrength && "Weakness" in parsedResponse) {
        return parsedResponse['Weakness']
    } else if (!isStrength && "Strength" in parsedResponse) {
        return parsedResponse["Strength"]
    } else {
        throw new Error('No complementary ability was generated.');
    }
}

export async function GenerateClass(character: CharacterSheet): Promise<string> {
    const reply = await client.chat.completions.create({
        model: state.inference.modelName, response_format: { 'type': 'json_object', 'schema': FormatSchema({ "type": "object", "properties": { "new_className": { "type": "string" } }, "required": ["new_className"] }) }, stop: "<|end|>", messages: [
            {
                'role': 'user',
                'content': `A character has leveled up. They have gained new strengths and weaknesses. Based on their updated character sheet, provide them with a new, more suitable class name than their current one. It may be humorous, precise, or even just clever. Be inventive! Provide the output in JSON, with a single field named "new_className", with the value containing this new class name.\n\nCharacter Sheet:\n${character.toString()}`,
            }
        ]
    });
    console.log("GenerateClass", reply)
    const parsedResponse = JSON.parse(reply.choices[0].message.content);
    return parsedResponse['new_className']
}

export async function ValidateAbility(
    character: CharacterSheet,
    ability: string
): Promise<string | null> {
    if (ability.length > 200) return 'Ability too long (>200 characters).'
    const reply = await client.chat.completions.create({
        model: state.inference.modelName, response_format: { 'type': 'json_object', 'schema': FormatSchema({ "type": "object", "properties": { "reasoning": { "type": "string" }, "conflict": { "type": "string", "enum": ["Yes", "No"] } }, "required": ["reasoning", "conflict"] }) }, stop: "<|end|>", messages: [
            {
                'role': 'user',
                'content': `Does the following ability conflict with any of the existing abilities for this character? Respond in JSON with a field called "reasoning" with a brief explanation why the ability does nor does not conflict. Also include a field called "conflict" containing the value of either "Yes" or "No" based on whether or not the ability conflicts.\nCharacter Sheet:\n${character.toString()}\nAbility: ${ability}\n`,
            }
        ]
    });
    console.log("ValidateAbility", reply)
    const parsedResponse = JSON.parse(reply.choices[0].message.content);

    let isValid: boolean = true;
    switch (parsedResponse?.conflict) {
        case 'Yes':
            isValid = true;
            break;
        case 'No':
            isValid = false;
            break;
        default:
            throw new Error('No decision was reported in the ability validator.');
    }
    const reasoning: string = parsedResponse.reasoning
    if (!isValid) return reasoning
    return null
}

export async function Combat(
    c1: CharacterSheet,
    c2: CharacterSheet
): Promise<[CharacterSheet, string]> {
    const reply = await client.chat.completions.create({
        model: state.inference.modelName, response_format: { 'type': 'json_object', 'schema': FormatSchema({ "type": "object", "properties": { "fight_description": { "type": "string" }, "winner": { "type": "string", "enum": [c1.name, c2.name] } }, "required": ["fight_description", "winner"] }) }, stop: "<|end|>", messages: [
            {
                'role': 'system',
                'content': `You are an expert in narrating epic battles between characters. Given the character sheets for two combatants, craft a brief but thrilling account of their fight. Incorporate their strengths and weaknesses dynamically and only when relevant, and engage the reader with tension, creativity, humor, and other exciting literary techniques. Keep the description to a single paragraph and determine the victor based on their abilities.

Instructions:
1. Analyze Character Sheets: Examine the strengths and weaknesses of both characters. Consider how these traits might influence the outcome of the battle.
2. Narrate the Fight: Write a brief yet entertaining description of the battle. The fight should be dynamic, incorporating only the relevant abilities of each character, and should include moments of tension, humor, or surprise when appropriate.
3. Determine the Winner: Based on the characters' strengths and weaknesses, decide which character would most likely emerge victorious. The decision should be logical and reflect the characters' relative skills.
4. Output Format: The output must be in JSON format, including a field named "fight_description", providing the description of the fight and a field named "winner", containing the name of the winner.

Examples:

Input: { "character_1": { "name": "Arden Swiftblade", "strengths": ["Superhuman speed", "Master swordsman", "Keen reflexes"], "weaknesses": ["Impatient", "Overconfident"] }, "character_2": { "name": "Morgath the Infernal", "strengths": ["Fire manipulation", "Immense strength", "Intimidating presence"], "weaknesses": ["Slow", "Susceptible to water"] } }
Output: { "fight_description": "Arden Swiftblade zipped around Morgath, dodging flames with ease. His speed was unmatched, but his overconfidence made him reckless. When a sudden downpour weakened Morgath's fire, Arden struck swiftly, taking advantage of the giant's slow movements. In the end, Morgath crumbled, and Arden emerged victorious.", "winner": "Arden Swiftblade" }

Input: { "character_1": { "name": "Lady Seraphina", "strengths": ["Flight", "Healing magic", "Divine light"], "weaknesses": ["Fragile", "Limited magic reserves"] }, "character_2": { "name": "Grimgor the Unyielding", "strengths": ["Unbreakable armor", "Brute strength", "Battle tactics"], "weaknesses": ["Slow", "Easily enraged"] } }
Output: { "fight_description": "Lady Seraphina stayed airborne, blasting Grimgor with divine light. His armor held firm, and as Seraphina tired, Grimgor's rage fueled a devastating counterattack. A well-aimed throw brought her down, and despite her healing magic, Grimgor's strength won the day.", "winner": "Grimgor the Unyielding" }

Input: { "character_1": { "name": "[Character 1 Name]", "strengths": ["[Strength 1]", "[Strength 2]", "..."], "weaknesses": ["[Weakness 1]", "[Weakness 2]", "..."] }, "character_2": { "name": "[Character 2 Name]", "strengths": ["[Strength 1]", "[Strength 2]", "..."], "weaknesses": ["[Weakness 1]", "[Weakness 2]", "..."] } }
Output: { "fight_description": "[Exciting and creative battle description]", "winner": "[Name of the winning character]" }`,
            },
            {
                'role': 'user',
                'content': `Input:\n${c1.toJSON()}\n\n${c2.toJSON()}`
            }
        ]
    });
    console.log("Combat", reply)
    const parsedResponse = JSON.parse(reply.choices[0].message.content);

    const description: string = parsedResponse.fight_description
    if (parsedResponse.winner == c1.name) {
        return [c1, description]
    }
    else if (parsedResponse.winner == c2.name) {
        return [c2, description]
    }
    else {
        throw new Error('No winner provided.');
    }
}

export async function GenerateEnemy(round: number): Promise<CharacterSheet> {
    // TODO: Final boss monster should take existing player abilities into account and create something specifically designed to counter as many players as possible.
    const blightfang = Object.assign(new CharacterSheet(), {
        name: 'The Blightfang',
        className: 'Poison Drake',
        level: Math.floor((state.numRounds * 5) / 20),
        strengths: [
            'Venomous bite that deals damage over time',
            'Tough, scaled hide that reduces physical damage',
            'Can emit a cloud of poison gas in a small radius'
        ],
        weaknesses: ['Vulnerable to cold-based attacks', 'Slow in enclosed spaces, reducing agility']
    });
    const vorlok = Object.assign(new CharacterSheet(), {
        name: 'Vorlok, Devourer of Stars',
        className: 'Cosmic Titan',
        level: Math.floor((state.numRounds * 18) / 20),
        strengths: [
            'Can manipulate gravity to crush enemies or slow their movement',
            'Immune to all non-magical attacks',
            'Regenerates health rapidly in starlight',
            'Capable of firing energy beams that pierce through magical barriers'
        ],
        weaknesses: ['Weak to intense gravity']
    });
    const microwave = Object.assign(new CharacterSheet(), {
        name: 'Microwave Disaster',
        className: 'Food Explosion',
        level: Math.floor((state.numRounds * 3) / 20),
        strengths: [
            'Emits powerful microwaves',
            'Contaminates its enemies with a horrid goo'
        ],
        weaknesses: ['Powerless (yet still disgusting) when unplugged', 'Weak to cleaning supplies']
    });
    const alastor = Object.assign(new CharacterSheet(), {
        name: 'Alastor the Adventurer',
        className: 'Knight',
        level: Math.floor((state.numRounds * 10) / 20),
        strengths: [
            'Trained in swordsmanship',
            'Brave',
            'Honorable'
        ],
        weaknesses: ['Self-absorbed', 'Headstrong', 'Follows a rigid code of ethics, avoiding dirty paths to victory']
    });
    const generic = Object.assign(new CharacterSheet(), {
        name: '[Adversary Name]',
        className: '[Class or Species]',
        level: Math.floor((state.numRounds * 10) / 20),
        strengths: ['[Strength 1]', '[Strength 2]', '[More strengths for higher-level adversaries]'],
        weaknesses: ['[Weakness 1]', '[More weaknesses for lower-level adversaries]']
    });
    const reply = await client.chat.completions.create({
        model: state.inference.modelName, response_format: { 'type': 'json_object', 'schema': CharacterSheet.getSchema(round) }, stop: "<|end|>", messages: [
            {
                'role': 'system',
                'content': `You are an expert in creating balanced characters for role-playing games. Given the level of a character and a defined maximum level, your task is to generate a character with useful skills. The character should have a mix of strengths and weaknesses, with stronger characters at higher levels possessing more strengths and fewer weaknesses. The character could be anything: a monster, a heroic adventurer, even goofy things like home appliances or high-minded concepts. Be inventive! Generate the output in JSON format, including the character's name, class, level, strengths, and weaknesses.

Instructions:
1. Consider the Level: When generating the character, base its power on the provided level, with strengths proportionate to this level. At higher levels, the character should be more formidable, with more strengths and fewer weaknesses.
2. Strengths and Weaknesses: Provide the character with powerful abilities or traits. Include weaknesses that balance its abilities at lower levels, but reduce the number of weaknesses as the character becomes more powerful. Make these traits varied yet authentic. Always include at least one weakness.

Output Format: The output must be in JSON format, including the name, class name, level, strengths, and weaknesses.

Examples:

Input: Level: ${blightfang.level}, Maximum Level: ${state.numRounds}
Output:
{json.dumps(blightfang, cls=PlayerCardEncoder)}

Input: Level: ${vorlok.level}, Maximum Level: ${state.numRounds}
Output:
${vorlok.toJSON()}

Input: Level: ${microwave.level}, Maximum Level: ${state.numRounds}
Output:
${microwave.toJSON()}

Input: Level: ${alastor.level}, Maximum Level: ${state.numRounds}
Output:
${alastor.toJSON()}

Input: Level: ${generic.level}, Maximum Level: ${state.numRounds}
Output:
${generic.toJSON()}`,
            },
            {
                'role': 'user',
                'content': `Input: Level: ${round}, Maximum Level: ${state.numRounds}`
            }
        ]
    });
    console.log("GenerateEnemy", reply)
    const parsedResponse = JSON.parse(reply.choices[0].message.content);
    return parsedResponse as CharacterSheet
}

export async function BattleRoyale(players: CharacterSheet[]): Promise<[CharacterSheet | null, string]> {
    const reply = await client.chat.completions.create({
        model: state.inference.modelName, response_format: { 'type': 'json_object', 'schema': FormatSchema({ "type": "object", "properties": { "battle_description": { "type": "string" }, "winner": { "type": "string", "enum": players.map(player => player.name) } }, "required": ["battle_description", "winner"] }) }, stop: "<|end|>", messages: [
            {
                'role': 'system',
                'content': `You are an expert in crafting epic, cinematic battles between groups of unique characters, reminiscent of the grand, climactic showdowns in blockbuster movies. Given the character sheets for a group of combatants, create a vivid and thrilling narrative of their battle royale. Each character should have a moment to shine, showcasing their strengths, quirks, and weaknesses dynamically. The story should be filled with tension, creativity, unexpected alliances, betrayals, and dramatic shifts, ensuring that every participant plays a significant role. The narrative should capture the intensity of an all-out battle where only one can emerge victorious.
    
    Instructions:
    
    Analyze Character Sheets: Examine the strengths, weaknesses, and personality traits of all the characters involved. Consider how these aspects might influence their interactions and the battle's outcome.
    Narrate the Battle: Write an exciting, action-packed account of the battle royale. The fight should be dynamic, with each character making meaningful contributions or suffering from their vulnerabilities. The description should include moments of tension, clever tactics, humor, or surprise when appropriate, echoing the energy of an epic final battle.
    Determine the Winner: Based on the characters' strengths, weaknesses, and the flow of battle, logically decide who would most likely be the last one standing. This decision should reflect the characters' abilities and the narrative's progression.
    Output Format: The output must be in JSON format, with a field named "battle_description" providing the detailed account of the battle, and a field named "winner" containing the name of the ultimate victor.
    
    Examples:
    
    Input:
    {
      "characters": [
        {
          "name": "Arden Swiftblade",
          "strengths": ["Superhuman speed", "Master swordsman", "Keen reflexes"],
          "weaknesses": ["Impatient", "Overconfident"]
        },
        {
          "name": "Morgath the Infernal",
          "strengths": ["Fire manipulation", "Immense strength", "Intimidating presence"],
          "weaknesses": ["Slow", "Susceptible to water"]
        },
        {
          "name": "Lady Seraphina",
          "strengths": ["Flight", "Healing magic", "Divine light"],
          "weaknesses": ["Fragile", "Limited magic reserves"]
        },
        {
          "name": "Grimgor the Unyielding",
          "strengths": ["Unbreakable armor", "Brute strength", "Battle tactics"],
          "weaknesses": ["Slow", "Easily enraged"]
        }
      ]
    }
    Output:
    {
      "battle_description": "The battlefield crackled with tension as Arden Swiftblade dashed between opponents, his speed a blur. Morgath's flames roared, scorching the ground beneath Lady Seraphina, who took to the skies, raining divine light upon the hulking Grimgor. As Morgath's fiery onslaught met Seraphina's radiant beams, the clash of elements created a storm of fire and light. Grimgor, slow but unyielding, waded through the chaos, his armor deflecting blows that would fell lesser beings. Arden, overconfident in his agility, attempted a daring strike at Grimgor but was caught off guard by a sudden eruption of flames from Morgath. Stumbling, he found himself vulnerable to Grimgor's crushing blow, but in a twist of fate, Seraphina's dwindling magic sent a beam of divine light through Grimgor's armor, staggering him. In the end, it was Morgath's unrelenting flames that consumed the battlefield, his infernal strength overpowering the others. As the smoke cleared, Morgath stood as the last combatant, his fiery eyes burning with victory.",
      "winner": "Morgath the Infernal"
    }`,
            },
            {
                'role': 'user',
                'content': `Input:\n${players.map(player => player.toJSON()).join('\n\n')}`
            }
        ]
    });
    console.log("BattleRoyale", reply)
    const parsedResponse = JSON.parse(reply.choices[0].message.content);
    const description = parsedResponse.battle_description
    const winner = players.find(player => player.name === parsedResponse.winner) || null;
    return [winner, description]
}
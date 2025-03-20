interface Elements {
    gameState: HTMLInputElement | undefined;
    playerCount: HTMLElement | null;
    story: HTMLInputElement | undefined;
    roomDiv: HTMLInputElement | undefined;
    abilityDiv: HTMLInputElement | undefined;
}

export let elements: Elements = {
    gameState: undefined,
    playerCount: null,
    story: undefined,
    roomDiv: undefined,
    abilityDiv: undefined,
}
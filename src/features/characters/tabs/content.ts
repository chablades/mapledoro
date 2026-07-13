/*
  Centralized UI copy for characters setup flow.
  Edit wording here to update all related components.
*/
export const CHARACTERS_COPY = {
  firstTimeSetup: {
    title: "First-Time Setup",
    subtitle: "Choose how you want to get started.",
    importButton: "Import Character",
    searchButton: "Search Character",
  },
  importCharacter: {
    title: "Import Character",
    subtitle: "Import flow is coming next. You can use search for now.",
    backButton: "Back",
    goToSearchButton: "Go To Search",
  },
  searchEntry: {
    title: "Add Your Maple Character",
    subtitle: "Type your IGN to setup your profile.",
    backButton: "Back",
    backToCharactersButton: "← Characters",
    searchButton: "Search",
    searchingButton: "Searching...",
  },
  searchResultPreview: {
    confirmPrompt: "Is this the character you want to add?",
    confirmButton: "Confirm",
  },
  quickSetupIntro: {
    firstTitle: "Let's go through the first setup",
    firstSubtitle: "This is your first character, we'll go through it one step at a time.",
    additionalTitle: "Let's set up this character",
    additionalSubtitle: "We'll go through it one step at a time.",
    nextStepButton: "Next Step",
  },
  characterProfile: {
    backButton: "Back",
    viewYourCharactersButton: "Characters",
  },
  characterProfileActions: {
    setMainButton: "Set main",
    removeMainButton: "Remove main",
    setChampionButton: "Set champion",
    removeChampionButton: "Remove champion",
    removeCharacterButton: "Remove",
  },
  characterDirectory: {
    title: "View Your Characters",
    sortRowsLabel: "Sort rows",
    sortAlphabeticalOption: "Alphabetical",
    sortByLevelOption: "By Level",
    sortByClassOption: "By Class",
    sortByWorldOption: "By World",
    mainCharacterLabel: "Main Character",
    championsLabel: "Champions",
    mulesLabel: "Mules",
    addCharacterButton: "Add character",
    noMainSelectedMessage: "No main selected yet.",
    noCharactersAddedMessage: "No characters added yet.",
    mainAlsoChampionMessage: "Main is also set as champion.",
  },
} as const;

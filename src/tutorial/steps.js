// Chaque étape déclare une ou plusieurs `targets` :
//   { id }                       -> encadre l'élément mesuré sous cet id
//   { id, segment: {index,count} } -> encadre 1/count de la largeur de l'élément
//                                     (ex. un onglet dans une barre d'onglets)
// `targets: []` -> aucune cible, infobulle centrée (étape de synthèse).
export const TUTORIAL_STEPS = [
  {
    id: 'home-intro',
    screen: 'Actu',
    targetTab: 'Fil',
    targets: [
      {id: 'tab-Actu'},
      {id: 'topbar-actu', segment: {index: 0, count: 2}},
    ],
    titleKey: 'tutorial.steps.homeIntro.title',
    descriptionKey: 'tutorial.steps.homeIntro.description',
  },
  {
    id: 'home-news-followed',
    screen: 'Actu',
    targetTab: 'JeuxSuivis',
    targets: [
      {id: 'tab-Actu'},
      {id: 'topbar-actu', segment: {index: 1, count: 2}},
    ],
    titleKey: 'tutorial.steps.homeNewsFollowed.title',
    descriptionKey: 'tutorial.steps.homeNewsFollowed.description',
  },
  {
    id: 'home-my-games',
    screen: 'SuivreUnJeu',
    targetTab: 'MesJeux',
    targets: [
      {id: 'tab-SuivreUnJeu'},
      {id: 'topbar-follow', segment: {index: 0, count: 2}},
    ],
    titleKey: 'tutorial.steps.homeMyGames.title',
    descriptionKey: 'tutorial.steps.homeMyGames.description',
  },
  {
    id: 'home-wishlist',
    screen: 'SuivreUnJeu',
    targetTab: 'Wishlist',
    targets: [
      {id: 'tab-SuivreUnJeu'},
      {id: 'topbar-follow', segment: {index: 1, count: 2}},
    ],
    titleKey: 'tutorial.steps.homeWishlist.title',
    descriptionKey: 'tutorial.steps.homeWishlist.description',
  },
  {
    id: 'home-search',
    screen: 'SuivreUnJeu',
    targetTab: 'Wishlist',
    targets: [{id: 'tab-SuivreUnJeu'}, {id: 'search-bar'}],
    titleKey: 'tutorial.steps.homeSearch.title',
    descriptionKey: 'tutorial.steps.homeSearch.description',
  },
  {
    id: 'home-settings',
    screen: 'MonCompte',
    targetTab: 'Settings',
    targets: [{id: 'tab-MonCompte'}],
    titleKey: 'tutorial.steps.homeSettings.title',
    descriptionKey: 'tutorial.steps.homeSettings.description',
  },
  {
    id: 'settings-notifications',
    screen: 'Settings',
    targets: [{id: 'settings-notifications'}],
    titleKey: 'tutorial.steps.settingsNotifications.title',
    descriptionKey: 'tutorial.steps.settingsNotifications.description',
  },
  {
    id: 'settings-library',
    screen: 'Settings',
    targets: [{id: 'settings-library'}],
    titleKey: 'tutorial.steps.settingsLibrary.title',
    descriptionKey: 'tutorial.steps.settingsLibrary.description',
  },
  {
    id: 'settings-wishlist',
    screen: 'Settings',
    targets: [{id: 'settings-wishlist'}],
    titleKey: 'tutorial.steps.settingsWishlist.title',
    descriptionKey: 'tutorial.steps.settingsWishlist.description',
  },
  {
    id: 'settings-summary',
    screen: 'Settings',
    targets: [],
    titleKey: 'tutorial.steps.settingsSummary.title',
    descriptionKey: 'tutorial.steps.settingsSummary.description',
    isSummary: true,
  },
];

export const SUMMARY_STEP_INDEX = TUTORIAL_STEPS.length - 1;

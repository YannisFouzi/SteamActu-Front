export const TUTORIAL_STEPS = [
  {
    id: 'home-intro',
    screen: 'Home',
    targetId: null,
    title: 'Premier pas',
    description:
      'Ici, vous retrouvez les actualités correspondant aux jeux que vous allez suivre.',
  },
  {
    id: 'home-news-followed',
    screen: 'Home',
    targetId: null,
    title: 'Jeux suivis',
    description:
      'Ici, vous aurez la liste des jeux que vous suivez.',
  },
  {
    id: 'home-my-games',
    screen: 'Home',
    targetId: null,
    title: 'Mes jeux',
    description:
      'Retrouvez la liste des jeux déjà présents dans votre bibliothèque et gérez leur suivi.',
  },
  {
    id: 'home-wishlist',
    screen: 'Home',
    targetId: null,
    title: 'Wishlist',
    description:
      'Visualisez les jeux de votre liste de souhaits et activez leur suivi.',
  },
  {
    id: 'home-search',
    screen: 'Home',
    targetId: null,
    title: 'Chercher un jeu',
    description:
      'Utilisez la recherche Steam pour ajouter de nouveaux jeux à votre suivi.',
  },
  {
    id: 'home-settings',
    screen: 'Home',
    targetId: 'home-settings-button',
    title: 'Accéder aux paramètres',
    description:
      'Appuyez ici pour régler vos notifications et vos préférences de suivi.',
  },
  {
    id: 'settings-notifications',
    screen: 'Settings',
    targetId: 'settings-notifications',
    title: 'Notifications d\'actualités',
    description:
      'Activez ce bouton pour recevoir les news des jeux que vous suivez.',
  },
  {
    id: 'settings-library',
    screen: 'Settings',
    targetId: 'settings-library',
    title: 'Jeux achetés',
    description:
      'Choisissez si les nouveaux jeux détectés dans votre bibliothèque sont ajoutés dans votre liste de jeux suivis automatiquement ou sur confirmation.',
  },
  {
    id: 'settings-wishlist',
    screen: 'Settings',
    targetId: 'settings-wishlist',
    title: 'Wishlist Steam',
    description:
      'Même principe pour les jeux ajoutés à votre wishlist : suivi automatique ou via une notification de confirmation.',
  },
  {
    id: 'settings-summary',
    screen: 'Settings',
    targetId: null,
    title: 'C\'est tout bon !',
    description:
      'Vous pouvez modifier ces options à tout moment depuis les paramètres.',
    isSummary: true,
  },
];

export const SUMMARY_STEP_INDEX = TUTORIAL_STEPS.length - 1;


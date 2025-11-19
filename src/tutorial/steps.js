export const TUTORIAL_STEPS = [
  {
    id: 'home-intro',
    screen: 'Actu',
    targetTab: 'Fil',
    targetId: null,
    title: 'Premier pas',
    description:
      'Ici, vous retrouvez les actualites correspondant aux jeux que vous allez suivre.',
  },
  {
    id: 'home-news-followed',
    screen: 'Actu',
    targetTab: 'JeuxSuivis',
    targetId: null,
    title: 'Jeux suivis',
    description: 'Ici, vous aurez la liste des jeux que vous suivez.',
  },
  {
    id: 'home-my-games',
    screen: 'SuivreUnJeu',
    targetTab: 'MesJeux',
    targetId: null,
    title: 'Mes jeux',
    description:
      'Retrouvez la liste des jeux deja presents dans votre bibliotheque et gerez leur suivi.',
  },
  {
    id: 'home-wishlist',
    screen: 'SuivreUnJeu',
    targetTab: 'Wishlist',
    targetId: null,
    title: 'Wishlist',
    description:
      'Visualisez les jeux de votre liste de souhaits et activez leur suivi.',
  },
  {
    id: 'home-search',
    screen: 'SuivreUnJeu',
    targetTab: 'Rechercher',
    targetId: null,
    title: 'Chercher un jeu',
    description:
      'Utilisez la recherche Steam pour ajouter de nouveaux jeux a votre suivi.',
  },
  {
    id: 'home-settings',
    screen: 'MonCompte',
    targetTab: 'Settings',
    targetId: null,
    title: 'Acceder aux parametres',
    description:
      'Appuyez ici pour regler vos notifications et vos preferences de suivi.',
  },
  {
    id: 'settings-notifications',
    screen: 'Settings',
    targetId: 'settings-notifications',
    title: "Notifications d'actualites",
    description:
      'Activez ce bouton pour recevoir les news des jeux que vous suivez.',
  },
  {
    id: 'settings-library',
    screen: 'Settings',
    targetId: 'settings-library',
    title: 'Jeux achetes',
    description:
      'Choisissez si les nouveaux jeux detectes dans votre bibliotheque sont ajoutes dans votre liste de jeux suivis automatiquement ou sur confirmation.',
  },
  {
    id: 'settings-wishlist',
    screen: 'Settings',
    targetId: 'settings-wishlist',
    title: 'Wishlist Steam',
    description:
      'Meme principe pour les jeux ajoutes a votre wishlist : suivi automatique ou via une notification de confirmation.',
  },
  {
    id: 'settings-summary',
    screen: 'Settings',
    targetId: null,
    title: "C'est tout bon !",
    description:
      'Vous pouvez modifier ces options a tout moment depuis les parametres.',
    isSummary: true,
  },
];

export const SUMMARY_STEP_INDEX = TUTORIAL_STEPS.length - 1;

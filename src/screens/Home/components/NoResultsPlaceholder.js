import React from 'react';
import EmptyStateMessage from './EmptyStateMessage';

const NoResultsPlaceholder = ({styles, align = 'top'}) => (
  <EmptyStateMessage
    styles={styles}
    iconName="sad-outline"
    title="Aucun résultat"
    text="Essayez avec d'autres mots-clés"
    titleStyle={styles.emptyTitle}
    textStyle={styles.emptyText}
    align={align}
  />
);

export default NoResultsPlaceholder;

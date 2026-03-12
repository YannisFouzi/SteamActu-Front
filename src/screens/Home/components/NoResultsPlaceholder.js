import React from 'react';
import {useTranslation} from 'react-i18next';
import EmptyStateMessage from './EmptyStateMessage';

const NoResultsPlaceholder = ({styles, align = 'top'}) => {
  const {t} = useTranslation();

  return (
    <EmptyStateMessage
      styles={styles}
      iconName="sad-outline"
      title={t('emptyStates.noResultsTitle')}
      text={t('emptyStates.noResultsText')}
      titleStyle={styles.emptyTitle}
      textStyle={styles.emptyText}
      align={align}
    />
  );
};

export default NoResultsPlaceholder;

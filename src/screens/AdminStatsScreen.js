import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LoadingContainer from '../components/LoadingContainer';
import {COLORS} from '../constants';
import {adminService} from '../services/api';
import styles from './admin/AdminStatsScreen.styles';

const COUNT_METRICS = [
  ['users', 'Utilisateurs'],
  ['games', 'Jeux en base'],
  ['gameSubscriptions', 'Jeux suivis uniques'],
  ['wishlists', 'Wishlists'],
  ['userNewsStates', 'Etats de lecture'],
];

const FOLLOW_MODE_LABELS = {
  auto: 'Automatique',
  off: 'Desactive',
  prompt: 'Confirmation',
  unset: 'Non defini',
};

const TIER_LABELS = {
  hot: 'Hot',
  warm: 'Warm',
  cold: 'Cold',
  cold_no_news: 'Sans actu',
  never_checked: 'Jamais checke',
  unset: 'Non classe',
};

const formatDate = value => {
  if (!value) {
    return 'Jamais';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Jamais';
  }

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const resolveErrorMessage = error => {
  const status = error?.status || error?.response?.status;

  if (status === 401) {
    return 'Session mobile expiree. Reconnecte-toi via Steam pour recreer une session signee.';
  }

  if (status === 403) {
    return "Ce compte Steam n'est pas autorise a lire les statistiques admin.";
  }

  return (
    error?.message ||
    'Impossible de charger les statistiques admin pour le moment.'
  );
};

const getSortedEntries = value =>
  Object.entries(value || {}).sort(([a], [b]) => a.localeCompare(b));

const Section = ({title, children}) => (
  <View style={styles.section}>
    <Text style={styles.sectionHeader}>{title}</Text>
    {children}
  </View>
);

const StatCard = ({label, value, wide = false}) => (
  <View style={[styles.statCard, wide ? styles.wideCard : null]}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const ErrorState = ({message, onRetry}) => (
  <View style={styles.errorBox}>
    <Text style={styles.errorTitle}>Acces admin indisponible</Text>
    <Text style={styles.errorText}>{message}</Text>
    <Pressable
      accessibilityRole="button"
      style={styles.retryButton}
      onPress={onRetry}>
      <Ionicons name="refresh" size={16} color={COLORS.STEAM_DARK_BLUE} />
      <Text style={styles.retryText}>Reessayer</Text>
    </Pressable>
  </View>
);

const AdminStatsScreen = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const numberFormatter = useMemo(() => new Intl.NumberFormat(), []);

  const formatNumber = useCallback(
    value => numberFormatter.format(Number(value) || 0),
    [numberFormatter],
  );

  const loadStats = useCallback(
    async ({refresh = false} = {}) => {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await adminService.getStats();
        setStats(response.data);
        setError(null);
      } catch (loadError) {
        setError(resolveErrorMessage(loadError));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleRefresh = useCallback(() => {
    loadStats({refresh: true});
  }, [loadStats]);

  if (loading && !stats) {
    return (
      <View style={styles.container}>
        <LoadingContainer text="Chargement des stats admin..." />
      </View>
    );
  }

  const overview = stats?.overview || {};
  const counts = overview.counts || {};
  const users = overview.users || {};
  const polling = stats?.polling || {};
  const crons = stats?.crons || {};
  const generatedAt = stats?.meta?.generatedAt;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.STEAM_BLUE}
          colors={[COLORS.STEAM_BLUE]}
        />
      }>
      <View style={styles.hero}>
        <Text style={styles.title}>Admin</Text>
        <Text style={styles.subtitle}>
          {generatedAt
            ? `Derniere mise a jour : ${formatDate(generatedAt)}`
            : 'Statistiques temps reel'}
        </Text>
      </View>

      {error && !stats ? (
        <ErrorState message={error} onRetry={() => loadStats()} />
      ) : null}

      {stats ? (
        <>
          <Section title="Vue globale">
            <View style={styles.grid}>
              {COUNT_METRICS.map(([key, label]) => (
                <StatCard
                  key={key}
                  label={label}
                  value={formatNumber(counts[key])}
                />
              ))}
              <StatCard
                label="Tokens push actifs"
                value={formatNumber(users.withFcmToken)}
              />
              <StatCard
                label="Suivis cumules"
                value={formatNumber(users.totalFollowedGames)}
              />
            </View>
          </Section>

          <Section title="Modes de suivi">
            <View style={styles.grid}>
              {getSortedEntries(users.libraryFollowMode).map(([key, value]) => (
                <StatCard
                  key={`library-${key}`}
                  label={`Bibliotheque - ${FOLLOW_MODE_LABELS[key] || key}`}
                  value={formatNumber(value)}
                />
              ))}
              {getSortedEntries(users.wishlistFollowMode).map(([key, value]) => (
                <StatCard
                  key={`wishlist-${key}`}
                  label={`Wishlist - ${FOLLOW_MODE_LABELS[key] || key}`}
                  value={formatNumber(value)}
                />
              ))}
            </View>
          </Section>

          <Section title="Polling news">
            <View style={styles.grid}>
              <StatCard
                label="Eligibles maintenant"
                value={formatNumber(polling.eligibleNow)}
              />
              <StatCard
                label="En attente"
                value={formatNumber(polling.pending)}
              />
            </View>

            <View style={styles.table}>
              {getSortedEntries(polling.byTier).map(([tier, tierStats], index) => (
                <View
                  key={tier}
                  style={[
                    styles.tableRow,
                    index === 0 ? styles.tableRowFirst : null,
                  ]}>
                  <Text style={styles.tableLabel}>
                    {TIER_LABELS[tier] || tier}
                  </Text>
                  <Text style={styles.tableValue}>
                    {formatNumber(tierStats.total)}
                  </Text>
                  <Text style={[styles.tableValue, styles.readyValue]}>
                    {formatNumber(tierStats.eligible)}
                  </Text>
                  <Text style={[styles.tableValue, styles.pendingValue]}>
                    {formatNumber(tierStats.pending)}
                  </Text>
                </View>
              ))}
            </View>
          </Section>

          <Section title="Crons">
            {crons.initialized && Array.isArray(crons.jobs) && crons.jobs.length > 0 ? (
              crons.jobs.map(job => (
                <View key={job.name} style={styles.cronCard}>
                  <View style={styles.cronHeader}>
                    <Text style={styles.cronName}>{job.name}</Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {job.lockedAt ? 'LOCK' : 'OK'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Prochain</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(job.nextRunAt)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Dernier</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(job.lastRunAt)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Fin</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(job.lastFinishedAt)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Echecs</Text>
                    <Text
                      style={[
                        styles.detailValue,
                        job.failCount > 0 ? styles.pendingValue : null,
                      ]}>
                      {formatNumber(job.failCount)}
                    </Text>
                  </View>
                  {job.failReason ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Raison</Text>
                      <Text style={styles.detailValue}>{job.failReason}</Text>
                    </View>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Agenda non initialise.</Text>
            )}
          </Section>
        </>
      ) : null}
    </ScrollView>
  );
};

export default AdminStatsScreen;

# Bugs feature suivi à deux niveaux [+][cloche] — APK 1.3.1 (versionCode 5)

Rapportés le 2026-06-12 sur device réel. Statut : à diagnostiquer en debug USB live.

## BUG-1 — L'animation de la cloche se déclenche au tap sur le +

**Repro** : jeu non suivi → tap sur le + → le + devient vert, la cloche reste
éteinte (couleur OK depuis 1.3.1) MAIS la cloche joue son animation
(wiggle/scale) comme si elle s'activait.

**Cause identifiée par lecture (confirmée)** : `FollowToggle.commitFollowChange`
appelle `animateActivationFeedback()` dans tous les cas de follow — or
`iconScale`/`iconRotate` ne sont appliqués QU'À l'icône de la cloche
(`iconAnimatedStyle` sur le bell). Un suivi silencieux (tap +) anime donc la
cloche à tort. Fix : ne déclencher cette animation que si la cloche devient
active (ou animer l'icône du bouton réellement tapé).

**Statut** : ✅ RÉSOLU (refonte FollowToggle — l'animation cloche ne se joue plus que si la cloche s'active).

## BUG-2 — Spam du + : la couleur ne suit plus / état incohérent

**Repro** : taps rapides répétés sur le + → parfois le bouton ne change pas de
couleur, état visuel désynchronisé.

**Hypothèse** : course entre `visualIsFollowed` (état local immédiat),
`derivedIsFollowed` (contexte, re-sync via useEffect) et la garde
`isFollowPending` qui rejette les taps pendant la mutation — le tap rejeté ne
revert pas l'état visuel déjà flippé ? À confirmer en live avec logs.

**Statut** : ✅ RÉSOLU (état visuel local + intention au tap : couleur instantanée et stable, plus de désync).

## BUG-3 — Popup « Une erreur inattendue s'est produite, voulez-vous vous déconnecter et réessayer ? »

**Repro** : apparu après une actualisation (pull-to-refresh ?) au milieu des
tests de spam. Message anxiogène, pas normal pour un hoquet.

**Hypothèse** : un échec dans le flux de refresh global (handleRefresh /
loadData) traité comme erreur de session. À identifier : quel appel a échoué
(401 après spam ? timeout ?) et pourquoi le message propose la déconnexion.

**Statut** : ✅ RÉSOLU (commit optimiste + persistance/synchro en arrière-plan : plus de timeout AsyncStorage, plus de popup d'erreur sous spam).

## BUG-4 — Actu → Jeux suivis (tri Récents) : la cloche n'apparaît pas sur certaines cards

**Repro** : dans le tri Récents, certaines cards n'affichent QUE le + (pas de
cloche). Intermittent (« des fois il ne s'affiche pas »).

**Hypothèse** : entrées followedGames créées localement (optimistes) sans champ
`notifications`/state complet ? Ou layout qui pousse la cloche hors de la card ?
À voir à l'écran + hiérarchie des vues.

**Statut** : ✅ probablement RÉSOLU (le re-render géant qui masquait/déplaçait les cards venait du moteur de refresh corrigé). À reconfirmer si ça réapparaît.

## BUG-5 — Notification push d'une VIEILLE news (du 6 juin) sur un jeu suivi à l'instant

**Repro** : jeu suivi il y a quelques minutes/heures → notification reçue pour
une news datée du 6 juin.

**Cause racine confirmée + VÉRIFIÉE sur données Mongo réelles** : ce n'était PAS
le cron mobile (une subscription fraîche est seedée `lastNewsTimestamp = now` dans
`subscriptionManager`, donc pas de backlog). C'était la surface **plugin
desktop** : `desktopToastService.getPendingDesktopToasts` toastait toute news du
feed sans `pushSentAt`/`steamToastSentAt`, sans regarder si elle est antérieure
au follow. Le seed silencieux (`desktopToastSeededAt`) est **global au user, pas
par-jeu** → re-suivre un jeu laisse son backlog non-seedé → vieille news toastée.

**Preuve (steamId 76561198158439485, jeu = HITMAN World of Assassination
`1659040`, PAS le Classic Trilogy `4716160`)** :
- re-follow `followedAt = 2026-06-12T22:40:17Z`
- news « Season of The Wizard » `date = 2026-06-06T03:55:09Z`
- `inFeedAt = 2026-06-12T22:41:06Z`, `steamToastSentAt = 2026-06-12T22:41:07Z`
→ news du 6 juin toastée le 12 juin, **50 s après le re-follow**. Le fix
(`followedAt 12/06 ≥ news 06/06 + 1s` → exclue) corrige exactement ce cas.

**Fix** : nouveau principe appliqué aux 2 surfaces de notif — **ne jamais
notifier une news publiée avant le follow du jeu** (`followedAt`), granularité
seconde (timestamps Steam).
- `desktopToastService` : exclut de `toToast` les news antérieures au follow
  (mais les **claim** quand même via `steamToastSentAt` → consommées en silence,
  pas de re-toast).
- `newsRotationService.sendNotificationsForGame` (parité, cas plus rare : news
  publiée entre 2 checks puis re-follow) : exclut les subscribers dont
  `followedAt` tombe dans une seconde strictement postérieure à la news.
- Helper `getFollowedAtByAppId(user)` dans `followedGamesHelpers`.

**Statut** : ✅ RÉSOLU (tests : 2 cas desktop + 1 cas cron ; 640 tests backend OK).

## BUG-6 — TOUJOURS PAS RÉGLÉ : les 2-3 premières cards en tri Récents ont des boutons morts

**Repro** : Actu → Jeux suivis → tri Récents → les 2-3 premières cards (les
jeux suivis le plus récemment) : tap sur cloche ou + → rien ne se passe.
Hier : restart app réparait. Le fix TTL 15s (1.3.1) n'a PAS réglé le problème
(ou pas entièrement) → la cause racine n'est probablement PAS (que)
`isFollowPending`.

**Pistes** : pending mutations persistées coincées pour ces jeux précis
(`pendingFollowStates`) ? Touches absorbées par un overlay ? items sans appId ?
C'est LE bug prioritaire à attraper en live.

**Statut** : ✅ RÉSOLU (cause = boucle de refresh + AsyncStorage saturé ; corrigé par stabilisation du focus + commit optimiste non-bloquant).

## BUG-7 — Toast in-app « Nouveaux jeux détectés : 250 nouveaux jeux ont été ajoutés à votre bibliothèque »

**Repro** : à l'ouverture de l'app (matin du 12/06). Faux : la bibliothèque n'a
pas 250 nouveaux jeux (2-3 tout au plus). Screenshot fourni.

**Hypothèse** : la baseline de comparaison a été perdue/réinitialisée quelque
part — soit le cache local mobile (diff local vs serveur), soit
`user.gameLibrary.games` côté backend (le sync aurait re-détecté toute la
bibliothèque comme « nouvelle »). À trancher avec les données Mongo + logs.

**Statut** : ✅ ÉLUCIDÉ (cache local vidé par le logout du popup d'erreur — BUG-3 ; baseline serveur intacte). Disparaît avec BUG-3.

## BUG-8 — Notification « nouveau jeu détecté » (follow_prompt) pour un jeu possédé depuis longtemps

**Repro** : notification push follow_prompt reçue le 12/06 pour un jeu présent
dans la bibliothèque depuis longtemps. Probablement le même root cause que
BUG-7 : si la baseline backend a sauté, le sync re-détecte les vieux jeux
comme nouveaux → prompts à tort (libraryFollowMode='prompt').

**VERDICT après vérif Mongo : ce n'était PAS un bug.** « King's Deck » =
appId **4661620**. Statut réel en base (steamId 76561198158439485) :
- **PAS dans `gameLibrary.games`** (ni owned ni family) → donc PAS « possédé
  depuis longtemps », contrairement à l'impression.
- **PAS sur la wishlist** (104 items, absent).
- Suivi le **2026-06-12T22:21:42Z** (notif=true), GameSubscription créée
  ~30 s après → suite logique d'un follow volontaire / d'un prompt légitime.

C'est un jeu **à venir / non possédé** (appId très récent). Le `follow_prompt`,
s'il a eu lieu, était **légitime** (détection wishlist/biblio au moment T, puis le
jeu a quitté la wishlist depuis). Aucun re-détection erronée d'un jeu possédé.
→ Reclassé **NON-BUG**. Confirmation possible via logs Railway (cf. liste).

**Hardening associé (gardé indépendamment)** : pendant l'enquête j'ai trouvé une
faille latente réelle (sans rapport avec King's Deck) — `GetOwnedGames` renvoie
`200 + []` quand le profil passe privé / sur un hoquet Steam, et le seul garde
était `Array.isArray`. Un `[]` aurait **détruit la baseline** (unfollow massif
via `detectRemovedGames`, rebuild vide, puis re-détection « nouveaux » → flood).
**Fix** ajouté dans `syncUserGames` : si 0 jeu renvoyé alors que la biblio en
comptait >0 → **skip** (pas de rebuild/unfollow/prompt, `lastChecked` non bumpé).
Faux positif impossible (on ne peut pas vider sa biblio possédée). Couvre le cas
catastrophique type BUG-7. Ne couvre PAS une réponse partielle non-vide (1 jeu
manquant) — non corrigé volontairement (pas de seuil arbitraire).

**Statut** : ✅ NON-BUG (King's Deck jamais possédé) + hardening anti-wipe livré.

---

## DÉCOUVERTE (12/06, setup debug) — Le téléphone était plein à 100%

`/data : 110 Go / 110 Go utilisés, 584 Mo libres` au moment des tests des bugs.
Un stockage saturé fait échouer/pendre les écritures AsyncStorage → suspect
sérieux pour BUG-6 (op locale pendue → boutons morts) et BUG-3 (erreur
inattendue au refresh). À confirmer : reproduire les bugs APRÈS libération
d'espace (2,8 Go libres maintenant). Si BUG-6 ne se reproduit plus, le TTL
15s + timeout 10s (déjà shippés en 1.3.1) restent la bonne défense — et
l'app devrait peut-être afficher un avertissement « stockage plein » plutôt
qu'un popup de déconnexion.

## Plan de diagnostic (debug USB live)

1. Téléphone branché USB + débogage USB activé → `adb devices`
2. Build DEBUG installé (`gradlew installDebug` + Metro via `adb reverse`) →
   logs JS complets en direct (`adb logcat`), rechargement rapide
3. Reproduire chaque bug dans l'ordre : BUG-6 (prioritaire), BUG-2, BUG-3,
   BUG-4, BUG-1 (cause déjà connue)
4. BUG-5 : vérifier côté backend (logs + dates en base), pas côté device

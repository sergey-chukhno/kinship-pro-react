# Plan d'Implémentation : Corrections de la Section "Mon réseau Kinship"

## Problèmes Identifiés

1. **Boutons hover non fonctionnels** : Les boutons "Se rattacher" et "Demander un partenariat" n'apparaissent pas au survol, mais le clic sur la carte ouvre un mauvais modal.
2. **Partenaires non affichés** : Quand la carte "Mes partenaires" est active, les cartes des partenaires ne s'affichent pas.
3. **Demandes de partenariats non affichées** : Quand l'onglet "Demandes de partenariats" est sélectionné, les cartes ne s'affichent pas.

## Solutions Proposées

### 1. Correction du Comportement Hover dans OrganizationCard

**Fichier** : `kinship-pro-react/src/components/Network/OrganizationCard.tsx`

**Changements** :
- Désactiver `onClick` sur la carte principale quand des boutons hover (`onAttach`, `onPartnership`, `onJoin`) sont présents.
- Modifier la condition `onClick` pour qu'elle ne soit définie que si aucun bouton hover n'est présent.

**Code** :
```typescript
// Dans OrganizationCard.tsx
const hasHoverActions = onAttach || onPartnership || (onJoin && !hideJoinButton);

return (
  <div 
    className="organization-card" 
    onClick={hasHoverActions ? undefined : onClick} 
    style={{ cursor: hasHoverActions ? 'default' : (onClick ? 'pointer' : 'default') }}
  >
    {/* ... reste du code ... */}
  </div>
);
```

### 2. Correction de la Condition de Rendu dans Network.tsx

**Fichier** : `kinship-pro-react/src/components/Pages/Network.tsx`

**Problème** : La condition de rendu à la ligne 2218 exclut l'affichage quand `activeCard` est défini, même pour les partenaires et les demandes.

**Solution** : Modifier la condition pour autoriser l'affichage dans les cas suivants :
- `selectedType === 'partnership-requests'`
- `selectedType === 'branch-requests'`
- `activeCard === 'partners'`
- `activeCard === 'branches'`

**Code** :
```typescript
// Ligne 2218 - Remplacer la condition actuelle par :
{!(isPersonalUser && selectedType === 'partner') && 
 !(isOrgDashboard && activeCard === 'members') && 
 (selectedType === 'search' || 
  selectedType === 'partnership-requests' || 
  selectedType === 'branch-requests' || 
  (isOrgDashboard && (activeCard === 'partners' || activeCard === 'branches')) || 
  !(isOrgDashboard && activeCard)) && (
  // ... affichage des cartes ...
)}
```

### 3. Affichage des Statuts sur les Cartes de Partenaires

**Fichier** : `kinship-pro-react/src/components/Pages/Network.tsx`

**Changements** :
- S'assurer que `partnersAsOrganizations` inclut tous les partenaires (confirmés + en attente).
- Vérifier que le statut est correctement mappé depuis les données de partenariat.
- Le statut doit être affiché sur la carte via `organization.status`.

**Vérification** :
- `partnersAsOrganizations` est construit à partir de `partnerships` (ligne ~1398).
- Il doit inclure les partenaires confirmés ET en attente.
- Le statut doit être déterminé par `partnership.status` (confirmed/pending).

### 4. Indicateurs Visuels pour Demandes Envoyées vs Reçues

**Fichier** : `kinship-pro-react/src/components/Pages/Network.tsx`

**Changements** :
- Pour les demandes de partenariats :
  - Ajouter un indicateur visuel (badge, icône, ou texte) pour distinguer les demandes envoyées des demandes reçues.
  - Utiliser la logique `isInitiator` déjà présente pour déterminer si c'est une demande envoyée.
  
- Pour les demandes de rattachement :
  - Ajouter un indicateur visuel similaire.
  - Utiliser `branchRequest.initiator` pour déterminer si c'est une demande envoyée.

**Code** :
```typescript
// Dans le rendu des demandes de partenariats (ligne ~2226)
{isInitiator ? (
  <span className="request-badge sent-badge">
    <i className="fas fa-paper-plane"></i> Demande envoyée
  </span>
) : (
  <span className="request-badge received-badge">
    <i className="fas fa-inbox"></i> Demande reçue
  </span>
)}

// Dans le rendu des demandes de rattachement (ligne ~2318)
{branchRequest.initiator === 'child' ? (
  <span className="request-badge sent-badge">
    <i className="fas fa-paper-plane"></i> Demande envoyée
  </span>
) : (
  <span className="request-badge received-badge">
    <i className="fas fa-inbox"></i> Demande reçue
  </span>
)}
```

### 5. Vérification de la Logique displayItems

**Fichier** : `kinship-pro-react/src/components/Pages/Network.tsx`

**Vérification** :
- `displayItems` doit correctement retourner `filteredPartners` quand `activeCard === 'partners'` (ligne 1671) ✓
- `displayItems` doit correctement retourner `filteredRequests` quand `selectedType === 'partnership-requests'` (ligne 1681) ✓
- `displayItems` doit correctement retourner `filteredBranchRequests` quand `selectedType === 'branch-requests'` (ligne 1685) ✓

**Action** : Aucune modification nécessaire, la logique est correcte.

## Ordre d'Implémentation

1. **Corriger OrganizationCard** : Désactiver onClick quand des boutons hover sont présents.
2. **Corriger la condition de rendu** : Autoriser l'affichage pour partenaires et demandes.
3. **Ajouter les indicateurs visuels** : Badges pour demandes envoyées/reçues.
4. **Vérifier l'affichage des statuts** : S'assurer que les statuts sont correctement affichés sur les cartes.

## Tests à Effectuer

1. ✅ Survoler une carte d'organisation → Les boutons hover doivent apparaître.
2. ✅ Cliquer sur une carte avec boutons hover → Rien ne doit se passer (pas de modal).
3. ✅ Cliquer sur un bouton hover → Le bon modal doit s'ouvrir.
4. ✅ Cliquer sur la carte "Mes partenaires" → Les cartes des partenaires doivent s'afficher.
5. ✅ Vérifier que les statuts "Confirmé" / "En attente" sont visibles sur les cartes de partenaires.
6. ✅ Cliquer sur l'onglet "Demandes de partenariats" → Les cartes doivent s'afficher avec indicateurs.
7. ✅ Cliquer sur l'onglet "Demandes de rattachement" → Les cartes doivent s'afficher avec indicateurs.

## Fichiers à Modifier

1. `kinship-pro-react/src/components/Network/OrganizationCard.tsx`
2. `kinship-pro-react/src/components/Pages/Network.tsx`
3. `kinship-pro-react/src/components/Network/OrganizationCard.css` (si nécessaire pour les badges)


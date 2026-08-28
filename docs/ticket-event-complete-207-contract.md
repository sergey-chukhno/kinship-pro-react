# Ticket front — Contrat de clôture d'événement (200 / 207)

**Statut :** figé avec Fatima (backend + front)  
**Backend :** garde amont `EVENT_ALREADY_CLOSED` (409) + shape 207 ci-dessous

## Contrat HTTP

| Situation | Status | Affichage |
|-----------|--------|-----------|
| Toutes les attributions réussies | **200** | Toast succès simple |
| Au moins une erreur d'attribution (y compris 0 succès) | **207** Multi-Status | **Obligatoire** : afficher le détail (comptes + liste) |
| Refus amont (déjà clos, liste vide, droits…) | **4xx** | Message d'erreur ordinaire — **jamais** 207 |

> Le 207 signifie « la clôture a eu lieu, mais des attributions ont échoué ».  
> Un 409 / 4xx amont signifie « rien n'a commencé ».

### Déjà clos (figé backend)

`POST …/events/:id/complete` sur un event `completed` ou `cancelled` → **409** :

```json
{
  "error": "Conflict",
  "code": "EVENT_ALREADY_CLOSED",
  "message": "Cet événement est déjà clos. Aucune attribution n'a été effectuée."
}
```

Pas d'insertions, pas de `finalize`, jamais 200/`already_assigned` ni 207 sur ce chemin.

## Shape JSON (207)

```json
{
  "message": "Clôture terminée avec des attributions en échec",
  "assigned_count": 17,
  "error_count": 3,
  "total_count": 20,
  "assignments": [ /* réussites uniquement */ ],
  "errors": [
    {
      "participant_id": 42,
      "badge_id": 7,
      "status": "failed",
      "code": "DUPLICATE_AWARD_TOO_SOON",
      "message": "…",
      "duplicate_of": 123
    }
  ],
  "event": { /* EventSerializer */ }
}
```

`total_count` = `assigned_count + error_count` (fourni tel quel, sans addition côté client).

Codes métier fréquents dans `errors[]` :
- `DUPLICATE_AWARD_TOO_SOON`
- `DUPLICATE_PAYLOAD_HASH`
- `AWARD_FAILED`, `VALIDATION_FAILED`, `NOT_A_PARTICIPANT`, …

## Règle client (figée)

1. Axios traite 207 comme succès HTTP (2xx) → brancher sur `response.status !== 200`, **pas** seulement le `catch`.
2. Si `error_count > 0` ou `status === 207` → **ne jamais** afficher « Événement clôturé avec succès » seul.
3. Afficher `assigned_count` / `error_count` / `total_count` + messages par participant.
4. Sur **409** `EVENT_ALREADY_CLOSED` → message d'erreur ordinaire (événement déjà clos).

## Fichiers touchés (ce lot)

- `src/components/Modals/EventDetailModal.tsx`
- `src/types/index.ts` (shape `errors`)
- éventuellement `src/api/Events.ts` si typage du retour

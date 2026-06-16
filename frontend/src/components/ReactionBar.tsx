import React, { useState } from 'react';
import { Box, Tooltip, ButtonBase } from '@mui/material';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { useToast } from '../hooks/useToast';

/** Reaction kinds, in display order. Must match the backend allow-list
 *  (`REACTION_KINDS` in `routes/ratings.rs`). */
export const REACTION_KINDS = ['like', 'love', 'fire', 'yum', 'mind', 'meh'] as const;
export type ReactionKind = (typeof REACTION_KINDS)[number];

const EMOJI: Record<ReactionKind, string> = {
  like: '👍',
  love: '❤️',
  fire: '🔥',
  yum: '😋',
  mind: '🤯',
  meh: '😐',
};

interface ServerRating {
  reactions?: Record<string, number>;
  my_reactions?: string[];
}

interface ReactionBarProps {
  ratingId: number;
  reactions?: Record<string, number>;
  myReactions?: string[];
  /** When false the bar is read-only (counts only, no toggling). */
  canReact?: boolean;
}

/**
 * Emoji reaction bar for a rating. Owns its own optimistic state seeded from
 * props, so a toggle feels instant; the server response (full reaction map) then
 * reconciles the counts. Errors revert and surface a toast.
 */
const ReactionBar: React.FC<ReactionBarProps> = ({
  ratingId,
  reactions = {},
  myReactions = [],
  canReact = true,
}) => {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [counts, setCounts] = useState<Record<string, number>>(reactions);
  const [mine, setMine] = useState<Set<string>>(new Set(myReactions));
  const [busy, setBusy] = useState(false);

  const toggle = async (kind: ReactionKind) => {
    if (!canReact || busy) return;
    const active = mine.has(kind);
    const prevCounts = counts;
    const prevMine = mine;

    // Optimistic: flip membership + nudge the count.
    const nextMine = new Set(mine);
    const nextCounts = { ...counts };
    if (active) {
      nextMine.delete(kind);
      nextCounts[kind] = Math.max(0, (nextCounts[kind] ?? 1) - 1);
    } else {
      nextMine.add(kind);
      nextCounts[kind] = (nextCounts[kind] ?? 0) + 1;
    }
    setMine(nextMine);
    setCounts(nextCounts);
    setBusy(true);

    try {
      const res = await api.request<ServerRating>({
        url: `ratings/${ratingId}/react/`,
        method: active ? 'delete' : 'post',
        data: { kind },
      });
      // Reconcile against the server's authoritative map (covers others' reactions).
      setCounts(res.data.reactions ?? {});
      setMine(new Set(res.data.my_reactions ?? []));
    } catch {
      setCounts(prevCounts);
      setMine(prevMine);
      notify({ message: t('community.reactionFailed'), severity: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
      {REACTION_KINDS.map((kind) => {
        const count = counts[kind] ?? 0;
        const active = mine.has(kind);
        // Hide zero-count reactions the viewer hasn't picked, to keep the bar tidy.
        if (count === 0 && !active && !canReact) return null;
        return (
          <Tooltip key={kind} title={t(`community.reactions.${kind}`)} arrow>
            <ButtonBase
              onClick={() => toggle(kind)}
              disabled={!canReact}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 0.9,
                py: 0.3,
                borderRadius: 5,
                fontSize: '0.95rem',
                lineHeight: 1,
                border: '1px solid',
                borderColor: active ? 'primary.main' : 'divider',
                bgcolor: active ? 'primary.main' : 'transparent',
                color: active ? 'primary.contrastText' : 'text.secondary',
                opacity: count === 0 && !active ? 0.55 : 1,
                transition: 'all 0.15s ease',
                cursor: canReact ? 'pointer' : 'default',
                '&:hover': canReact
                  ? {
                      borderColor: 'primary.main',
                      bgcolor: active ? 'primary.dark' : 'action.hover',
                    }
                  : undefined,
              }}
            >
              <span>{EMOJI[kind]}</span>
              {count > 0 && (
                <Box component="span" sx={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  {count}
                </Box>
              )}
            </ButtonBase>
          </Tooltip>
        );
      })}
    </Box>
  );
};

export default ReactionBar;

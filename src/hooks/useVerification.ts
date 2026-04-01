import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { VerificationSummary, GameVerificationResult } from '../types';

export function useVerification() {
  const [loading, setLoading] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [summary, setSummary] = useState<VerificationSummary | null>(null);
  const [brokenGames, setBrokenGames] = useState<GameVerificationResult[]>([]);

  const verifyAll = useCallback(async () => {
    setLoading(true);
    try {
      const result = await invoke<VerificationSummary>('verify_all_games');
      setSummary(result);
      setBrokenGames(result.results);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifySystem = useCallback(async (systemId: string) => {
    setLoading(true);
    try {
      const result = await invoke<VerificationSummary>('verify_system_games', {
        systemId,
      });
      setSummary(result);
      setBrokenGames(result.results);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  const getBrokenGames = useCallback(async () => {
    const result = await invoke<GameVerificationResult[]>('get_broken_games');
    setBrokenGames(result);
    return result;
  }, []);

  /** Test-launch a single game with its emulator.
   *  The emulator runs for up to `timeoutSecs` (default 5).
   *  If it crashes the game is marked LaunchFailed. */
  const testLaunchGame = useCallback(async (gameId: string, timeoutSecs?: number) => {
    setTestingId(gameId);
    try {
      const result = await invoke<GameVerificationResult>('test_launch_game', {
        gameId,
        timeoutSecs: timeoutSecs ?? 5,
      });
      // Update the broken-games list with the new result
      if (result.status !== 'ok') {
        setBrokenGames(prev => {
          const idx = prev.findIndex(g => g.game_id === gameId);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = result;
            return next;
          }
          return [...prev, result];
        });
      } else {
        // Remove from broken list if it now passes
        setBrokenGames(prev => prev.filter(g => g.game_id !== gameId));
      }
      return result;
    } finally {
      setTestingId(null);
    }
  }, []);

  const deleteGame = useCallback(async (gameId: string, deleteFile: boolean) => {
    const result = await invoke<string>('delete_broken_game', {
      gameId,
      deleteFile,
    });
    setBrokenGames(prev => prev.filter(g => g.game_id !== gameId));
    return result;
  }, []);

  const deleteGames = useCallback(async (gameIds: string[], deleteFiles: boolean) => {
    const result = await invoke<string>('delete_broken_games', {
      gameIds,
      deleteFiles,
    });
    setBrokenGames(prev => prev.filter(g => !gameIds.includes(g.game_id)));
    return result;
  }, []);

  return {
    loading,
    testingId,
    summary,
    brokenGames,
    verifyAll,
    verifySystem,
    testLaunchGame,
    getBrokenGames,
    deleteGame,
    deleteGames,
  };
}

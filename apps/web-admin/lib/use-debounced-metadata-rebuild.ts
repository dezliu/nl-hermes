'use client';

import { useCallback, useEffect, useRef } from 'react';
import { message } from 'antd';
import { ragApi } from './api';

const DEBOUNCE_MS = 3000;

export function useDebouncedMetadataRebuild() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef(false);

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!pendingRef.current) return;
    pendingRef.current = false;
    try {
      await ragApi.rebuildIndex('metadata');
      message.info('metadata 向量索引已重建');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '索引重建失败');
    }
  }, []);

  const scheduleRebuild = useCallback(() => {
    pendingRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void flush();
    }, DEBOUNCE_MS);
  }, [flush]);

  const rebuildNow = useCallback(async () => {
    pendingRef.current = true;
    await flush();
  }, [flush]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { scheduleRebuild, rebuildNow };
}

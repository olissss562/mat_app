import { create } from 'zustand';
import { loadAllConfigs, type ConfigLoadResult } from '../lib/configLoader';

interface ConfigState extends ConfigLoadResult {
  loading: boolean;
  loaded: boolean;
  reload: () => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set) => ({
  subjects: [],
  invalid: [],
  questionIndex: new Map(),
  loading: false,
  loaded: false,
  reload: async () => {
    set({ loading: true });
    const result = await loadAllConfigs();
    set({ ...result, loading: false, loaded: true });
  },
}));

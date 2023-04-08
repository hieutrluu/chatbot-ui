import { KeyValuePair } from './data';

export interface Plugin {
  id: PluginID;
  name: PluginName;
  required_keys: KeyValuePair[];
}

export interface PluginKey {
  pluginId: PluginID;
  required_keys: KeyValuePair[];
}

export enum PluginID {
  GOOGLE_SEARCH = 'google-search',
}

export enum PluginName {
  GOOGLE_SEARCH = 'Google Search',
}

export const Plugins: Record<PluginID, Plugin> = {
  [PluginID.GOOGLE_SEARCH]: {
    id: PluginID.GOOGLE_SEARCH,
    name: PluginName.GOOGLE_SEARCH,
    required_keys: [
      {
        key: 'GOOGLE_API_KEY',
        value: '',
      },
      {
        key: 'GOOGLE_CSE_ID',
        value: '',
      },
    ],
  },
};

export const PluginList = Object.values(Plugins);

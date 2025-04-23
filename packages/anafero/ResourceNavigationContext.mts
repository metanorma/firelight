import { createContext } from 'react';


export const ResourceNavigationContext = createContext({
  locateResource: (uri: string): string => '',
  resolvePlainTitle: async (uri: string, signal?: AbortSignal): Promise<string> => uri,
  requestedResourceURI: undefined as string | undefined,
});

import { cosmiconfig } from 'cosmiconfig';
import YAML from 'yaml';
import { defaultConfig } from './defaultConfig.ts';
import type { Config, LLMConfig } from '../types/index.ts';

function resolveEnvVars(value: any): any {
  if (typeof value === 'string') {
    const envVarPattern = /^\$\{([^:}]+)(?::-)?(.*)\}$/;
    const match = value.match(envVarPattern);
    if (match) {
      const varName = match[1];
      const defaultValue = match[2] || '';
      return process.env[varName] || defaultValue;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(resolveEnvVars);
  }
  if (value && typeof value === 'object') {
    const resolved: any = {};
    for (const key in value) {
      resolved[key] = resolveEnvVars(value[key]);
    }
    return resolved;
  }
  return value;
}

function resolveConfigEnvVars(config: Config): Config {
  const llm = resolveEnvVars(config.llm) as LLMConfig & { fallbacks?: any[] };
  return {
    ...config,
    llm: {
      ...llm,
      fallbacks: llm.fallbacks?.map(resolveEnvVars),
    },
  };
}

export async function loadConfig(): Promise<Config> {
  const explorer = cosmiconfig('wiki', {
    searchPlaces: [
      'package.json',
      '.wikirc',
      '.wikirc.json',
      '.wikirc.yaml',
      '.wikirc.yml',
      '.wikirc.js',
      '.wikirc.cjs',
      'wiki.config.js',
      'wiki.config.cjs',
    ],
    loaders: {
      '.yaml': (filePath, content) => YAML.parse(content),
      '.yml': (filePath, content) => YAML.parse(content),
      noExt: (filePath, content) => YAML.parse(content),
    },
  });

  try {
    const result = await explorer.search();
    if (result && !result.isEmpty) {
      const mergedConfig = {
        ...defaultConfig,
        ...result.config,
        llm: {
          ...defaultConfig.llm,
          ...result.config?.llm,
        },
        paths: {
          ...defaultConfig.paths,
          ...result.config?.paths,
        },
      };
      return resolveConfigEnvVars(mergedConfig);
    }
  } catch (error) {
    console.warn('Failed to load cosmiconfig, using defaults.', error);
  }
  return defaultConfig;
}

export const APP_VERSION = '0.1.2';

export interface WikiResponse<T = any> {
  command: string;
  version: string;
  timestamp: string;
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  warnings?: string[];
  meta?: Record<string, unknown>;
}

export function createSuccessResponse<T>(command: string, data: T, meta?: Record<string, unknown>): WikiResponse<T> {
  return {
    command,
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    success: true,
    data,
    meta
  };
}

export function createErrorResponse(command: string, code: string, message: string, details?: Record<string, unknown>): WikiResponse {
  return {
    command,
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    success: false,
    data: null,
    error: { code, message, details }
  };
}

export function formatOutput(data: any, format: string = 'text'): string {
  switch (format) {
    case 'json':
      return JSON.stringify(data, null, 2);
    case 'yaml':
      return toYaml(data);
    case 'text':
    default:
      return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  }
}

function toYaml(obj: any, indent: number = 0): string {
  const spaces = '  '.repeat(indent);
  if (obj === null) return 'null\n';
  if (obj === undefined) return '';
  if (typeof obj === 'boolean' || typeof obj === 'number') return `${obj}\n`;
  if (typeof obj === 'string') return obj.includes('\n') ? `|\n${obj.split('\n').map((l: string) => spaces + '  ' + l).join('\n')}` : `${obj}\n`;
  
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]\n';
    return obj.map(item => `${spaces}- ${toYaml(item, indent + 1).trimStart()}`).join('\n');
  }
  
  if (typeof obj === 'object') {
    const entries = Object.entries(obj);
    if (entries.length === 0) return '{}\n';
    return entries.map(([key, value]) => `${spaces}${key}: ${toYaml(value, indent + 1).trimStart()}`).join('\n');
  }
  
  return `${obj}\n`;
}
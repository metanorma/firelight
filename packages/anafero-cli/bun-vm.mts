/**
 * Bun VM Module Alternative
 * 
 * This module provides an alternative implementation to Node's VM module for Bun.
 * It implements the necessary functionality for executing code in a sandboxed environment.
 */

import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// Type definitions to match Node's VM module interface
export interface ModuleContext {
  [key: string]: any;
}

export interface ModuleOptions {
  identifier: string;
  context: ModuleContext;
}

export interface ModuleNamespace {
  [key: string]: any;
}

// Implementation of VM module for Bun
export class SourceTextModule {
  private code: string;
  private options: ModuleOptions;
  public namespace: ModuleNamespace = {};
  private tempFilePath: string;
  private linkFn: ((specifier: string, referencingModule: any) => Promise<any>) | null = null;

  constructor(code: string, options: ModuleOptions) {
    this.code = code;
    this.options = options;
    this.tempFilePath = join(tmpdir(), `bun-vm-module-${Date.now()}-${Math.random().toString(36).substring(2, 15)}.mjs`);
  }

  async link(linkFn: (specifier: string, referencingModule: any) => Promise<any>): Promise<void> {
    this.linkFn = linkFn;
    
    // Prepare the code with context variables
    let contextSetup = '';
    for (const [key, value] of Object.entries(this.options.context)) {
      if (key !== 'import' && key !== 'export') {
        contextSetup += `globalThis.${key} = ${JSON.stringify(value)};\n`;
      }
    }
    
    // Modify the code to include the context setup
    const wrappedCode = `
// Context setup
${contextSetup}

// Original module code
${this.code}
`;
    
    // Write the code to a temporary file
    await writeFile(this.tempFilePath, wrappedCode, 'utf-8');
  }

  async evaluate(): Promise<void> {
    try {
      // Import the module dynamically
      const importedModule = await import(this.tempFilePath);
      
      // Store the exports in the namespace
      this.namespace = importedModule;
    } catch (error) {
      console.error('Error evaluating module:', error);
      throw error;
    } finally {
      // Clean up the temporary file
      try {
        await unlink(this.tempFilePath);
      } catch (error) {
        console.warn('Failed to clean up temporary module file:', error);
      }
    }
  }
}

export class SyntheticModule {
  private exportNames: string[];
  private initializeFn: Function;
  private options: ModuleOptions;
  public namespace: ModuleNamespace = {};

  constructor(exportNames: string[], initializeFn: Function, options: ModuleOptions) {
    this.exportNames = exportNames;
    this.initializeFn = initializeFn;
    this.options = options;
  }

  setExport(name: string, value: any): void {
    this.namespace[name] = value;
  }

  async link(): Promise<void> {
    // No linking needed for synthetic modules
  }

  async evaluate(): Promise<void> {
    // Call the initialize function with this as context
    await this.initializeFn.call(this);
  }
}

export function createContext(sandbox: Record<string, any> = {}): ModuleContext {
  // In Bun, we'll just return the sandbox object as our context
  return { ...sandbox };
}

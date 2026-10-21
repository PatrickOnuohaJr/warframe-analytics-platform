import { registerHooks } from 'node:module';

// Vite resolves extensionless local imports; use the same resolution for
// existing domain utilities in the dependency-free Node test runner.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (error.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.')) throw error;
      return nextResolve(`${specifier}.js`, context);
    }
  },
});

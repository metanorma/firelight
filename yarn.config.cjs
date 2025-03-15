// @ts-check

/** @type {import('@yarnpkg/types')} */
const { defineConfig } = require(`@yarnpkg/types`);

/**
 * This rule will enforce that a workspace MUST depend on the same version of
 * a dependency as the one used by the other workspaces.
 *
 * @param {Context} context
 */
function enforceConsistentDependencyVersionsAcrossTheProject({Yarn}) {
  for (const dependency of Yarn.dependencies()) {
    if (dependency.type === `peerDependencies`)
      continue;

    for (const otherDependency of Yarn.dependencies({ident: dependency.ident})) {
      if (otherDependency.type === `peerDependencies`)
        continue;

      dependency.update(otherDependency.range);
    }
  }
}

// Credit: https://github.com/yarnpkg/berry/issues/4688#issuecomment-2726079576
function detectDuplicates({Yarn}) {
  // Force consistent dependency versions of all dependencies and devDependencies
  for (const dependency of Yarn.dependencies()) {
    for (const otherDependency of Yarn.dependencies({
      ident: dependency.ident,
    })) {
      dependency.update(otherDependency.range);
    }
  }

  // Whitelist deps we don't mind having multiple instances
  const ignoreDeps = ['debug', 'isomorphic-ws', /^@babel/, /^@types/];
  // Force all dependencies to be singletons
  const inverseDepTree = new Map();
  const walked = new Set();
  for (const dependency of Yarn.dependencies()) {
    // We don't consider duplicate dev dependencies to be an issue; only multiple instances
    // of regular or peer dependencies cause problems
    if (dependency.type === 'devDependencies') {
      continue;
    }
    // Can't do much if the dependency failed to resolve
    if (!dependency.resolution) {
      continue;
    }
    const inverseDepNode = package => {
      const existing = inverseDepTree.get(package.ident);
      if (existing) {
        return existing;
      }
      const result = {
        dependents: new Map(),
        workspace: dependency.workspace,
        package,
      };
      inverseDepTree.set(package.ident, result);
      return result;
    };

    const walk = package => {
      if (walked.has(package.ident)) {
        return;
      }
      walked.add(package.ident);
      for (const depPkg of package.dependencies.values()) {
        // Don't register a dependency for this purpose if it's a peer dependency.  Only direct
        // dependencies cause problems
        if (
          package.peerDependencies.has(depPkg.ident) ||
          package.optionalPeerDependencies.has(depPkg.ident)
        ) {
          continue;
        }
        if (
          depPkg.peerDependencies.size &&
          !ignoreDeps.some(pattern =>
            typeof pattern === 'string'
              ? depPkg.ident === pattern
              : pattern instanceof RegExp
                ? pattern.test(depPkg.ident)
                : false,
          )
        ) {
          const node = inverseDepNode(depPkg);
          node.dependents.set(package.ident, package);
        }
        walk(depPkg);
      }
    };

    walk(dependency.resolution);
  }

  for (const { package, dependents, workspace } of inverseDepTree.values()) {
    if (dependents.size > 1) {
      const peerDeps = [...new Set([...package.peerDependencies.keys()])].map(
        peerDep => ({
          ident: peerDep,
          providedVersions: new Map(),
        }),
      );
      for (const dependent of dependents.values()) {
        for (const { ident, providedVersions } of peerDeps) {
          const providedVersion =
            dependent.dependencies.get(ident)?.version ||
            dependent.peerDependencies.get(ident) ||
            dependent.optionalPeerDependencies.get(ident) ||
            (dependent.ident === ident
              ? dependent.version
              : null);
          const versionProviders = providedVersions.get(
            providedVersion || 'none',
          );
          const dependentId = `${dependent.ident}@${dependent.version}`;
          if (!versionProviders) {
            providedVersions.set(
              providedVersion || 'none',
              new Set([dependentId]),
            );
          } else {
            versionProviders.add(dependentId);
          }
        }
      }
      for (const peerDep of peerDeps) {
        if (peerDep.providedVersions.size > 1) {
          const examples = [...peerDep.providedVersions.entries()]
            .map(
              ([version, providers]) =>
                `${version || 'none'} is provided by ${[...providers].slice(0, 3).join(', ')}`,
            )
            .join(', ');
          workspace.error(
            `Package ${package.ident} has peer dependency ${peerDep.ident} satisfied in multiple ways, which can lead to multiple virtual instances; for example ${examples}.  Run "yarn info --all --dependents --virtuals --recursive ${package.ident}" for details.`,
          );
        }
      }
    }
  }
}

module.exports = defineConfig({
  constraints: async ctx => {
    enforceConsistentDependencyVersionsAcrossTheProject(ctx);
    detectDuplicates(ctx);
  },
});

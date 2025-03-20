import lunr from 'lunr';

declare global {
  namespace lunr {
    interface TokenSet {
      _str: string;
      final: boolean;
      edges: Record<string, lunr.TokenSet>;
      id: number;
    }
  }
}

/**
 * This fixes an occasional, difficult to reproduce search crash.
 *
 * Should be applied early, before loading index etc.
 *
 * Patched implementation should be blazing fast, because it’s run
 * a LOT of times on index load.
 *
 * - https://github.com/olivernn/lunr.js/issues/279#issuecomment-2539409162
 * - https://github.com/olivernn/lunr.js/issues/503
 */
export default function patchLunr() {
  lunr.TokenSet.prototype.toString = function () {
    if (this._str) {
      return this._str;
    }
  
    let str = this.final ? '1' : '0',
      labels = Object.keys(this.edges).sort(),
      len = labels.length;
  
    for (var i = 0; i < len; i++) {
      let label = labels[i], node = label ? this.edges[label] : undefined;
      if (node) {
        str = str + ', L(' + label + ')I(' + node.id + ')';
      }
    }
  
    return str;
  };
};

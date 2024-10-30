interface URI {
  protocol?: string | undefined
  slashes?: string | undefined
  authority?: string | undefined
  host?: string | undefined
  port?: string | undefined
  path?: string | undefined
  query?: string | undefined
  hash?: string | undefined
}
export default function makeURI(input: string): URI {
  //if (!(this instanceof URI)) {
  //  return new URI(input);
  //}

  const match = ( '' + input ).match(pattern)

  if( !match ) { throw new SyntaxError( 'Invalid URI' ) }

  return {
    protocol  : match[1],
    slashes   : match[2],
    authority : match[3],
    host      : match[4],
    port      : match[5],
    path      : match[6] || match[7] || match[8],
    query     : match[9],
    hash      : match[10],
  };
}
// TODO: Implement URI as template literal type
export function isURIString(input: string): boolean {
  return ['urn:', 'http:', 'https:', 'ftp:', 'file:'].
    find(prefix => input.startsWith(prefix)) !== undefined;
  if (input.startsWith('urn:')) {
    return true;
  }
  try {
    makeURI(input);
    return true;
  } catch (e) {
    return false;
  }
}

const pattern = new RegExp( "([A-Za-z][A-Za-z0-9+\\-.]{2,6}):(?:(//)(?:((?:[A-Za-z0-9\\-._~!$&'()*+,;=:]|%[0-9A-Fa-f]{2})*)@)?((?:\\[(?:(?:(?:(?:[0-9A-Fa-f]{1,4}:){6}|::(?:[0-9A-Fa-f]{1,4}:){5}|(?:[0-9A-Fa-f]{1,4})?::(?:[0-9A-Fa-f]{1,4}:){4}|(?:(?:[0-9A-Fa-f]{1,4}:){0,1}[0-9A-Fa-f]{1,4})?::(?:[0-9A-Fa-f]{1,4}:){3}|(?:(?:[0-9A-Fa-f]{1,4}:){0,2}[0-9A-Fa-f]{1,4})?::(?:[0-9A-Fa-f]{1,4}:){2}|(?:(?:[0-9A-Fa-f]{1,4}:){0,3}[0-9A-Fa-f]{1,4})?::[0-9A-Fa-f]{1,4}:|(?:(?:[0-9A-Fa-f]{1,4}:){0,4}[0-9A-Fa-f]{1,4})?::)(?:[0-9A-Fa-f]{1,4}:[0-9A-Fa-f]{1,4}|(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))|(?:(?:[0-9A-Fa-f]{1,4}:){0,5}[0-9A-Fa-f]{1,4})?::[0-9A-Fa-f]{1,4}|(?:(?:[0-9A-Fa-f]{1,4}:){0,6}[0-9A-Fa-f]{1,4})?::)|[Vv][0-9A-Fa-f]+\\.[A-Za-z0-9\\-._~!$&'()*+,;=:]+)\\]|(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)|(?:[A-Za-z0-9\\-._~!$&'()*+,;=]|%[0-9A-Fa-f]{2})*))(?::([0-9]*))?((?:/(?:[A-Za-z0-9\\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})*)*)|/((?:(?:[A-Za-z0-9\\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})+(?:/(?:[A-Za-z0-9\\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})*)*)?)|((?:[A-Za-z0-9\\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})+(?:/(?:[A-Za-z0-9\\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})*)*)|)(?:\\?((?:[A-Za-z0-9\\-._~!$&'()*+,;=:@/?]|%[0-9A-Fa-f]{2})*))?(?:\\#((?:[A-Za-z0-9\\-._~!$&'()*+,;=:@/?]|%[0-9A-Fa-f]{2})*))?" );
/**
 * # RFC-3986 URI component:  URI
 * # from: http://jmrware.com/articles/2009/uri_regexp/URI_regex.html
 * # modifications:
 * #  - added capture groups
 * ([A-Za-z][A-Za-z0-9+\-.]*) :                                      # scheme ":"
 * (?: (//)                                                          # hier-part
 *   (?: ((?:[A-Za-z0-9\-._~!$&'()*+,;=:]|%[0-9A-Fa-f]{2})*) @)?
 *   ((?:
 *     \[
 *     (?:
 *       (?:
 *         (?:                                                    (?:[0-9A-Fa-f]{1,4}:){6}
 *         |                                                   :: (?:[0-9A-Fa-f]{1,4}:){5}
 *         | (?:                            [0-9A-Fa-f]{1,4})? :: (?:[0-9A-Fa-f]{1,4}:){4}
 *         | (?: (?:[0-9A-Fa-f]{1,4}:){0,1} [0-9A-Fa-f]{1,4})? :: (?:[0-9A-Fa-f]{1,4}:){3}
 *         | (?: (?:[0-9A-Fa-f]{1,4}:){0,2} [0-9A-Fa-f]{1,4})? :: (?:[0-9A-Fa-f]{1,4}:){2}
 *         | (?: (?:[0-9A-Fa-f]{1,4}:){0,3} [0-9A-Fa-f]{1,4})? ::    [0-9A-Fa-f]{1,4}:
 *         | (?: (?:[0-9A-Fa-f]{1,4}:){0,4} [0-9A-Fa-f]{1,4})? ::
 *         ) (?:
 *             [0-9A-Fa-f]{1,4} : [0-9A-Fa-f]{1,4}
 *           | (?: (?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?) \.){3}
 *                 (?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)
 *           )
 *       |   (?: (?:[0-9A-Fa-f]{1,4}:){0,5} [0-9A-Fa-f]{1,4})? ::    [0-9A-Fa-f]{1,4}
 *       |   (?: (?:[0-9A-Fa-f]{1,4}:){0,6} [0-9A-Fa-f]{1,4})? ::
 *       )
 *     | [Vv][0-9A-Fa-f]+\.[A-Za-z0-9\-._~!$&'()*+,;=:]+
 *     )
 *     \]
 *   | (?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}
 *        (?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)
 *   | (?:[A-Za-z0-9\-._~!$&'()*+,;=]|%[0-9A-Fa-f]{2})*
 *   ))
 *   (?: : ([0-9]*) )?
 *   ((?:/ (?:[A-Za-z0-9\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})* )*)
 * | /
 *   ((?:    (?:[A-Za-z0-9\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})+
 *     (?:/ (?:[A-Za-z0-9\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})* )*
 *   )?)
 * |        ((?:[A-Za-z0-9\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})+
 *     (?:/ (?:[A-Za-z0-9\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})* )*)
 * |
 * )
 * (?:\? ((?:[A-Za-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9A-Fa-f]{2})*) )?   # [ "?" query ]
 * (?:\# ((?:[A-Za-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9A-Fa-f]{2})*) )?   # [ "#" fragment ]
 */

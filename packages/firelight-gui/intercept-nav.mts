/**
 * Based on https://github.com/wesleytodd/intercept-link-clicks,
 * modified for compatibility with TypeScript & to avoid relying
 * on global window object before it’s called.
 *
 * Original:
 *
 * Copyright (c) 2015-2019, Wes Todd <wes@wesleytodd.com>
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
 * SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
 * OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
 * CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */
interface Opts {
    modifierKeys  ?: boolean | undefined
    download      ?: boolean | undefined
    target        ?: boolean | undefined
    hash          ?: boolean | undefined
    mailTo        ?: boolean | undefined
    sameOrigin    ?: boolean | undefined
    shadowDom     ?: boolean | undefined
    checkExternal ?: boolean | undefined
}
type Callback = (evt: MouseEvent | KeyboardEvent, el: Element) => void

/**
 * Intercepts clicks on a given element
 */
const Interceptor = function interceptClicks (el: Element | Window | Callback | Opts, opts: Opts | Callback, cb: Opts | Callback) {
  // Options and element are optional
  if (typeof el === 'function') {
    cb = el
    opts = {}
    el = window
  } else if (typeof opts === 'function') {
    cb = opts
    opts = {}
    // Duck-typing here because you can bind events to the window just fine
    // also, it might be good to bind to synthetic objects
    // to be able to mimic dom events
    if (typeof (el as Element).addEventListener !== 'function') {
      opts = el as Opts
      el = window
    }
  }
  el = el as Element | Window

  // cb and el are required
  if (typeof cb !== 'function' || !el) {
    return
  }

  // Create click callback
  var clickCb = Interceptor.onClick(opts, cb)

  if (clickCb) {
    // Bind the event
    el.addEventListener('click', clickCb, false)

    // Returns the off function
    return function () {
      if (clickCb) {
        el.removeEventListener('click', clickCb, false)
      }
    }
  }
  throw new Error("Failed to instantiate interceptor");
  //return;
}

/**
 * On click handler that intercepts clicks based on options
 *
 * @function onClick
 * @param {Event} e
 */
Interceptor.onClick = function (opts: Opts | Callback, cb?: Callback | undefined): EventListenerOrEventListenerObject | undefined {
  // Options are optional
  if (typeof opts === 'function') {
    cb = opts as Callback
    opts = {} as Opts
  }

  // cb is required and must be a function
  if (typeof cb !== 'function') {
    return
  }

  opts = opts as Opts

  // Default options to true
  ([
    'modifierKeys',
    'download',
    'target',
    'hash',
    'mailTo',
    'sameOrigin',
    'shadowDom'
  ] as (keyof Opts)[]).forEach(function (key) {
    opts[key] = typeof opts[key] !== 'undefined' ? opts[key] : true
  })

  /**
   * Internal request
   */
  const isInternal = new RegExp('^(?:(?:http[s]?:)?//' + window.location.host.replace(/\./g, '\\.') + ')?(?:/[^/]|#|(?!(?:http[s]?:)?//).*$)', 'i')
  const sameOrigin = function checkSameOrigin (url: string) {
    return !!isInternal.test(url)
  }

  // Return the event handler
  return function (_e: Event) {
    // Cross browser event
    const e = (_e || window.event) as (MouseEvent | KeyboardEvent)

    // Check if we are a click we should ignore
    if (opts.modifierKeys && (Interceptor.which(e) !== 1 || e.metaKey || e.ctrlKey || e.shiftKey || e.defaultPrevented)) {
      return
    }

    // Find link up the dom tree
    var el = e.target ? Interceptor.isLink(e.target as Element) : undefined;

    // Support for links in shadow dom
    if (opts.shadowDom && !el && e.composedPath) {
      el = Interceptor.isLink(e.composedPath()[0] as Element)
    }

    //
    // Ignore if tag has
    //

    // 1. Not a link
    if (!el) {
      return
    }

    // 2. "download" attribute
    if (opts.download && el.getAttribute('download') !== null) {
      return
    }

    // 3. rel="external" attribute
    if (opts.checkExternal && el.getAttribute('rel') === 'external') {
      return
    }

    // 4. target attribute
    if (opts.target && (el.target && el.target !== '_self')) {
      return
    }

    // Get the link href
    var link = el.getAttribute('href')

    // ensure this is not a hash for the same path
    if (opts.hash && el.pathname === window.location.pathname && (el.hash || link === '#')) {
      return
    }

    // Check for mailto: in the href
    if (opts.mailTo && link && link.indexOf('mailto:') > -1) {
      return
    }

    // Only for same origin
    if (opts.sameOrigin && link && !sameOrigin(link)) {
      return
    }

    // All tests passed, intercept the link
    cb(e, el)
  }
}

Interceptor.isLink = function (el: Node): HTMLAnchorElement | undefined {
  let _el: Element | Node | undefined = el;
  while (_el && _el.nodeName !== 'A') {
    _el = _el.parentNode ?? undefined
  }
  if (!_el || _el.nodeName !== 'A') {
    return
  }
  return _el as HTMLAnchorElement
}

/**
 * Get the pressed button
 */
Interceptor.which = function (e: MouseEvent | KeyboardEvent) {
  return e.which === null ? (e as MouseEvent).button : e.which
}

export default Interceptor;

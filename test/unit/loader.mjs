import path from 'path';

import { Provider } from '@dc/settings';
import { Loader, Storage } from '@dc/yui-loader';

let loader;

/**
 * Initialize the YUI loader
 */
async function initialize() {
    if ( loader ) {
        return;
    }

    // load settings from ./config including environment variables
    // and a specific context for the test runner
    const settings = await Provider(
        path.join( process.cwd(), 'config' ),
        process.env.NODE_ENV || 'development',
        process.env,
        { component: 'test-runner', affinity: process.env.MOJITO_AFFINITY || 'server' }
    );

    loader = new Loader( new Storage(settings), settings );
}

/**
 * Return the resolved file URL for a given module specifier and parent URL
 *
 * @param {string} specifier
 * @param {object} context
 * @param {Function} fallback
 * @see https://nodejs.org/api/esm.html#esm_resolve_specifier_context_defaultresolve
 */
export async function resolve( specifier, context, fallback ) {
    await initialize();

    if (!global.Y) {
        loader.reset();
    }

    return await loader.resolve( specifier, context, fallback );
}

/**
 * Determine how a URL should be interpreted
 *
 * @param {string} url
 * @param {object} context
 * @param {Function} fallback
 * @see https://nodejs.org/api/esm.html#esm_getformat_url_context_defaultgetformat
 */
export async function getFormat( url, context, fallback ) {
    await initialize();
    return await loader.getFormat( url, context, fallback );
}

/**
 * Retrieve the source code of an ES module specifier
 *
 * @param {string} url
 * @param {object} context
 * @param {Function} fallback
 * @see https://nodejs.org/api/esm.html#esm_getsource_url_context_defaultgetsource
 */
export async function getSource( url, context, fallback ) {
    await initialize();

    return await loader.getSource( url, context, fallback );
}

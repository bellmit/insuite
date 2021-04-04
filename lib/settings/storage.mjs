import assert from 'assert';
import path from 'path';
import url from 'url';

import core from 'dc-core';

import { Dictionary } from '@dc/settings';
import { Filesystem } from './providers.mjs';

/**
 * Global interface for settings queries
 *
 * The default context will be always available and is fetched only from the filesystem. Policies for access control have to be implemented by facades (e.g. APIs for clients).
 */
export class Storage {

    /**
     * Cache for the different contexts
     *
     * @var {object}
     */
    #cache = {};

    /**
     * Root context
     *
     * @var {object}
     */
    #context;

    /**
     * Hash of the roo context
     * @var {string}
     */
    #hash;

    /**
     * Settings providers
     *
     * @var {object[]}
     */
    #providers;

    /**
     * Create a settings storage
     *
     * @param {object[]} providers
     * @param {object} context
     *
     * @todo Support multiple providers
     */
    constructor( providers, context ) {
        assert( Array.isArray( providers ) );
        assert( providers.length === 1 );

        this.#providers = [].concat( providers );
        this.#context = context;
        this.#hash = Storage.hash(context);
    }

    static hash( context ) {
        const normalized = Object.keys( context ).sort().reduce(
            // eslint-disable-next-line no-return-assign
            ( r, k ) => ( r[k] = context[k], r ),
            {}
        );
        return JSON.stringify(normalized);
    }

    /**
     * Get settings dictionary from the cache
     *
     * @param {string} namespace
     * @param {object} [context]
     * @return {any}
     */
    get( namespace, context ) {
        const hash = context ? Storage.hash( context ) : this.#hash;

        if ( hash in this.#cache === false ) {
            throw new Error( 'Unknown context' );
        }

        return new Dictionary(
            this.#cache[hash].get( namespace ),
            this.#cache[hash].meta
        );
    }

    /**
     * Check if the namespace and/or context is available
     *
     * @param {string} namespace
     * @param {object} [context]
     * @return {boolean}
     */
    has( namespace, context ) {
        const hash = context ? Storage.hash( context ) : this.#hash;

        if ( !context ) {
            return hash in this.#cache;
        }

        return hash in this.#cache && this.#cache[hash].has( namespace );
    }

    /**
     * Fetch settings into the cache
     *
     * @param {string} namespace
     * @param {object} context
     * @param {number} [ttl]
     *
     * @todo Merge results by priority when multiple providers are given
     * @todo Validate namespace based on schema
     * @todo Throw when a scalar leaf is requested by namespace
     * @todo Implement time to life of cache
     * @todo Implement merge when the parent already exist in the given context
     * @todo Implement replace when a leave of the given namespace already exist
     */
    async fetch( namespace, context, ttl = -1 ) {
        const hash = context ? Storage.hash( context ) : this.#hash;

        if ( hash === this.#hash && hash in this.#cache === false ) {
            this.#cache[hash] = await this.#providers[0].load( namespace, this.#context );
        }

        return this;
    }
}

export async function Factory() {
    const directory = path.dirname( url.fileURLToPath( import.meta.url ) );

    return new Storage(
        [
            new Filesystem(
                path.join( path.join( directory, '..', '..' ), 'config' ),
                process.env.NODE_ENV || 'development',
                process.env
            )
        ],
        {
            component: 'server',
            type: core.auth.getServerType().toLowerCase()
        }
    ).fetch();
}

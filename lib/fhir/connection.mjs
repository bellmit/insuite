import { Client } from './client';

/**
 * Manage a single connection to the FHIR server
 */
export class Connection {

    /**
     * Reusable client
     */
    static #client;

    /**
     * Initialize the connection
     *
     * @param {Dictionary} settings
     * @param {Function} logger
     * @returns {Promise<void>}
     */
    static async initialize( settings, logger ) {
        if ( Connection.#client ) {
            return;
        }

        const client = new Client( settings, logger );
        await client.initialize();

        Connection.#client = client;
    }

    static async reset() {
        if ( !Connection.#client ) {
            return;
        }

        await Connection.#client.deinitialize();
        Connection.#client = null;
    }

    /**
     * @inheritDoc Client.call
     */
    static async call( uri, parameters, meta ) {
        if ( !Connection.#client ) {
            throw new Error( 'FHIR connection is not initialized.' );
        }

        return await Connection.#client.call(
            uri,
            parameters,
            meta
        );
    }
}
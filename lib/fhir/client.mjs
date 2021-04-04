import util from 'util';

import io from 'socket.io-client';

import { Factory } from './logger';

/**
 * Wrap a Socket.IO client
 */
export class Client {

    /**
     * @type {SocketIOClient.Socket}
     */
    #socket;

    /**
     * @type {Function}
     */
    #logger;

    /**
     * @type {Dictionary}
     */
    #settings;

    /**
     * Create an instance
     *
     * @param {Dictionary} settings
     * @param {Function} logger
     */
    constructor( settings, logger ) {
        const factory = new Factory( logger );

        this.#settings = settings;
        this.#logger = factory.create( {mod: 'fhir-io'} );
    }

    /**
     * Initialize the client
     */
    async initialize() {
        if (this.#socket) {
            return;
        }

        try {
            this.#socket = io( this.#settings.get( 'fhir.server.io.url' ) );
            this.#socket.connect();
        } catch ( error ) {
            this.#logger( 'error', [ 'Failed to connect to FHIR server', error ] );
        }
    }

    /**
     * Deinitialize the client
     */
    async deinitialize() {
        if (!this.#socket) {
            return;
        }

        try {
            this.#socket.disconnect();
            this.#socket = null;
        } catch ( error ) {
            this.#logger( 'error', [ 'Failed to disconnect from FHIR server', error ] );
        }
    }

    /**
     * Call an action
     *
     * @param {URI} uri Identifier of the action to call
     * @param {any} parameters Parameters to pass
     * @param {any} meta
     * @returns {any}
     */
    async call( uri, parameters, meta ) {
        const emit = util.promisify( this.#socket.emit ).bind( this.#socket );

        return emit( 'call', `${uri}`, { ...parameters, meta } );
    }
}

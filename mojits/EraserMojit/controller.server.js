

/*global YUI*/

YUI.add( 'Eraser', function( Y, NAME ) {

        const moment = require( 'moment' );

        const core = require( 'dc-core' );

        const CollectionProvider = require( './models/mongo/collection-provider.server' );
        const EraserService = require( './models/eraser-service.server' );

        Y.namespace( 'doccirrus' ).eraser = {

            /**
             * Create an eraser service
             *
             * @param {Date} [now]
             * @return {Promise<EraserService>}
             */
            factory: async ( now = moment().toDate() ) => {
                const user = Y.doccirrus.auth.getSUForLocal();
                let users = [ user ];

                if ( Y.doccirrus.auth.isMTSAppliance() ) {
                    const tenants = await core.utils.promisifyArgsCallback(
                        Y.doccirrus.api.company.getActiveTenants
                    )( { user } );

                    users = users.concat( tenants.map( tenant => Y.doccirrus.auth.getSUForTenant(tenant) ) );
                }

                const database = { run: Y.doccirrus.mongodb.runDb.bind( Y.doccirrus.mongodb ) };

                return new EraserService({
                    [CollectionProvider.type]: new CollectionProvider( now, database, users )
                }, { log: Y.log.bind( Y ) } ) ;
            }
        };

        // make the service available through cron jobs
        Y.doccirrus.kronnd.on(
            'Erase',
            async ( config ) => {
                let service;

                try {
                    service = await Y.doccirrus.eraser.factory( new Date() );
                } catch ( error ) {
                    Y.log( `Failed to initialize eraser service: ${error.stack}`, 'error', NAME );
                }

                const result = service.run( config );

                if (result instanceof Error ) {
                    Y.log( `Failed to run eraser task: ${result.stack}`, 'error', NAME );
                }
            }
        );
    },
    '0.0.1', {
        requires: [
            'dcauth',
            'dcmongodb',
            'dckronnd'
        ]
    }
);
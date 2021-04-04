/**
 *  This objects creates and manages queues of reporting entries to be created/updated.
 *
 *  There is one queue per tenant on multi-tenant systems.
 *
 *  Management of these queues involves:
 *
 *      (*) Watching server load to run backlogged work when server has available capacity
 *
 *      (*) Keeping timers to regularly check queues
 *
 *      (*) Creating / deleteing queues as tenants are created / deleted (TODO)
 *
 *      (*) Receiving new items from IPC and adding them to the appropriate queue
 */

/*global YUI*/



YUI.add( 'SyncReportingManager', function( Y, NAME ) {

    const
        SYNC_CHECK_INTERVAL = 1000;                 //  check syncreporting collection for new work at this interval
    let
        startUpDelay = 15000;                       //  do not start syncreporting work immediately on start of server

    class SyncReportingManager {

        constructor() {
            const self = this;

            self.started = false;                   //  started by dcdb.server.js when db is ready
            self.loadHigh = true;                   //  checked periodically
            self.queues = new Map();
        }

        /**
         *  Look up tenants on this system and create a syncreporting queue for each
         *
         *  @param  {Function}  callback
         */

        createAllQueues( callback ) {
            const
                self = this,
                localSuperUser = Y.doccirrus.auth.getSUForLocal();

            //  add queue for local database, for single tenant systems
            this.createQueue( Y.doccirrus.auth.getLocalTenantId() );

            //  if not VPRC then we do not need to look up tenants
            if ( !Y.doccirrus.auth.isVPRC() ) { return callback( null ); }

            Y.doccirrus.api.company.getActiveTenants( {
                'user': localSuperUser,
                'callback': onTenantListLoaded
            } );

            function onTenantListLoaded( err, companies ) {
                if ( err ) {
                    Y.log( `Could not create reporting queues ${err.stack||err}`, 'error', NAME );
                    return callback( err );
                }

                Y.log( `Creating syncreporting queues for ${companies.length} tenants.`, 'debug', NAME );
                companies.forEach( item => self.createQueue( item.tenantId ) );
                callback( null );
            }
        }

        /**
         *  Create a queue for each active tenant and start a timer to periodically check them
         *
         *  This is called from dcserver.server.js on startup once databases are initialized, via IPC
         *
         *  @param  {Function}  callback    Called when list of tenants has been loaded from db and queus created
         */

        runOnStart( callback ) {
            const self = this;

            if ( !Y.doccirrus.insight2.utils.isReportingWorker() ) {
                return callback( null );
            }

            if ( self.started ) {
                Y.log( 'Duplicated call to start reporting worker, ignoring.', 'warn', NAME );
                return callback( null );
            }

            self.createAllQueues( onQueuesCreated );

            function onQueuesCreated( err ) {
                if ( err ) { return callback( err ); }
                Y.log( `Starting queue manager with interval: ${SYNC_CHECK_INTERVAL}`, 'info', NAME );
                setInterval( () => self.checkAllQueues(), SYNC_CHECK_INTERVAL );
                self.started = true;
                callback( null );
            }
        }

        /**
         *  Create a new queue for the given tenantId and add it to this.queues (renamed from createInstance)
         *
         *  @param  {String}    tenantId
         *  @return {*}
         */

        createQueue( tenantId ) {
            const self = this;
            let
                tenantSu = Y.doccirrus.auth.getSUForTenant( tenantId ),
                startAfter = ( ( new Date() ).getTime() + startUpDelay ),
                newQueue = new Y.doccirrus.insight2.SyncReportingQueue( tenantSu, tenantId, startAfter );

            Y.log( `Creating reporting queue for tenant: ${tenantId}`, 'info', NAME );
            self.queues.set( tenantId, newQueue );
            return newQueue;
        }

        /**
         *  A single timer prods the reporting manager to check all queues, each of which has their own tenant and user
         */

        checkAllQueues() {
            const self = this;
            self.loadHigh = Y.doccirrus.insight2.utils.isLoadHigh();
            self.queues.forEach( queue => queue.check( self.loadHigh ) );
        }

        /**
         *  Return the queue for a given tenantId, create it if not found
         *
         *  TODO: check if used
         *
         *  @param  {String}    tenantId
         *  @return {*}
         */

        getQueue( tenantId ) {
            let inst = this.queues.get( tenantId );

            if( !inst ) {
                inst = this.createQueue( tenantId );
            }
            return inst;
        }

        /**
         *  Delete an item from all queues on the given tenant
         *
         *  @param  {String}    tenantId
         *  @param  {String}    entryName
         *  @param  {String}    entityId
         */

        removeReporting( tenantId, entityName, entryId ) {
            const self = this;

            if ( !self.queues.has( tenantId ) ) {
                Y.log( `Unknown tenant ${tenantId}`, 'error', NAME );
                return;
            }

            let queue = self.queues.get( tenantId );

            queue.removeItem( entityName, entryId );
        }

        /**
         *  TODO: update, replace, rename
         *
         *  @param user
         *  @param modelId
         *  @return {*}
         */

        generate( user, modelId ) {
            const tenantId = user.tenantId || 0,
                currentInstance = this.getInstance( tenantId );

            return currentInstance.generate( modelId );
        }


        /**
         *  Wake up a queue to check new syncreportings if load allows
         *
         *  @param  {String}    tenantId
         */

        prod( tenantId ) {
            const self = this;
            tenantId = `${tenantId}`;
            if ( !self.queues.has( tenantId ) ) {
                Y.log( `Tenant does not have syncreporting, adding queue: ${tenantId}`, 'warn', NAME );
                self.createQueue( tenantId );
            }

            if ( self.loadHigh ) { return; }

            let queue = self.queues.get( `${tenantId}` );
            queue.prod();
        }

        /**
         *  Invalidate reporting cache for the given tenant
         *
         *  @param  {String}    tenantId
         *  @param  {String}    modelName   Reporting cache section, generally a model name
         *  @param  {String}    objectId    Reporting cache key, generally a database _id, optional
         */

        invalidateCache( tenantId, modelName, objectId ) {
            const self = this;
            if ( !self.queues.has( tenantId) ) {
                Y.log( `Tenant does not have syncreporting, no cache to inavlidate: ${tenantId}`, 'warn', NAME );
                return;
            }

            let queue = self.queues.get( tenantId );
            queue.invalidateCache( modelName, objectId );
        }

        //-------------------- for mocha suite -------------------

        /**
         *  Reset settings of already run queues manager to be able to re run it on another tenant
         *
         *  @param  {Number|undefined} delay   delay of reporting processing start
         */

        clearStarted( delay ) {
            this.started = false;
            this.queues = new Map();
            if( delay ){
                startUpDelay = delay;
            }
        }
    }

    Y.namespace( 'doccirrus.insight2' ).syncReportingManager = new SyncReportingManager();


}, '0.0.1', {
    requires: [
        'reporting-api',
        'syncreporting-utils',
        'SyncReportingQueue'
    ]
} );
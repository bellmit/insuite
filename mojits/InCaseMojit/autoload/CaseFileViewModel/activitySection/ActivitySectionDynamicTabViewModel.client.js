/**
 *  Render the current gantt into a div on the page
 */

/*eslint prefer-template:0, strict:0 */
/*global YUI, ko, _*/

YUI.add( 'ActivitySectionDynamicTabViewModel', function( Y, NAME ) {
    'use strict';

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        unwrap = ko.unwrap,
        ActivitySectionViewModel = KoViewModel.getConstructor( 'ActivitySectionViewModel' );

    /**
     *  @constructor
     *  @class ActivitySectionDynamicTabViewModel
     *  @extends ActivitySectionViewModel
     */
    function ActivitySectionDynamicTabViewModel() {
        ActivitySectionDynamicTabViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ActivitySectionDynamicTabViewModel, ActivitySectionViewModel, {

        templateName: 'ActivitySectionDynamicTabViewModel',

        /** @protected */
        initializer: function(options) {
            this.options = options;
            this.iframeUrl = options.targetUrl;
            this.message = ko.observable('no message yet');

            Y.log( 'ActivitySectionDynamicTabViewModel: Initialized', 'info',NAME );
        },

        getActivityDetailsViewModel: function () {
            var
                self = this,
                binder = self.get( 'binder' ),
                caseFileVM = unwrap( binder.currentView );

            if ( !caseFileVM || !caseFileVM.activityDetailsViewModel ) { return null; }

            return unwrap( caseFileVM.activityDetailsViewModel );
        },

        notifyIframeBind: function( element ) {

            this.iframeElement = element;

            this.iframeElement.addEventListener('load', this.iframeLoadListener.bind(this));

            this.PostMessageConnection = Y.doccirrus.utils.getPostMessageConnectionInstance();

            this.PostMessageConnection
                .addListener(this.iframeConnectedListener.bind(this), 'CONNECTED')
                .setIframeWindow(this.iframeUrl, element.contentWindow);
        },

        iframeConnectedListener: function() {
            this.onActivityModelChange();
            this.PostMessageConnection
                .addListener(this.modalListener.bind(this), 'SHOW_SOL_MODAL')
                .addListener(this.approveActivityListener.bind(this), 'APPROVE_ACTIVITY')
                .addListener(this.billActivityListener.bind(this), 'BILL_ACTIVITY')
                .addListener(this.validateActivityListener.bind(this), 'VALIDATE_ACTIVITY')
                .addListener(this.resizeObserverUpdate.bind(this), 'RESIZE_OBSERVER_UPDATE')
                .addListener(this.closeSolModal.bind(this), 'CLOSE_SOL_MODAL')
                .onGetDataModel(this.onDataModelRequest.bind(this))
                .onDataModelUpdate(this.onDataModelUpdate.bind(this));
        },

        resizeObserverUpdate: function(sourceEvent) {
            window.removeEventListener('resize', this.resizeCb);

            this.iframeElement.style.height = sourceEvent.data.payload.height + 'px';
        },

        iframeLoadListener: function() {
            var debounceTimeout = 500;

            this.resizeCb = _.debounce( function() {
                if( this.iframeElement.parentNode ) {
                    this.iframeElement.style.height = '';
                    this.iframeElement.style.height = (window.innerHeight - this.iframeElement.parentNode.offsetHeight).toString() + 'px';
                }
            }.bind( this ), debounceTimeout );

            window.addEventListener('resize', this.resizeCb );

            this.resizeCb();
        },

        validateActivityListener: function( event ) {
            Y.doccirrus.jsonrpc.api.activity.doTransitionBatch( { query: { ids: [event.data.payload.activityId], transition: 'validate' } } );
        },

        billActivityListener: function( event ) {
            Y.doccirrus.jsonrpc.api.activity.doTransitionBatch( { query: { ids: [event.data.payload.activityId], transition: 'bill' } } );
        },

        approveActivityListener: function( event ) {
            Y.doccirrus.jsonrpc.api.activity.doTransitionBatch( { query: { ids: [event.data.payload.activityId], transition: 'approve' } } );
        },

        modalListener: function( event ) {
            this.SolsModal = new Y.doccirrus.modals.DCSolModal(event.data.payload, this.saveModalData.bind(this, event.data.payload.iframeUrl));
        },

        closeSolModal: function() {
            this.SolsModal.closeModal();
        },

        saveModalData: function(iframeUrl, data, cb) {
            Promise.resolve(data)
                .then(function() {
                    if (Array.isArray(data.activities) && data.activities.length) {
                        this.PostMessageConnection.postMessageToIframe({
                            action: 'ACTIVITES_UPDATED',
                            targetUrl: this.iframeUrl,
                            payload: { iframeUrl: iframeUrl, activities: data.activities }
                        });
                    }

                    cb();
                }.bind(this));
        },

        onDataModelUpdate: function (event) {
            var
                self = this,
                dataModelUpdate = event && event.data && event.data.payload,
                binder = self.get( 'binder' ),
                currentActivityBeforeUpdate = unwrap( binder.currentActivity );

            if ( dataModelUpdate ) {
                Object.keys(dataModelUpdate).forEach(function (key) {
                    currentActivityBeforeUpdate[key](dataModelUpdate[key]);
                });
            }
            return unwrap( binder.currentActivity ).toJSON(); // send back the update confirmation
        },

        onDataModelRequest: function () {
            var
                self = this,
                binder = self.get( 'binder' );

            return unwrap( binder.currentActivity ).toJSON();
        },

        onActivityModelChange: function () {
            var
                self = this,
                binder = self.get( 'binder' ),
                ignoreModificationsOn = self.get( 'ignoreModificationsOn' );

            self.addDisposable( ko.computed( {
                read: function() {
                    var
                        currentActivity = unwrap( binder.currentActivity ),
                        modifiedObject = currentActivity.readBoilerplate( true );

                    if ( ignoreModificationsOn ) {
                        ignoreModificationsOn.forEach( function( key ) {
                            delete modifiedObject[key];
                        } );
                    }

                    self.PostMessageConnection.emitDataModelUpdate( { payload: modifiedObject } );
                },
                owner: self
            } ).extend( {
                rateLimit: { timeout: 100, method: "notifyWhenChangesStop" }
            } ) );
        },

        /** @protected */
        destructor: function() {
            this.PostMessageConnection.clean();
            this.destroy();
            Y.log( 'ActivitySectionDynamicTabViewModel: Destroyed', 'info',NAME );
        }
    }, {
        NAME: 'ActivitySectionDynamicTabViewModel'
    } );

    KoViewModel.registerConstructor( ActivitySectionDynamicTabViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'dcutils',
        'KoViewModel',
        'ActivitySectionViewModel',
        'DCSolModal'
    ]
} );
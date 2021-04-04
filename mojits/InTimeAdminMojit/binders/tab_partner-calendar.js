/**
 * User: pi
 * Date: 07/03/17  13:30
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, ko */
'use strict';
fun = function _fn( Y/*, NAME*/ ) {
    var
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n,
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        MirrorCalendarModel = KoViewModel.getConstructor( 'MirrorCalendarModel' ),
        viewModel;

    function fail( error ) {
        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
    }

    /**
     * This views ViewModel
     * @constructor
     */
    function ViewModel() {
        ViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ViewModel, KoViewModel.getDisposable(), {
        initializer: function() {
            var
                self = this;

            self.initViewModel();
            self.initLoadMask();
            self.load();

        },
        destructor: function() {
        },
        initViewModel: function() {
            var
                self = this;
            self.pending = ko.observable( false );
            self.title = i18n('InTimeAdminMojit.tab_partner-calendar.text.TITLE');
            self.subtitle = i18n('InTimeAdminMojit.tab_partner-calendar.text.SUBTITLE');

            self.partners = ko.observableArray();
            self.save = function() {
                var
                    partners = peek( self.partners ),
                    data = [];
                partners.forEach( function( partner ) {
                    peek( partner.calendars ).forEach( function( calendar ) {
                        if( calendar.isModified() ) {
                            data.push( calendar.toJSON() );
                        }
                    } );
                } );
                self.pending( true );
                Promise.resolve( Y.doccirrus.jsonrpc.api.mirrorcalendar.updateCalendars( {
                    data: { calendars: data }
                } ) )
                    .then( function() {
                        return self.load( true );
                    } )
                    .catch( fail )
                    .finally( function() {
                        self.pending( false );
                    } );
            };
            self.saveDisabled = ko.computed( function() {
                var
                    partners = unwrap( self.partners ),
                    isModified,
                    isValid = true;
                partners.forEach( function( partner ) {
                    partner.calendars.forEach( function( calendar ) {
                        isModified = isModified || calendar.isModified();
                        isValid = isValid && calendar.isValid();
                    } );
                } );
                return !isValid || !isModified;
            } );
            self.save.i18n = i18n( 'general.button.SAVE' );
        },
        /**
         * init the loading mask
         */
        initLoadMask: function() {
            var
                self = this,
                node = self.get( 'node' );

            self.addDisposable( ko.computed( function() {

                if( self.pending() ) {
                    Y.doccirrus.utils.showLoadingMask( node );
                } else {
                    Y.doccirrus.utils.hideLoadingMask( node );
                }

            } ) );
        },
        /**
         * load data for this view
         */
        load: function( doNotLock ) {
            var
                self = this;
            if( !doNotLock ) {
                self.pending( true );
            }


            return Promise.resolve( Y.doccirrus.jsonrpc.api.calendar.getPartnersSharedCalendars() )
                .then( function( response ) {
                    var
                        calendars = response.data || [],
                        items = [],
                        partnerMap = {};
                    calendars.forEach( function( calendar ) {
                        var
                            partnerCalendar;
                        partnerMap[ calendar.prcCustomerNo ] = partnerMap[ calendar.prcCustomerNo ] || {};
                        partnerCalendar = partnerMap[ calendar.prcCustomerNo ];
                        partnerCalendar.prcCustomerNo = calendar.prcCustomerNo;
                        partnerCalendar.prcCoName = calendar.prcCoName;
                        partnerCalendar.calendars = partnerCalendar.calendars || [];
                        partnerCalendar.calendars.push( new MirrorCalendarModel( { data: calendar } ) );
                    } );
                    Object.keys( partnerMap ).forEach( function( item ) {
                        items.push( partnerMap[ item ] );
                    } );
                    self.partners( items );

                } )
                .catch( fail )
                .finally( function() {
                    if( !doNotLock ) {
                        self.pending( false );
                    }
                } );
        }
    }, {
        ATTRS: {
            node: {
                value: null,
                lazyAdd: false
            }
        }
    } );

    return {

        registerNode: function( node ) {

            // set viewModel
            viewModel = new ViewModel( { node: node.getDOMNode() } );

            ko.applyBindings( viewModel, node.getDOMNode() );

        },

        deregisterNode: function( node ) {

            ko.cleanNode( node.getDOMNode() );

            // clear the viewModel
            if( viewModel ) {
                viewModel.destroy();
                viewModel = null;
            }
        }
    };
};

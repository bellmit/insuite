/**
 * User: pi
 * Date: 13/08/15  11:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'EventModel', function( Y/*, NAME */ ) {
        /**
         * @module EventModel
         */

        var KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * __ABSTRACT__
         *
         * NOTE: when extending this class and you want to adjust things wrapped inside the initializer, they have to be pulled out of the initializer here and be placed in overwritable or reusable prototype functions or ATTRs on this class
         *
         * @class EventModel
         * @constructor
         * @extends KoViewModel
         */
        function EventModel( config ) {
            EventModel.superclass.constructor.call( this, config );
        }

        EventModel.ATTRS = {
            /**
             * @attribute availableEventNameList
             * @type {Array}
             * @default Y.doccirrus.schemas.v_event.types.EventName_E.list
             */
            availableEventNameList: {
                value: Y.doccirrus.schemas.v_event.types.EventName_E.list,
                lazyAdd: false
            },
            validatable: {
                value: true,
                lazyAdd: false
            }
        };
        Y.extend( EventModel, KoViewModel.getBase(), {
            initializer: function EventModel_initializer( config ) {
                var self = this;
                self.initEvent( config && config.data );
            },
            destructor: function EventModel_destructor() {
            },
            /**
             * initializes event model
             */
            initEvent: function EventModel_initEvent( config ) {
                var
                    self = this;
                self.availableEventNameList = self.get( 'availableEventNameList' );
                self.initSelect2EventName();
                if( (!config || !config.fileType) && self.availableEventNameList && self.availableEventNameList.length ) {
                    self.eventName( self.availableEventNameList[0] && self.availableEventNameList[0].val );
                }
            },
            /**
             * Initializes select2 for fileType
             * @method initSelect2EventType
             */
            initSelect2EventName: function EventModel_initSelect2EventName() {
                var
                    self = this;
                self.select2EventName = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            var eventName = ko.unwrap( self.eventName );
                            return eventName;
                        },
                        write: function( $event ) {
                            self.eventName( $event.val );
                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        data: self.availableEventNameList.map( function( name ) {
                                return {
                                    id: name.val,
                                    text: name.i18n
                                };
                            } )
                    }
                };
            },
            /**
             * @method getName
             * @returns {string}
             */
            getName: function EventModel_getName() {
                var
                    resourceTypes = Y.doccirrus.schemas.v_flowsource.types.ResourceType_E.list,
                    result = '';
                resourceTypes.some( function( resourceType ) {
                    if( Y.doccirrus.schemas.v_flowsource.resourceTypes.EVENT === resourceType.val ) {
                        result = resourceType.i18n;
                        return true;
                    }
                    return false;
                } );
                return result;
            }
        }, {
            schemaName: 'v_event',
            NAME: 'EventModel'
        } );
        KoViewModel.registerConstructor( EventModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'v_event-schema',
            'v_flowsource-schema'
        ]
    }
);
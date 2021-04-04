/**
 * User: pi
 * Date: 11/09/2015  12:10
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'v_event-schema', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module v_event-schema
         */

        var

        // ------- Schema definitions  -------

            types = {},
            i18n = Y.doccirrus.i18n,
            eventNames = Object.freeze( {
                DEVICE_INPUT_DATA: 'DeviceInputData'
            } );

        function createEventNameList(){
            var
                result = [];
            Object.keys( eventNames ).forEach( function( name ) {
                result.push( {
                    val: eventNames[name],
                    i18n: i18n( 'v_event-schema.EventName_E.' + eventNames[name] + '.i18n' ),
                    '-en': name,
                    '-de': name
                } );
            } );

            return result;
        }

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
                root: {
                    base: {
                        complex: 'ext',
                        type: 'Event_T',
                        lib: types
                    }
                },
                Event_T: {
                    base_Source_T: {
                        complex: 'ext',
                        type: 'base_Source_T',
                        lib: 'v_flowsource'
                    },
                    base_Event_T: {
                        complex: 'ext',
                        type: 'base_Event_T',
                        lib: types
                    }
                },
                EventName_E: {
                    type: 'String',
                    validate: 'EventName_E_eventName',
                    list: createEventNameList(),
                    i18n: i18n( 'v_event-schema.EventName_E.i18n' ),
                    '-en': 'Type',
                    '-de': 'Type'
                },
                base_Event_T: {
                    __polytype: {
                        type: 'String'
                    },
                    eventName: {
                        complex: 'eq',
                        type: 'EventName_E',
                        lib: types
                    }
                }
            }
        );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            eventNames: eventNames,
            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1',
    {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dcvalidations',
            'v_flowsource-schema'
        ]
    }
);

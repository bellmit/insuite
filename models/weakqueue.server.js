/**
 * User: pi
 * Date: 24/10/2016  12:00
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'DcWeakQueue', function( Y, NAME ) {


        class WeakQueue {
            constructor(){
                this.queueMap = new WeakMap();
                this.name = NAME;
            }
            newQueue( key ){
                let
                    map = new Map();
                this.queueMap.set( key, map );
                return map;
            }
            getQueue( key ){
                return this.queueMap.get( key );
            }
        }

        /**
         * @namespace doccirrus.weakQueue
         */
        Y.namespace( 'doccirrus' ).weakQueue = new WeakQueue();

    },
    '0.0.1', { requires: [] }
);

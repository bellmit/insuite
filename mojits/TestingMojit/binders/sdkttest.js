/*
 *  Binder for batch PDF testing page
 *
 *  This is to test rendering of activities directly to PDF in a downloadable zip archive
 */

/*jslint anon:true, sloppy:true, nomen:true, latedef:false */

/*global YUI, $ */

YUI.add( 'TestingMojitBinderSDKTTest', function( Y, NAME ) {
        /**
         * The TestingMojitBinderSDKTTest module.
         *
         * @module TestingMojitBinderSDKTTest
         */

        'use strict';
        var getObject = Y.doccirrus.utils.getObject;

        function test( command ) {

            var url = '/r/verifyKT/?action=verifyKT&catalog=kts_1.02_kbv_tf%2B2014q2_1.2.dc.json&ik=' + command.ik + '&ktab=' + command.ktab;

            if( command.lq ) {
                url += '&lq=' + command.lq + '&lqFormat=DD.MM.YYYY';
            }

            url = Y.doccirrus.infras.getPrivateURL( url );

            $.ajax( {
                type: 'GET',
                url: url,
                xhrFields: { withCredentials: true },
                success: function( res ) {

                    var i, msg = ['TEST', command.msg], val, err;

                    for( i in command.expect ) {
                        if( command.expect.hasOwnProperty( i ) ) {
                            val = getObject( i, res );
                            if( val !== command.expect[i] ) {

                                err = true;
                                msg.push( 'ERR: ' + i + ' is ' + val + ' expected ' + command.expect[i] );
                            }
                        }
                    }

                    console[err ? 'error' : 'log']( msg.join( ' ' ) );

                },
                error: function() {
                    console.log( 'ERROR', command.msg );
                }
            } );
        }

        /**
         * Constructor for the TestingMojitBinderSDKTTest class.
         *
         * @class TestingMojitBinderSDKTTest
         * @constructor
         */

        Y.namespace( 'mojito.binders' )[NAME] = {

            /**
             * Binder initialization method, invoked after all binders on the page
             * have been constructed.
             */
            init: function( mojitProxy ) {
                this.mojitProxy = mojitProxy;
            },

            /**
             *    The binder method, invoked to allow the mojit to attach DOM event
             *    handlers.
             *
             *    @param node {Node} The DOM node to which this mojit is attached.
             */

            bind: function( node ) {

                this.node = node;

                test( {
                    ik: '106215364',
                    ktab: '00',
                    msg: 'Kostenträger ist gültig',
                    expect: {
                        code: 1,
                        ktIsFused: false
                    }
                } );

                test( {
                    ik: '108077500',
                    ktab: '00',
                    msg: 'Kostenträger ist aufgelöst aber fusioniert',
                    expect: {
                        code: 1,
                        ktIsFused: true,
                        'data.0.vknr': '55605'
                    }
                } );

                test( {
                    ik: 'xxkspsodkoa',
                    ktab: '00',
                    msg: 'IK nicht bekannt!',
                    expect: {
                        code: 2
                    }
                } );

                test( {
                    ik: '100009891',
                    ktab: '00',
                    msg: 'Kostenträger ist aufgelöst!',
                    expect: {
                        code: 3,
                        ktIsFused: false
                    }
                } );

                test( {
                    ik: '103600898',
                    ktab: '00',
                    msg: 'IKNR ist noch nicht gültig!',
                    lq: '01.01.2013',
                    expect: {
                        code: 6,
                        ktIsFused: false
                    }
                } );

                test( {
                    ik: '104232371',
                    ktab: '00',
                    msg: 'KT ist noch nicht gültig!',
                    lq: '01.01.1998',
                    expect: {
                        code: 4,
                        ktIsFused: false
                    }
                } );

                test( {
                    ik: '103729621',
                    ktab: '08',
                    msg: 'KTAB nicht mehr gültig!',
                    lq: '30.12.1999',
                    expect: {
                        code: 7,
                        ktIsFused: false
                    }
                } );

                test( {
                    ik: '102023626',
                    ktab: '06',
                    msg: 'KTAB noch nicht gültig!',
                    lq: '30.12.1999',
                    expect: {
                        code: 8,
                        ktIsFused: false
                    }
                } );

                test( {
                    ik: '107721962',
                    ktab: '00',
                    msg: 'IKNR nicht mehr gültig!',
                    lq: '01.01.1998',
                    expect: {
                        code: 5,
                        ktIsFused: false
                    }
                } );

            }
        };
    },
    '0.0.1',
    {
        requires: [
            'event-mouseenter',
            'mojito-client',
            'mojito-rest-lib'
        ]
    }
);

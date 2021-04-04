/*
 * Binder for xss testing page
 *
 * This runs a series of hostile strings through the input filter (Y.doccirrus.filters) and renders the output in a page
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI, $, jQuery */

YUI.add('TestingMojitBinderXssTest', function(Y, NAME) {
        /**
         * The TestingMojitBinderIndex module.
         *
         * @module TestingMojitBinderIndex
         */

        'use strict';

        Y.log('YUI.add TestingMojittBinderXssTest with NAMEs ' + NAME, 'info');

        /**
         * Constructor for the TestingMojitBinderIndex class.
         *
         * @class testingMojitBinderIndex
         * @constructor
         */

        Y.namespace('mojito.binders')[NAME] = {

            /**
             * Binder initialization method, invoked after all binders on the page
             * have been constructed.
             */
            init: function(mojitProxy) {
                Y.log('Initializing', 'debug', NAME);
                this.mojitProxy = mojitProxy;
            },

            /**
             *	The binder method, invoked to allow the mojit to attach DOM event
             *	handlers.
             *
             *	@param node {Node} The DOM node to which this mojit is attached.
             */

            bind: function(node) {
                this.node = node;
                this.tests = [];
                this.numTests = 0;
                this.currTest = 0;

                //  some definitions

                var
                    me = this; //,                      //  relative
                //    jqMe = $('#divXssReport');

                //  Add button events
                $('#btnStartTest' ).show().on('click', function () { me.startTest();});
                $('#btnLoadSamples' ).show().on('click', function () { me.loadSamples();});

                /*
                window.alert = function(msg) {
                    $('#divXssReport' ).append(me.currTest + ':' + msg + '<br/>');
                    $('#divXssReport' ).append(me.currTest + ':' + me.tests[me.currTest] + '<br/>');
                };
                */

            },

            /**
             *  Start the Test
             */

            startTest: function() {
                var rawSamples = jQuery.trim($('#taSamples').val());

                if ('' === rawSamples) {
                    this.showStatus('Please add some XSS samples to test first.');
                    return;
                }

                this.tests = rawSamples.split('\n');
                this.numTests = this.tests.length;
                this.currTest = 0;
                $('#divSampleBox').hide();
                this.runNextTest();
            },

            /**
             *  Load XSS samples
             */

            loadSamples: function() {
                var samples = $.get(
                    '/static/TestingMojit/assets/xss/xss-samples.txt',
                    function onGetSamples(data /*, status, jqXHR */) {
                        $('#taSamples' ).val(data);
                    }
                );


                Y.log('Samples: ' + JSON.stringify(samples), 'debug', NAME);
            },

            /**
             *  Show a status message
             */

            showStatus: function(msg) {
                $('#divXssStatus' ).html(msg);
            },

            /**
             *  POST an XSS sample through the filter
             */

            runNextTest: function() {
                if (this.currTest >= this.tests.length) {
                    this.showStatus('Test complete.');
                    return;
                }

                setTimeout(function onNextTest() { that.runNextTest(); }, 5000);

                var
                    that = this,
                    rawString = this.tests[this.currTest],
                    b64String = Y.doccirrus.comctl.UTF8ToB64(rawString),
                    ifUrl = '/r/TestingMojit/xsstestrunner/?action=xsstestrunner&test=' + b64String,
                    msg = ' ' +
                     'Running test ' + this.currTest + ' of ' + this.numTests + '<br/>' +
                     '<small>' + ifUrl + '</small><br/>' +
                     '<iframe src="' + ifUrl + '" width="600" height="300"></iframe> ';

                this.showStatus(msg);

                this.currTest = this.currTest + 1;
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

/*
 *  Support page to edit mapping description
 */

/*jslint anon:true, sloppy:true, nomen:true, latedef:false */

/*global YUI, $, async */

YUI.add('TestingMojitBinderMappingDescription', function(Y, NAME) {

        'use strict';

        Y.log('YUI.add TestingMojitBinderMappingDescription with NAMEs ' + NAME, 'info');

        Y.namespace('mojito.binders')[NAME] = {

            LOAD_URL: '/1/test/:getReducedSchema',
            SAVE_URL: '/1/test/:updateReducedSchema',

            /**
             * Binder initialization method, invoked after all binders on the page
             * have been constructed.
             */
            init: function(mojitProxy) {
                this.mojitProxy = mojitProxy;
            },

            activity: null,
            documents: null,
            formDoc: null,
            counter: 0,

            schema: {},
            loadedSchema: false,
            selectedMember: '',

            /**
             *	The binder method, invoked to allow the mojit to attach DOM event
             *	handlers.
             *
             *	@param node {Node} The DOM node to which this mojit is attached.
             */

            bind: function(node) {

                var
                    self = this,
                    jqCache = {
                        'txtFilter': $( '#txtFilter' ),
                        'divMappingList': $( '#divMappingList' ),
                        'divEditMapping': $( '#divEditMapping' ),
                        'txtLabelEn': $( '#txtLabelEn' ),
                        'txtLabelDe': $( '#txtLabelDe' ),
                        'taDescEn': $( '#taDescEn' ),
                        'taDescDe': $( '#taDescDe' ),
                        'btnSave': $( '#btnSave' )
                    };

                self.node = node;
                self.jq = jqCache;

                //  attach event handlers
                self.jq.txtFilter.off( 'keyup' ).on( 'keyup', function() { self.updateFilter(); } );
                self.jq.btnSave.off( 'click' ).on( 'click', function() { self.saveCurrentMember(); } );

                //  load the file
                self.loadFromServer();
                self.jq.divEditMapping.hide();
            },

            loadFromServer: function() {
                var self = this;
                Y.doccirrus.comctl.privatePost( self.LOAD_URL, {}, onReducedSchemaLoaded );
                function onReducedSchemaLoaded( err, response ) {
                    self.schema = response.data;
                    self.initList();
                }
            },

            initList: function() {
                var
                    toBind = [],
                    self = this,
                    html = '',
                    printName,
                    k;

                for ( k in self.schema ) {
                    if ( self.schema.hasOwnProperty(k) ) {
                        if ( 'version' !== k && 'mapper' !== k ) {
                            printName = k;
                            if ( printName.length > 50 ) { printName = printName.substr( 0, 50 ) + '...'; }
                            html = html + '<li id="liSchema' + k + '"><a href="#">' + printName + '</a></li>';
                            toBind.push( k );
                        }
                    }
                }

                html = '<ul class="nav nav-pills nav-stacked">' + html + '</ul>';

                self.jq.divMappingList.html( html );

                async.eachSeries( toBind, bindSingleMember, onAllBound );

                function bindSingleMember( memberName, itcb ) {
                    $( '#liSchema' + memberName ).off( 'click' ).on( 'click', function() { self.onClickMember( memberName ); } );
                    itcb( null );
                }

                function onAllBound() {
                    self.loadedSchema = true;
                    self.updateFilter();
                }

            },

            updateFilter: function() {
                var
                    self = this,
                    filterTxt = self.jq.txtFilter.val().trim().toLowerCase(),
                    matchTxt,
                    match,
                    k;

                for ( k in self.schema ) {
                    if ( self.schema.hasOwnProperty(k) ) {
                        if ( 'version' !== k && 'mapper' !== k ) {

                            match = false;
                            matchTxt = k.toLowerCase();

                            if ( -1 !== matchTxt.indexOf( filterTxt ) ) {
                                match = true;
                            }

                            if ( '' === filterTxt ) {
                                match = true;
                            }

                            if ( true === match ) {
                                $( '#liSchema' + k ).show();
                            } else {
                                $( '#liSchema' + k ).hide();
                            }

                            if ( self.selectedMember === k ) {
                                $( '#liSchema' + k ).addClass( 'active' );
                            } else {
                                $( '#liSchema' + k ).removeClass( 'active' );
                            }
                        }
                    }
                }

            },

            showMember: function( memberName ) {
                var
                    self = this,
                    member = self.schema[memberName];

                self.jq.divEditMapping.show();

                self.jq.txtLabelEn.val( '' );
                self.jq.txtLabelDe.val( '' );
                self.jq.taDescEn.val( '' );
                self.jq.taDescDe.val( '' );

                if ( !member.label ) { member.label = {};  }
                if ( !member.label.de ) { member.label.de = 'MISSING';  }
                if ( !member.label.en ) { member.label.en = 'MISSING';  }
                if ( !member.description ) { member.description = {};  }
                if ( !member.description.de ) { member.description.de = 'MISSING';  }
                if ( !member.description.en ) { member.description.en = 'MISSING';  }

                self.jq.txtLabelEn.val( member.label.en );
                self.jq.txtLabelDe.val( member.label.de );
                self.jq.taDescEn.val( member.description.en );
                self.jq.taDescDe.val( member.description.de );
            },

            saveCurrentMember: function() {
                var
                    self = this,
                    postData = {
                        'schemaMember': self.selectedMember,
                        'label': {
                            'en': self.jq.txtLabelEn.val(),
                            'de': self.jq.txtLabelDe.val()
                        },
                        'description': {
                            'en': self.jq.taDescEn.val(),
                            'de': self.jq.taDescDe.val()
                        }
                    };

                if ( !self.selectedMember || '' === self.selectedMember ) { return; }

                Y.doccirrus.comctl.privatePost( self.SAVE_URL, postData, onSchemaUpdated );

                function onSchemaUpdated( err, result ) {
                    if ( err ) {
                        Y.log( 'Problem saving schema back file: ' + JSON.stringify( err ), 'warn', NAME );
                        return;
                    }
                    Y.log( 'Updated schmema member: ' + JSON.stringify( postData, undefined, 2 ), 'debug', NAME );

                    self.schema = result.data;
                }
            },

            //  EVENT HANDLERS

            onClickMember: function( memberName ) {
                var self = this;
                self.selectedMember = memberName;
                self.showMember( memberName );
                self.updateFilter();
            }

        };

    },
    '0.0.1',
    {
        requires: [
            'event-mouseenter',
            'mojito-client',
            'mojito-rest-lib',
            'dcbatchpdfzip',
            'doccirrus',
            'event-mouseenter',
            'mojito-client',
            'JsonRpcReflection-doccirrus',
            'dcregexp',
            'dcvalidations',
            'dcsubviewmodel',
            'dcutils',
            'dcauth',
            'dcutils-uam',
            'dccasefilebinderevents',
            'dcloadhelper',
            'dcformloader',
            'dcviewmodel',
            'dcpatientmodel',
            'dclocationmodel',
            'dcaddressmodel',
            'dccommunicationmodel',
            'dcinsurancestatusmodel',
            'dcbankaccountmodel',
            'dcbankaffiliatemodel',
            'dcdocumentmodel',
            'dceventarraymodel',
            'dccontactmodel',
            'dcinvoicemodel',
            'dcactivitysettingsmodel',
            'activitysettings-api',
            'base',
            'router',
            'json',
            'model-sync-rest',
            'intl',
            'mojito-intl-addon',
            'dc-comctl',
            'dcmedia',
            'dcvat',
            'DCWindow',
            'dcmarkermodel',
            'dcmarkerarraymodel',
            'dchotkeyshandler',
            'DCSystemMessages',
            'parallel',
            'dcFkModels',
            'dcOphthalmologyModels',
            'kbv-api',
            'dccrmanager',
            'cardreader',
            'dcrecommendedprescriptionmodal',
            'dcmediapreviewnmodal',
            'DCFsmDefault',
            'DeviceReader',
            'dccommunication-client'
        ]
    }
);

/**
 * User: rrrw
 * Date: 26.01.15  13:08
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */


/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */

'use strict';

YUI.add( 'dcformmap-ko-util', function( Y, NAME ) {

        /**
         *   MAPPER KO UTILS
         *
         *   All common mapper functions that are related to or use
         *   ko eventing functions are gethered here and made available
         *   via  Y.dcforms.mapper.koUtils
         *
         *   A central premise of this code is that you can only be editing
         *   a single form at a time per browser process (tab).
         *
         */

        // setup the ko object for all environments
        var
            isOnClient =  Y.doccirrus.commonutils.isClientSide(),
            _k;
        if( isOnClient ) {
            _k = ko;
        } else {
            // mock ko for server.
            _k = {};
            _k.unwrap = function( txt ) { return txt; };
        }

        var koSubs = [],
            koMapper = {},
            formDoc;

        /**
         *  Set up environment for listeners
         *
         *  @param  mapFn       {Object}    some_mapper.map( ... )
         *  @param  context     {Object}    Mapper context
         *  @param  template    {Object}    Form template
         */

        function initKoForMapper( mapFn, context, template ) {
            if( Y.doccirrus.commonutils.isClientSide() ) {
                koMapper.context = context;
                koMapper.mapFn = mapFn;
                koMapper.mapCollection = context.bindCollection;
                koMapper.mapId = context.bindId;
                koMapper.mapVM = context.activity;
                koMapper.template = template;

                koMapper.formId = '';
            }
        }

        function remapForm( /* val */ ) {
            //Y.log( 'Remapping Form with value: ' + val, 'info', NAME );
            if( formDoc ) {
                formDoc.formData( Y.doccirrus.comctl.UTF8ToB64( JSON.stringify( koMapper.template.toDict() ) ) );
            }
            koMapper.mapFn( onRemapForm );

            function onRemapForm( err ) {
                if ( err ) {
                    Y.log( 'Error mapping form from KO event: ' + JSON.stringify( err ), 'warn', NAME );
                    return;
                }

                koMapper.context.attachments.updateFormDoc( koMapper.context, koMapper.template, onUpdatedFormDoc );
            }
        }

        function remapSingle( schemaMember, newValue ) {
            var mObj = {};

            //  do not try to update after activity is approved
            if ( koMapper.context.activity && !koMapper.context.activity._isEditable() ) {
                return;
            }

            mObj[ schemaMember ] = newValue;
            koMapper.template.map( mObj, true, onRemapSingle );
            function onRemapSingle( err ) {
                if ( err ) {
                    Y.log( 'Problem remapping single subscribed value: ' + schemaMember, 'warn', NAME );
                    return;
                }
                koMapper.context.attachments.updateFormDoc( koMapper.context, koMapper.template, onUpdatedFormDoc );
            }
        }

        function activateDocBlock( context ) {
            var act = context.activity || koMapper.context.activity;

            koSubs.push( act.employeeId.subscribe( remapForm ) );
            koSubs.push( act.locationId.subscribe( remapForm ) );

            koSubs.push( act.subType.subscribe( function remapSubType() { remapSingle( 'subType', ko.unwrap( act.subType ) ); }  ) );

            if (ko.unwrap(act.actType) === "MEDICATION") {
                koSubs.push(act.phPZN.subscribe( remapForm ));
            }
            //koSubs.push( act.content.subscribe( function remapContent() { remapSingle( 'content', ko.unwrap( act.content ) ); } ) );
            //koSubs.push( act.userContent.subscribe( function remapUserContent() { remapSingle( 'content', ko.unwrap( act.userContent ) ); } ) );
        }

        /**
         *  Subscriptions to update document meta QR code to match updates form activity sidebar
         *  @param context
         */

        function activateDocMetaQR( context ) {
            if ( !isOnClient || !koMapper.template ) { return; }

            var act = context.activity || koMapper.context.activity;

            koSubs.push( act.actType.subscribe( checkDocMetaQR ) );
            koSubs.push( act.subType.subscribe( checkDocMetaQR ) );
            koSubs.push( act.timestamp.subscribe( checkDocMetaQR ) );
            koSubs.push( act.userContent.subscribe( checkDocMetaQR ) );

            checkDocMetaQR();

            function checkDocMetaQR() {
                if ( false === koMapper.template.hasQrCode ) { return; }

                if ( koMapper.template && koMapper.template.getBoundElement( 'documentMetaDataQrCode' ) ) {
                    koMapper.template.hasQrCode = true;
                    remapForm( 'documentMetaDataQrCode' );
                } else {
                    koMapper.template.hasQrCode = false;
                }
            }
        }

        /**
         *  When the timestamp / date of the activity is changed we attempt to remap only those fields which
         *  include the date, to minimize loss of user edits to the form contents, povided the form and activity are
         *  editable
         *
         *  @param  context {Object}    Activity mapper context
         */

        function activateTimestamp( context ) {

            function onTimeUpdated() {
                Y.log('Reset date/time to ' + context.activity.timestamp(), 'debug', NAME);
                context.attachments.updateFormDoc( context, koMapper.template, onUpdatedFormDoc );
            }

            function remapTimeFields() {

                if (!context.activity._isEditable()) {
                    //  don't update approved forms
                    return;
                }

                var
                    currentActivity = context.activity || koMapper.context.activity,
                    currentPatient = koMapper.context.patient,

                    officialAddress = currentPatient.getAddressByKind( 'OFFICIAL' ),       //  if available
                    postalAddress = currentPatient.getAddressByKind( 'POSTAL' ),           //  postal preferred
                    poboxAddress = currentPatient.getAddressByKind( 'POSTBOX' ),           // po box

                    tsmom = moment.utc( ko.unwrap( context.activity.timestamp ) ).local(),
                    formData = {};

                //  don't display 'undefined', 'invalid', etc in forms
                if (!tsmom.isValid()) {
                    return;
                }

                function onSetup1Done( err ) {
                    if( err ) {
                        Y.log( 'Could not do setup1', 'error', NAME );
                    }
                    // adds additional data: location info, employee info
                    Y.dcforms.mapper.objUtils.setup3(formData, currentActivity, currentPatient, function( err ) {
                        if(err) {
                            Y.log('Error occured while mapping docletter into form: ' + err, 'warn', NAME );
                        } else {
                            //  add personalienfeld
                            Y.dcforms.mapper.objUtils.setup2(formData, officialAddress, postalAddress, poboxAddress );

                            // add docBlock
                            formData.docBlock = Y.dcforms.mapper.objUtils.docBlock( formData );

                            Y.dcforms.mapper.objUtils.setupFindingMedicationDiagnoses( formData, currentActivity );
                            Y.dcforms.mapper.objUtils.setQuarter( formData, currentActivity );
                            Y.dcforms.mapper.objUtils.getLabRequest( formData, currentActivity );
                            Y.dcforms.mapper.objUtils.getAU( formData, currentActivity );
                            Y.dcforms.mapper.objUtils.setBarcodeData( formData );

                            onFormDataReady(null, formData);
                        }
                    });
                }

                //  adds address from patient object, insurance info
                Y.dcforms.mapper.objUtils.setup1(formData, currentActivity, currentPatient, officialAddress, postalAddress, poboxAddress, onSetup1Done );

            }

            function onFormDataReady(err, formData) {

                if ( err ) {
                    Y.log( 'Problem generating formData: ' + JSON.stringify( err ), 'warn', NAME );
                    //  continue anyway, best effort to udpate barcodes
                }

                var
                    reRender = (koMapper.template.isRendered && !koMapper.template.inRender),
                    copyFields = [
                        //  basic field used in text elements
                        'timestampDate', 'timestamp', 'dateNormal', 'date',
                        'abnahmeDatum', 'abnahmeZeit',
                        //  barcodes can contain dates
                        'barcode1a',
                        'barcode2a', 'barcode2b',
                        'barcode3a',
                        'barcode4',
                        'barcode6',
                        'barcode8', 'barcode8a',
                        'barcode9',
                        'barcode10', 'barcode10L', 'barcode10A',
                        'barcode11',
                        'barcode12a', 'barcode12b', 'barcode12c', 'barcode12d',
                        'barcode13',
                        'barcode13_2',
                        'barcode14',
                        'barcode15_1',
                        'barcode18',
                        'barcode19a', 'barcode19b',
                        'barcode20b', 'barcode20c',
                        'barcode21',
                        'barcode25',
                        'barcode26a', 'barcode26b', 'barcode26c',
                        'barcode27a', 'barcode27b', 'barcode27c',
                        'barcode28a', 'barcode28b', 'barcode28c',
                        'barcode30',
                        'barcode36',
                        'barcode39a', 'barcode39b',
                        'barcode52_2',
                        'barcode53',
                        'barcode55',
                        'barcode56_2',
                        'barcode61Ab', 'barcode61Da',
                        'barcode63a', 'barcode63b', 'barcode63c', 'barcode63d',
                        //  Non-BFB
                        'documentMetaDataQrCode'
                    ],
                    useData = {
                        //  only the last line of the personalienfeld need be updated
                        'patient': {
                            'line7': formData.patient.line7
                        },
                        'patient2': {
                            'line7': formData.patient.line7
                        }
                    },
                    k;

                for (k in copyFields) {
                    if (copyFields.hasOwnProperty(k) && formData.hasOwnProperty(k)) {
                        useData[k] = formData[k];
                    }
                }

                //if( Y.config.debug ) {
                //Y.log('partial mapping after date change: ' + JSON.stringify(formData, undefined, 2), 'debug', NAME);
                //}
                koMapper.template.map(useData, reRender, onTimeUpdated);

            }

            koSubs.push( context.activity.timestamp.subscribe( remapTimeFields) );
        }

        function activateKoForMapper() {
            activateDocBlock( koMapper.context );
            activateTimestamp( koMapper.context );

            activateDocMetaQR( koMapper.context );
        }

        function resetKoForMapper() {
            var i;
            for( i = 0; i < koSubs.length; i++ ) {
                koSubs[i].dispose();
            }
            koSubs = [];
        }

        function onUpdatedFormDoc() {
            Y.log( 'Updated form document in response to KO event in UI.', 'debug', NAME );
        }

        // Another premise of this
        // utility is that none of the
        // event listeners are part of the
        // server side rendering workflow. i.e.
        // you will never need to callback from this
        // function to complete the rendering process on the server
        // This saves us having to guard in each ko function above.
        // we know they will only ever be called on the client.
        function devNull() {}
        Y.namespace( 'dcforms.mapper' ).koUtils = {
            initKoForMapper: isOnClient ? initKoForMapper : devNull,
            activateKoForMapper: isOnClient ? activateKoForMapper : devNull,
            activateDocBlock: isOnClient ? activateDocBlock : devNull,
            activateTimestamp: isOnClient ? activateTimestamp : devNull,
            resetKoForMapper: isOnClient ? resetKoForMapper : devNull,
            getKo: function() { return _k; }
        };

    },
    '0.0.1',
    {
        requires: [ 'dccommonutils' ]
    }
);

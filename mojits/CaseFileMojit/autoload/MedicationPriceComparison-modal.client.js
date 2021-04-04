/**
 * User: do
 * Date: 27.11.19  17:05
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko */

YUI.add( 'MedicationPriceComparison-modal', function( Y, NAME ) {
    var
        MedicationPriceComparisonModel = Y.doccirrus.KoViewModel.getConstructor( 'MedicationPriceComparisonModel' ),
        i18n = Y.doccirrus.i18n;

    function show( config ) {
        var
            node = Y.Node.create( config.markup ),
            dcWindow, // eslint-disable-line no-unused-vars
            patient = config.patient,
            // MOJ-14319: [OK] [CASEFOLDER]
            insurance = patient && patient.getPublicInsurance && patient.getPublicInsurance( config.caseFolderType ),
            iknr = insurance && insurance.insuranceId && insurance.insuranceId(),
            priceComparisonKoTable = new MedicationPriceComparisonModel( {
                priceComparisonDiscount: config.priceComparisonDiscount,
                _defaultMappings: config._defaultMappings || {},
                getContext: function() {
                    return {
                        getSelected: function() {
                            return config.selected;
                        }, patient: config.patient, _defaultMappings: config._defaultMappings
                    };
                }
            } );

        dcWindow = new Y.doccirrus.DCWindow( {
            className: 'DCWindow-MedicationPriceComparison-modal',
            bodyContent: node,
            title: i18n( 'InCaseMojit.medication_modal.submenu.PRICE_COMPARISON' ),
            icon: Y.doccirrus.DCWindow.ICON_LIST,
            width: Y.doccirrus.DCWindow.SIZE_XLARGE,
            height: Y.doccirrus.DCWindow.SIZE_XLARGE,
            minHeight: Y.doccirrus.DCWindow.SIZE_XLARGE,
            minWidth: Y.doccirrus.DCWindow.SIZE_XLARGE,
            centered: true,
            modal: true,
            render: document.body,
            buttons: {
                header: ['close', 'maximize'],
                footer: [
                    Y.doccirrus.DCWindow.getButton( 'CLOSE' )
                ]
            }
        } );
        ko.applyBindings( priceComparisonKoTable, node.getDOMNode() );
        priceComparisonKoTable.setPackage( {selectedPackage: config.selected, insuranceIknr: iknr} );
    }

    Y.namespace( 'doccirrus.modals' ).MedicationPriceComparison = {
        show: function( config ) {
            var promise;
            if( config.pzn ) {
                promise = Promise.resolve( Y.doccirrus.jsonrpc.api.mmi.getPackagesDetails( {
                    query: {
                        pznList: [config.pzn]
                    }
                } ) );
            } else {
                promise = Promise.resolve();
            }
            return promise.then( function( response ) {
                var selectedPackage = response && response.data && response.data[0];
                config.selected = selectedPackage;
                return Promise.resolve( Y.doccirrus.jsonrpc.api.jade.renderFile( {path: 'InCaseMojit/views/pricecomparison'} ) );
            } ).then( function( response ) {
                config.markup = response.data;
                show( config );
            } ).catch( function( err ) {
                Y.log( 'could not load template ' + err, 'error', NAME );
            } );
        }
    };

}, '0.0.1', {
    requires: [
        'oop',
        'DCWindow',
        'promise',
        'MedicationPriceComparisonModel'
    ]
} );




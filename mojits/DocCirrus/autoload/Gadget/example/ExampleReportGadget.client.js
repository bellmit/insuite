/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'ExampleReportGadget', function( Y, NAME ) {
    'use strict';
    /**
     * @module ExampleReportGadget
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        i18n = Y.doccirrus.i18n,
        // ignoreDependencies = ko.ignoreDependencies,

        getObject = Y.doccirrus.commonutils.getObject,
        // i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        // PatientGadget = KoViewModel.getConstructor( 'PatientGadget' ),
        GadgetBase = KoViewModel.getConstructor( 'GadgetBase' ),

        GADGET = Y.doccirrus.gadget,
        GADGET_CONST = GADGET.constants,
        TPL_PATH_EXAMPLE = GADGET_CONST.paths.TPL_EXAMPLE,

        InSightTableDisplayViewModel = KoViewModel.getConstructor( 'InSightTableDisplayViewModel' ),
        PredefinedTableViewModel = KoViewModel.getConstructor( 'PredefinedTableViewModel' ),

        inSightPresetList = [],
        inSightOwnList = [];


    /**
     * @constructor
     * @class ExampleReportGadget
     * @extends PatientGadgetConfigurableTableBase
     */
    function ExampleReportGadget() {
        ExampleReportGadget.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ExampleReportGadget, GadgetBase, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self._initExampleReportGadget();
        },
        /** @private */
        destructor: function() {
            // var
            //     self = this;

        },
        /**
         * If this Gadget is editable
         * @property editable
         * @type {Boolean}
         * @default true
         * @for ExampleEditableGadget
         */
        editable: true,
        _initExampleReportGadget: function() {
            var
                self = this;

            self.exmapleReportI18n = i18n( 'ExampleGadget.ExampleReportGadget.i18n' );

            self.gadgetConfig = {
                insightConfigId: ko.observable(),
                reportType: ko.observable(),
                containerName: 'patientGadget'
            };

            self.tableConfig = {};
            self.tableInstanceReady = ko.observable(false);
            self.tableInstance = ko.observable(null);

            self.presetList = ko.observableArray();
            self.ownList = ko.observableArray();

            // self.gadgetConfig.insightConfigId.subscribe(function(newId) {
            //     console.log('new id', newId);
            //     self.reloadTable();
            // });

            Promise.all([
                self.fetchInSightConfigs('predefined'),
                self.fetchInSightConfigs('own')
            ]).then(function(values) {
                self.presetList(values[0].data);
                self.ownList(values[1].data);

                inSightPresetList = values[0].data;
                inSightOwnList = values[1].data;

                self._initModelConfig();
            });
        },
        getConfigData: function() {
            var insightId = this.gadgetConfig.insightConfigId(),
                query = {
                    noBlocking: true,
                    insightConfigId: insightId
                };
            return Y.doccirrus.jsonrpc.api.insight2.getOne(query);
        },
        initTable: function() {
            var self = this,
                conf = self.tableConfig,
                instance;

            conf.displayMode = 'readOnly';

            if (conf.predefined) {
                instance = new PredefinedTableViewModel(conf);
            } else {
                instance = new InSightTableDisplayViewModel(conf);
            }

            self.tableInstance(instance);
            self.tableInstanceReady(true);
        },
        fetchInSightConfigs: function(type) {
            var query = {
                noBlocking: true,
                query: {},
                sort: {
                    csvFilename: 1
                }
            };

            if (type === 'predefined' && this.gadgetConfig.containerName) {
                query.query.predefined = true;
                query.query.container = {
                    $in: [this.gadgetConfig.containerName]
                };
            } else {
                query.query.predefined = {$ne: true};
            }

            return Y.doccirrus.jsonrpc.api.insight2.read(query);
        },
        reloadTable: function() {
            var self = this;

            self.getConfigData().then(function(res) {
                self.tableConfig = res.data;
                self.initTable();
            }, function() {
                Y.log('Cannot load inSight configuration.', 'err', NAME);
            });
        },
        _initModelConfig: function() {
            var
                self = this,
                model = self.get( 'gadgetModel' );

            /** Update Observables from config **/
            self.addDisposable( ko.computed( function() {
                var
                    modelConfig = unwrap( model.config ),
                    insightConfigId = getObject( 'insightConfigId', modelConfig ),
                    reportType = getObject( 'reportType', modelConfig );

                self.gadgetConfig.insightConfigId( insightConfigId );
                self.gadgetConfig.reportType( reportType );

                self.reloadTable();
            } ) );
        }
    }, {
        NAME: 'ExampleReportGadget',
        ATTRS: {
            editTemplate: {
                valueFn: function() {
                    return Y.doccirrus.jsonrpc.api.jade
                        .renderFile( {noBlocking: true, path: TPL_PATH_EXAMPLE + 'ExampleReportGadgetConfigDialog'} )
                        .then( function( response ) {
                            return response.data;
                        } );
                }
            },
            editBindings: {
                getter: function() {

                    var self = this,
                        model = self.get( 'gadgetModel' ),
                        modelConfig = unwrap( model.config ),
                        bindings = {};

                    bindings.presetList = ko.observable( inSightPresetList );
                    bindings.ownList = ko.observable( inSightOwnList );

                    bindings.presetId = ko.observable( getObject( 'presetId', modelConfig ) );
                    bindings.ownId = ko.observable( getObject( 'ownId', modelConfig ) );
                    bindings.reportTypes = ko.observableArray([
                        {label: 'Predefined', value: 'predefined'},
                        {label: 'My reports', value: 'own'}
                    ]);
                    bindings.reportType = ko.observable( getObject( 'reportType', modelConfig ) );


                    bindings.toJSON = function() {
                        var result = {};

                        result.reportType = peek(bindings.reportType);
                        result.presetId = peek(bindings.presetId);
                        result.ownId = peek(bindings.ownId);
                        result.insightConfigId = peek(result.reportType === 'predefined' ? bindings.presetId : bindings.ownId);

                        return result;
                    };

                    return bindings;
                }
            }
        }
    } );

    KoViewModel.registerConstructor( ExampleReportGadget );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'PatientGadget',

        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'dccommonutils',
        'dccommunication-client',
        'InSightTableDisplayViewModel',
        'PredefinedTableViewModel'
    ]
} );

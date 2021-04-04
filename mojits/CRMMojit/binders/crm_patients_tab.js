/**
 * User: pi
 * Date: 13/05/15  16:18
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global fun:true, ko, moment */
/*exported fun*/
fun = function _fn(Y, NAME) {
    'use strict';

    var patientListModel,
        i18n = Y.doccirrus.i18n,
        CONTACT = i18n('InCaseMojit.patient_browserJS.placeholder.CONTACT'),
        FIRSTNAME = i18n('person-schema.Person_T.firstname.i18n'),
        REGISTERED = i18n('CRMMojit.crm_companies_tabJS.title.REGISTERED'),
        ACTIVE_STATUS = i18n('customer-schema.base.activeState.i18n'),
        LASTNAME = i18n('person-schema.Person_T.lastname.i18n'),
        DELETE = i18n('general.button.DELETE'),
        SELECT_PATIENT = i18n('CRMMojit.crm_patients_tab.message.SELECT_PATIENT'),
        PATIENT_DELETE_SUCCESS = i18n('CRMMojit.crm_patients_tab.message.PATIENT_DELETE_SUCCESS'),
        PATIENT_DELETE_FAIL = i18n('CRMMojit.crm_patients_tab.message.PATIENT_DELETE_FAIL'),
        PATIENT_DELETE_CONFIRM = i18n('CRMMojit.crm_patients_tab.message.PATIENT_DELETE_CONFIRM'),
        KoUI = Y.doccirrus.KoUI,
        KoViewModel = Y.doccirrus.KoViewModel,
        KoComponentManager = KoUI.KoComponentManager;

    function PatientListModel() {
        PatientListModel.superclass.constructor.apply(this, arguments);
    }

    Y.extend(PatientListModel, KoViewModel.getBase(), {
            initializer: function initializer(config) {
                this.config = config;
                this.initPatientsTable();
            },
            initPatientsTable: function() {
                var self = this;
                self.patientToDeleteId = ko.observable(self.config.patientToDeleteId);
                self.config.patientToDeleteId = null;

                // Filter the patient to be deleted,
                self.myComputed = ko.computed(function () {
                    if (self.patientToDeleteId() && Y.doccirrus.comctlLib.isObjectId(self.patientToDeleteId())) {
                        return {query: {_id: self.patientToDeleteId()}};
                    } else {
                        return {};
                    }
                });
                self.patientsKoTable = KoComponentManager.createComponent({
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'CRMMojit-PatientsTab-patientsKoTable',
                        states: ['limit'],
                        fillRowsToLimit: false,
                        remote: true,
                        rowPopover: false,
                        proxy: Y.doccirrus.jsonrpc.api.contact.getPatient,
                        baseParams: self.myComputed,
                        columns: [
                            {
                                componentType: 'KoTableColumnCheckbox',
                                forPropertyName: 'checked',
                                label: ''
                            },
                            {
                                forPropertyName: 'firstname',
                                label: FIRSTNAME,
                                title: FIRSTNAME,
                                isFilterable: true,
                                width: '20%'
                            },
                            {
                                forPropertyName: 'lastname',
                                label: LASTNAME,
                                title: LASTNAME,
                                isFilterable: true,
                                width: '20%'
                            },
                            {
                                forPropertyName: 'communications.0.value',
                                label: CONTACT,
                                title: CONTACT,
                                width: '25%',
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'status',
                                label: REGISTERED,
                                title: REGISTERED,
                                width: '10%',
                                renderer: function (meta) {
                                    var value = meta.row._id;
                                    return moment(Y.doccirrus.commonutils.dateFromObjectId(value)).format('DD.MM.YYYY');
                                }
                            },
                            {
                                forPropertyName: 'activeState',
                                label: ACTIVE_STATUS,
                                title: ACTIVE_STATUS,
                                width: '10%',
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                renderer: function (meta) {
                                    var status = meta.value,
                                        icon = (status) ? '<i class="fa fa-check"></i>' : '<i class="fa fa-times"></i>';
                                    return icon;

                                }
                            },
                            {
                                forPropertyName: '_id',
                                label: 'ID',
                                title: 'ID',
                                width: '15%',
                                isSortable: true
                            }
                        ]
                    }
                });
                self.tableDataListener = self.patientsKoTable.data.subscribe(function (newValue) {
                    if (self.config.patientToDeleteId) {
                        if (newValue.length === 0) {
                            Y.doccirrus.DCWindow.notice({
                                type: 'ERROR',
                                message: "Patient has already been deleted or doesn't exist"
                            });
                        }
                    }
                });
                self.deletePatientBtn = KoComponentManager.createComponent({
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'deletePatient',
                        text: DELETE,
                        click: function () {
                            self.handleDeletion();
                        }
                    }
                });


            },
            deletePatient: function(patientId, callback) {

                if (undefined === patientId) {
                    Y.log('Can not delete patient. Patient id is missing.', 'error', NAME);
                    return callback('patient id is missing.');
                }

                Y.doccirrus.jsonrpc.api.contact.deletePatient({
                    query: {
                        _id: patientId
                    }
                }).done(function () {
                    callback();
                }).fail(function (error) {
                    Y.log('Can not delete patient with id: ' + patientId + '. Error: ' + JSON.stringify(error), 'error', NAME);
                    callback(error);
                });
            },
            handleDeletion: function() {
                var
                    self = this,
                    selectedPatients = self.patientsKoTable.getComponentColumnCheckbox().checked();

                function deleteAction() {
                    self.config.patientToDeleteId = null;
                    self.patientsKoTable.masked(true);
                    self.deletePatient(selectedPatients[0]._id, function (err) {
                            self.patientsKoTable.masked(false);
                            if (err) {
                                Y.doccirrus.DCWindow.notice({
                                    type: 'error',
                                    message: PATIENT_DELETE_FAIL + ' ' + err.message
                                });
                            } else {
                                location.hash = "/patients_tab";

                                self.patientsKoTable.proxy = Y.doccirrus.jsonrpc.api.contact.getPatient;
                                self.patientsKoTable.reload();
                                Y.doccirrus.DCWindow.notice({
                                    type: 'success',
                                    message: PATIENT_DELETE_SUCCESS
                                });
                            }
                        }
                    );
                }

                if (1 === selectedPatients.length) {
                    Y.doccirrus.DCWindow.notice({
                        type: 'info',
                        message: PATIENT_DELETE_CONFIRM,
                        window: {
                            buttons: {
                                footer: [
                                    Y.doccirrus.DCWindow.getButton('CANCEL'),
                                    Y.doccirrus.DCWindow.getButton('OK', {
                                        isDefault: true,
                                        action: function () {
                                            deleteAction();
                                            this.close();
                                        }
                                    })
                                ]
                            }
                        }

                    });
                } else {
                    Y.doccirrus.DCWindow.notice({
                        type: 'info',
                        message: SELECT_PATIENT
                    });
                }

            }
        }, {
            NAME: 'PatientListModel'
        }
    );

    return {
        registerNode: function (node, key, options) {
            patientListModel = new PatientListModel({
                patientToDeleteId: options.pageData.patientToDeleteId || null
            });
            ko.applyBindings(patientListModel, document.querySelector('#patientList'));
        },
        deregisterNode: function () {
            if (patientListModel && patientListModel.destructor) {
                patientListModel.destructor();
            }

        }
    };
};
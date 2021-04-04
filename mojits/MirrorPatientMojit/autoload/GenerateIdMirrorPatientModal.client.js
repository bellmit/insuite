/*global YUI, ko, $ */

'use strict';

YUI.add('dcgenerateidmirrorpatient', function (Y/*,NAME*/) {

        var
            i18n = Y.doccirrus.i18n;

        Y.namespace('doccirrus.modals').generateIdMirrorPatient = {
            show: function (settings, callback) {

                function showDialogForPatient(patient) {
                    var node = Y.Node.create('<div></div>'),
                        modal = null,
                        micro = new Y.Template(),
                        dialogModel = {
                            patient: micro.render('<%=data.lastname%>, <%=data.firstname%> (<%=data.kbvDob%>)', patient),
                            practice: patient.prcCoName,
                            extPatientId: ko.observable(Y.doccirrus.schemas.patient.getGHDPartnerId(patient)),
                            genNewExtPatientId: function () {
                                this.extPatientId((new Y.doccirrus.mongo.ObjectId()).toString());
                            }
                        },
                        buttons = [
                            Y.doccirrus.DCWindow.getButton('CANCEL'),
                            Y.doccirrus.DCWindow.getButton('SAVE', {
                                isDefault: true,
                                action: function (e) {
                                    patient.partnerIds.forEach(function (partner) {
                                        if (partner.partnerId === Y.doccirrus.schemas.patient.DISPATCHER.INCARE) {
                                            partner.patientId = dialogModel.extPatientId();
                                        }
                                    });
                                    Y.doccirrus.jsonrpc.api.mirrorpatient
                                        .update({
                                            query: {
                                                _id: patient._id
                                            },
                                            data: patient,
                                            fields: ['partnerIds']
                                        })
                                        .done(function () {
                                            modal.close(e);
                                            if (callback && Y.Lang.isFunction(callback)) {
                                                callback();
                                            }
                                        })
                                        .fail(function (error) {
                                            Y.Array.invoke(Y.doccirrus.errorTable.getErrorsFromResponse(error), 'display');
                                        });
                                }
                            })
                        ];

                    YUI.dcJadeRepository.loadNodeFromTemplate(
                        'patient_id_dialog',
                        'MirrorPatientMojit',
                        {},
                        node,
                        function templateLoaded() {
                            modal = new Y.doccirrus.DCWindow({// jshint ignore:line
                                id: 'setIdModalDilaog',
                                className: 'DCWindow-tab_roles',
                                bodyContent: node,
                                title: i18n('MirrorPatientMojit.tab_patients.generate_id.dialog.title'),
                                width: Y.doccirrus.DCWindow.SIZE_LARGE,
                                height: Y.doccirrus.DCWindow.SIZE_SMALL,
                                minHeight: Y.doccirrus.DCWindow.SIZE_SMALL,
                                minWidth: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                                centered: true,
                                modal: true,
                                render: document.body,
                                buttons: {
                                    header: ['close'],
                                    footer: buttons
                                },
                                after: {
                                    render: onRender
                                }
                            });

                            dialogModel.labelMainI18n = i18n( 'MirrorPatientMojit.tab_patients.generate_id.dialog.label.main' );
                            dialogModel.labelPatientI18n = i18n( 'MirrorPatientMojit.tab_patients.generate_id.dialog.label.patient' );
                            dialogModel.labelPracticeI18n = i18n( 'MirrorPatientMojit.tab_patients.generate_id.dialog.label.practice' );
                            dialogModel.labelIdI18n = i18n( 'MirrorPatientMojit.tab_patients.generate_id.dialog.label.id' );
                            dialogModel.buttonGenerateI18n = i18n( 'MirrorPatientMojit.tab_patients.generate_id.dialog.button.GENERATE' );

                            function onRender(  ) {
                                var modalMask = $('.modal-backdrop.DCWindow-modal'),
                                    modal = $('#setIdModalDilaog');
                                if(modalMask && modalMask[0]){
                                    modalMask[0].style.zIndex = 4000;
                                }
                                if(modal && modal[0]){
                                    modal[0].style.zIndex = 4001;
                                }

                            }

                            ko.applyBindings(dialogModel, node.getDOMNode());
                        });
                }


                if (settings.patient) {
                    showDialogForPatient(settings.patient);
                } else if (settings.patientId) {
                    Y.doccirrus.jsonrpc.api.mirrorpatient.read({
                        query: {_id: settings.patientId}
                    }).then(function (response) {
                        showDialogForPatient(response.data[0]);
                    });
                }
            }
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'doccirrus',
            'KoViewModel',
            'template'
        ]
    }
);
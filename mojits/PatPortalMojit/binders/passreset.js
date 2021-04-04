/**
 * User: fudge
 * Date: 16.10.13  11:56
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
//TRANSLATION INCOMPLETE!! MOJ-3201
/*global YUI, $ */
YUI.add( 'PassResetBinder', function( Y, NAME ) {
    "use strict";

    // ----- helper:start

    function checkPW(pw1, pw2) {
        var
            sane = (pw1.val() &&  pw1.val() === pw2.val()),
            strength = Y.doccirrus.authpub.checkPwStrength(pw1.val());

        return {
            sane: sane,
            strong: strength >= 1
        };
    }

    // ----- helper:end
    /**
     * Constructor for the patientBinderIndex class.
     *
     * @class patientBinderIndex
     * @constructor
     */
    Y.namespace( 'mojito.binders' )[NAME] = {

        /** using client side Jade so we need to announce who we are. */
        jaderef: 'PatPortalMojit',

        /**
         * Binder initialization method, invoked after all binders on the page
         * have been constructed.
         */
        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
        },

        /**
         * The binder method, invoked to allow the mojit to attach DOM event
         * handlers.
         *
         * @param node {Node} The DOM node to which this mojit is attached.
         */
        bind: function( node ) {
            var
                pw1 = $('#pw1' ),
                pw2 = $('#pw2' ),
                data = $('#data' );

            if (data.attr('error')) {
                Y.doccirrus.utils.loadingDialog('error', data.attr('error'));
            }

            $('#doSubmBtn').on('click submit', function() {
                var check =
                        checkPW(pw1, pw2 ),
                        user = data.attr('user'),
                        token = data.attr('token');

                if (check.sane && check.strong && user && token) {
                    Y.doccirrus.ajax.send({
                        url: Y.doccirrus.infras.getPublicURL('/r/changePWPatient/?action=changePWPatient'),
                        method: 'post',
                        dataType: 'json',
                        data: {
                            user: user,
                            token: token,
                            value: Y.doccirrus.authpub.getPasswordHash(pw1.val())
                        },
                        complete: function(xhr) {
                            if (xhr) {
                                switch (xhr.status) {
                                    case 200:
                                        Y.doccirrus.utils.loadingDialog('success', 'Ihr Passwort wurde erfolgreich geändert.');
                                        break;
                                    default:
                                        Y.doccirrus.utils.loadingDialog('error', 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
                                }
                            }
                        }
                    });
                } else {
                    pw1.closest('.control-group').addClass('has-error');
                    pw2.closest('.control-group').addClass('has-error');

                    if (!check.sane) {
                        Y.doccirrus.utils.loadingDialog('error', 'Die Passwörter stimmen nicht überein!');
                    } else if (!check.strong) {
                        Y.doccirrus.utils.loadingDialog('error', 'Ihr neues Passwort ist zu schwach. Bitte wählen Sie ein besseres!');
                    }
                }
            });

            Y.doccirrus.utils.isNodeDCValid(node);
            Y.mojito.binders.PatientAlertBinderMain.bind(node, true);
        }
    };
}, '0.0.1',
{requires: [
    'event-mouseenter',
    'mojito-client',
    'mojito-rest-lib',
    'patientalert-schema',
    'dcutils',
    'dcauthpub',
    'dcschemaloader',
    'dcvalidations',
    'slider-base',
    'PatientAlertBinderMain'
]}
);

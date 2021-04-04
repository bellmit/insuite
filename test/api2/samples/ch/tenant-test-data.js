'use strict';

let company = {
        communications: [],
        coname: 'TestData',
        cotype: 'ARZTPRAXIS',
        addresses: [
            {
                street: 'Strasse',
                houseno: '',
                zip: '11111',
                city: 'Stadt',
                kind: 'OFFICIAL',
                country: 'Deutschland',
                countryCode: 'D',
                addon: ''
            }],
        customerNo: null,
        prodServices: [
            {ps: 'NEWSLETTER', config: []},
            {ps: 'VPRC', config: [{"key": "isTemplate", "value": false}]}],
        licenseScope: [
            {
                specialModules: [],
                baseSystemLevel: 'enterprise',
                baseServices: ["inCase", "inTime", "inForm", "inVoice", "inPort"],
                additionalServices: ["inTouch", "inScribe", "inScan", "inSight", "inOut", "inBackup"],
                supportLevel: 'premium'
            }],
        tenants: []
    },
    contact = {
        confirmed: false,
        firstname: 'ContactName',
        dob: '1995-12-08T23:00:00.000Z',
        title: '',
        nameaffix: '',
        middlename: '',
        fk3120: '',
        lastname: 'ContactLastName',
        accounts: [],
        communications: [
            {
                type: 'EMAILJOB',
                value: 'email@example.com',
                signaling: true,
                confirmed: false,
                confirmNeeded: false
            }],
        addresses: [],
        talk: 'MR'
    },
    supportContact = {
        baseContactType: 'SUPPORT',
        addresses: [],
        communications: [],
        talk: 'MR',
        title: '',
        firstname: 'Vorname',
        lastname: 'Nachname',
        institutionType: 'OTHER',
        companyName: 'TestFirma'
    },

    data = {
        company: company,
        contact: contact,
        supportContact: supportContact,
        automaticCustomerNo: true
    },
    putParams = {
        data: data
    };

module.exports = {
    getData: function() {
        return JSON.parse( JSON.stringify( data ) );
    },
    putParams: putParams
};

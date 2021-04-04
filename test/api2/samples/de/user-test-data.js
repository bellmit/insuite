'use strict';
var
    employee = {
        "_id": "56f5382c37644678aa923d92",
        "officialNo": "333333333",
        "addresses": [],
        "roles": [],
        "fk3120": "",
        "specialisationText": "",
        "communications": [
            {
                "type": "EMAILJOB",
                "preferred": false,
                "value": "dev-rw9@doc-cirrus.com",
                "_id": "53b80cb8607b424279a3018c"
            }
        ],
        "employeeNo": "2",
        "firstname": "Frederike_test",
        "lastname": "Bein_test",
        "locations": [
            {
                "_id": "000000000000000000000001",
                "locname": "Praxis Dr. med. Herbert Topp-Glücklich"
            }
        ],
        "middlename": "",
        "nameaffix": "",
        "initials": "FB",
        "specialities": [
            "INTERNAL"
        ],
        "talk": "MS",
        "title": "",
        "type": "PHYSICIAN",
        "status": "ACTIVE",
        "username": 'test' + Math.floor((Math.random(1000)*1000)),
        "memberOf": [ { "group" : "ADMIN" } ],
        "arztstempel": "",
        "asvMembershipType": "FULL",
        "asvSpecializations": []
    },
    putParams = {
        data: employee
    },
    getParams = JSON.parse( JSON.stringify( employee ) );

//delete getParams.username;
//delete getParams.memberOf;

module.exports = {
    getData: function() {

        return JSON.parse( JSON.stringify( employee ) );
    },
    putParams: putParams,
    getParams: getParams
};
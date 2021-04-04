
var
    employee = {
        "_id" : "56f5382c37644678aa923d92",
        "title" : "Dr.",
        "firstname" : "Lily",
        "nameaffix" : "",
        "middlename" : "",
        "lastname" : "Frey",
        "specialities" : [],
        "specialisationText" : "",
        "asvSpecializations" : [],
        "asvMembershipType" : "FULL",
        "arztstempel" : "",
        "qualiDignities" : [
            "0000"
        ],
        "quantiDignities" : [
            "FMH08"
        ],
        "roles" : [
            "Empfang"
        ],
        "bsnrs" : [],
        "expertise" : [],
        "ownZsrNumber" : true,
        "communications" : [
            {
                "signaling" : true,
                "confirmed" : false,
                "confirmNeeded" : false,
                "_id" : "5e451db4320f8b7f1ae72d37",
                "type" : "EMAILJOB",
                "preferred" : false,
                "value" : "lily.example@doc-cirrus.com"
            }
        ],
        "addresses" : [],
        "type" : "PHYSICIAN",
        "department" : "XYZ",
        "employeeNo" : "12345",
        "locations" : [
            {
                "_id" : "54eb41b878382da863181d3b",
                "locname" : "Klinikum Eins"
            }
        ],
        "talk" : "MS",
        "workDescription" : "**Jobbezeichnung**",
        "username" : "Musterärztin",
        "initials" : "AI",
        "memberOf" : [
            {
                "_id" : "5e451db3320f8b7f1ae72d35",
                "group" : "USER"
            },
            {
                "_id" : "5edf55b88c951c0d071286a6",
                "group" : "PHYSICIAN"
            }
        ],
        "officialNo" : "",
        "glnNumber" : "1234567890112",
        "zsrNumber" : "Z12345",
        "status" : "ACTIVE"
    },

    putParams = {
        data: employee
    },
    getParams = JSON.parse( JSON.stringify( employee ) );

module.exports = {
    getData: function() {
        return JSON.parse( JSON.stringify( employee ) );
    },
    putParams: putParams,
    getParams: getParams
};



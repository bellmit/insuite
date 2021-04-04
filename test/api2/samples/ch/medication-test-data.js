
var
    medication = {
        "_id": "57456770383c1ee7b09ec19d",
        "employeeName": "Dr.1 admin2, prac2",
        "actType": "MEDICATION",
        "adherence": true,
        "timestamp": new Date(),
        "patientId": "54be764fc404c1d77a286d4d",
        "employeeId": "56f5382c37644678aa923d92",
        //"locationId": "000000000000000000000001",
        "locationId": "54eb41b878382da863181d3b",
        "caseFolderId": "56fa30e6b641255602e1b576",
        "comment": "API2TestingActivity",
        "code" : "7611711101424",
        "phGTIN" : "7611711101424",
        "phSalesStatus" : "ONMARKET",
        "phNLabel": "unit test Medication",
        "phPZN" : "852921",
        "prdNo" : "27491",
        "phUnit" : "Paar",
        "phCompany" : "10825",
        "insuranceCode" : "13",
        "paidByInsurance" : false,
        "supplyCategory" : "",
        "phAtc" : null,
        "phForm" : null,
        "insuranceDescription" : "Mittel- und Gegenständeliste (MiGeL)",
        "catalogShort" : "HCI",
        "phIngr" : []
    },
    putParams = {
        data: medication
    };

module.exports = {
    getData: function() {
        return medication;
    },
    putParams: putParams
};


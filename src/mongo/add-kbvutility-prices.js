/*global db:true, ObjectId, print, printjson, ISODate*/

const from = ISODate("2018-10-01T00:00:00.000Z");
const to =ISODate("2019-01-01T00:00:00.000Z");
const locationCache = {};
function getLocation(locationId) {
	if(!locationCache[locationId.str]){
		locationCache[locationId.str] = db.locations.findOne({_id: locationId}, {kv: 1});
	}
	return locationCache[locationId.str];
}
const patientCache = {};
function getPatient(patientId) {
	if(!patientCache[patientId]){
		patientCache[patientId] = db.patients.findOne({_id: ObjectId(patientId)});
	}
	return patientCache[patientId];
}
const caseFolderCache = {};
function getCaseFolder(caseFolderId) {
	if(!caseFolderCache[caseFolderId]){
		caseFolderCache[caseFolderId] = db.casefolders.findOne({_id: ObjectId(caseFolderId)});
	}
	return caseFolderCache[caseFolderId];
}
function getSerialNo(vknr){
	var vknrLen = vknr.length;
    return vknr.substring( vknrLen - 3, vknrLen );
}

function find( name, utPrices ) {
    var result;
    utPrices.some( function( utPrice ) {
        if( name === utPrice.utilityName ) {
            result = utPrice;
            return true;
        }
    } );
    return result;
}

const query = {actType: 'KBVUTILITY', status: {$in: ['VALID', 'APPROVED']}, timestamp: {$gte: from, $lt: to}};
let updateCount = 0;
print(`updating ${db.activities.count(query)} activities`);
db.activities.find(query).forEach( act => {
	print(`updating KBVUTILITY: ${act._id.str}`);
	const updateData = {utRemedy1List: act.utRemedy1List || [], utRemedy2List: act.utRemedy2List || []};
	const verordnungsmenge = act.u_extra && act.u_extra.entry && act.u_extra.entry.heilmittelverordnung && act.u_extra.entry.heilmittelverordnung.verordnungsmenge;
	const type = act.utPrescriptionType;
	let seasons = verordnungsmenge && (type === 'FOLLOWING' ? verordnungsmenge.folgeverordnungsmenge : verordnungsmenge.erstverordnungsmenge );

	if(seasons){
		print(`found seasons: ${seasons}`);
		if(act.utRemedy1List.length){
			updateData.utRemedy1Seasons = +seasons;
		}
		if(act.utRemedy2List.length){
			updateData.utRemedy2Seasons = +seasons;
		}
	} else {
		print(`found NO seasons`);
	}

	const location = getLocation(act.locationId);
	if(!location){
		print(`WARN: could not get location: ${act.locationId.str}`);
		return;
	}

	const patient = getPatient(act.patientId);
	if(!patient){
		print(`WARN: could not get patient: ${act.patientId}`);
		return;
	}

	const caseFolder = getCaseFolder(act.caseFolderId);
	if(!caseFolder){
		print(`WARN: could not get caseFolderId: ${act.caseFolderId}`);
		return;
	}

	const utilityNames = act.utRemedy1List.map( ut => ut.name ).concat(act.utRemedy2List.map( ut => ut.name )).filter(Boolean);
	const insuranceType = caseFolder.type;
	const kv = location.kv;
	const insurance = patient.insuranceStatus.find( ins => ins.type === insuranceType);

	if(!utilityNames.length){
		print(`WARN: did not find any utility name`);
		return;
	}

	if(caseFolder.type === 'PUBLIC' && !insurance){
		print(`WARN: did not find insuranceType ${insuranceType} on patient ${act.patientId}`);
		return;
	}
	if(caseFolder.type === 'PUBLIC' && !insurance.insuranceGrpId){
		print(`WARN: did not find VKNR on patient ${act.patientId}`);
		return;
	}

	if(caseFolder.type === 'PUBLIC' && !kv){
		print(`WARN: PUBLIC KBVUTILITY needs location with kv: ${act.locationId.str}`);
		return;
	}

	const priceQuery = {utilityName: {$in: utilityNames}, insuranceType, kv, active: true};
	let insurancegroups, insuranceGroupIds;
	if(insuranceType === 'PUBLIC'){
		const serialNo = getSerialNo(insurance.insuranceGrpId);
		insurancegroups = db.insurancegroups.find({'items.serialNo': serialNo}).toArray();
		print(`found ${insurancegroups.length} insuarnceGroups for serialNo ${serialNo}`);
		insuranceGroupIds = insurancegroups.map(ig => ig._id.str);
        priceQuery['prices.insuranceGroupId'] = {$in: insuranceGroupIds};
	}
	print(JSON.stringify(priceQuery));
	const prices = db.kbvutilityprices.find(priceQuery).toArray();
	print(`found ${prices.length} ${caseFolder.type} prices for priceQuery ${JSON.stringify(priceQuery)}`);

	if(insuranceType === 'PUBLIC'){
		prices.forEach( priceConfig => {
            const priceObj = priceConfig.prices.find( price => insuranceGroupIds.includes( price.insuranceGroupId ) );
            priceConfig.price = priceObj && (priceObj.price === 0 || priceObj.price) && priceObj.price || null;
        } );
	}
	updateData.utRemedy1List.concat( updateData.utRemedy2List ).forEach( function( utility ) {
		if(seasons){
			utility.seasons = +seasons;
		}
        var utPrice = find( utility.name, prices );
        if( utPrice ) {
            utility.price = utPrice.price;
        }
    } );

    updateCount++;

    printjson(updateData);
    printjson(db.activities.update({_id: act._id}, {$set: updateData}));
});
print(`updated ${updateCount} activities`);

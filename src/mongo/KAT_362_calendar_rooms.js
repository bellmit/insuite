/* global db:true */
print( '==== KAT-362: calendar rooms ====' );
db = db.getSiblingDB( "0" );
let count = 0;
let requiredDate = new Date();
requiredDate.setDate(requiredDate.getDate() + 3);
const schedulesTotal = db.schedules.find( { start: { $gte: new Date(), $lte: requiredDate }, roomId: { $exists: true } } ).count();
db.schedules.find( { start: { $gte: new Date(), $lte: requiredDate }, roomId: { $exists: true } } ).forEach( schedule => {
    const room = db.rooms.findOne({ _id: ObjectId(schedule.roomId) });
    print('Appointment with title - ' + schedule.title + ', description - ' + schedule.userDescr + ', details - '
          + schedule.details + ' is in room, with ID - ' + schedule.roomId + ', room name - ' + room.name);
    count++;
} );

print( '==== KAT-362: found ' + count + ' appointments, in next 3 days with existing roomId.' );

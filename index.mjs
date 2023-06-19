import sql from "mssql";

//let region = process.env.AWS_REGION

// const config = {
//   port: parseInt(1433, 10),
//   server: "clubspeed.csesaa1403zr.us-east-1.rds.amazonaws.com",
//   user: "derek",                // api.dev
//   password: "P@$$w0rd1Derek",   // D3v@p1T3$$t1ng
//   database: "ClubspeedV9_Test",
//   stream: false,
//   options: {
//     trustedConnection: true,
//     encrypt: true,
//     enableArithAbort: true,
//     trustServerCertificate: true,
//   },
// };

const config = {
  port: parseInt(process.env.db_port, 10),
  server: process.env.db_server,
  user: process.env.db_user,                // api.dev
  password: process.env.db_password,        // D3v@p1T3$$t1ng
  database: process.env.db_name,
  stream: false,
  options: {
    trustedConnection: true,
    encrypt: true,
    enableArithAbort: true,
    trustServerCertificate: true,
  },
};


export const handler = async(event) => {
  // const response1 = {
  //   body: event,
  // };
  // return response1;
  
  // Mark beginning of query time
  const startTime = new Date().toISOString().replace('T', ' ').replace('Z', '');

  var statusCode = 200;
  var resultSize = 0;

  // Query customer booking info from database
  const result = await GetBookingEventInformation(event);

  // Mark end of query time
  const endTime = new Date().toISOString().replace('T', ' ').replace('Z', '');

  // Size of booking query result
  resultSize = Buffer.byteLength(JSON.stringify(result))

  event['PacketSize'] = resultSize;
  event['StartTime'] = startTime;
  event['EndTime'] = endTime;
  
  // Log details of API Request
  const logResult = await UpdateClubspeedAPILogs(event);

  // Return correct status codes if query failed
  if (result['recordset'] === undefined) {
    statusCode = 404;
  }

  // Build API response
  const responser = {
    statusCode: statusCode,
    body: JSON.parse(JSON.stringify(result)),
  };
  return response;

  // // Build API response
  // const response = {
  //   statusCode: statusCode,
  //   body: JSON.stringify({
  //       "bookingInfo": result,
  //       "size": resultSize,
  //   }),
  // };

  // // console.log(response);

  // return response;
  
};


export const GetBookingEventInformation = async(eventParams) => {
  var pool = await sql.connect(config);

  const result = await pool
    .request()
    .input("ClientId", sql.NVarChar, ("ClientId" in eventParams ? eventParams["ClientId"] : ''))
    .input("APIKey", sql.NVarChar, ("x-api-key" in eventParams["headers"] ? eventParams["headers"]["x-api-key"] : ''))
    .input("ConfirmationCode", sql.NVarChar, ("ConfirmationCode" in eventParams ? eventParams["ConfirmationCode"] : ''))
    .input("phone", sql.NVarChar, ("Phone" in eventParams ? eventParams["Phone"] : ''))
    .input("FirstName", sql.NVarChar, ("FirstName" in eventParams ? eventParams["FirstName"] : ''))
    .input("LastName", sql.NVarChar, ("LastName" in eventParams ? eventParams["LastName"] : ''))
    .input("Email", sql.NVarChar, ("Email" in eventParams ? eventParams["Email"] : ''))
    .execute("GetBookingEventInformation");

  // console.log(result);

  pool.close();

  return result;
  
}


export const UpdateClubspeedAPILogs = async(logevent) => {
  var pool = await sql.connect(config);
  const result = await pool
    .request()
    .input("ClientId", sql.NVarChar, ("ClientId" in logevent ? logevent["ClientId"] : ''))
    .input("Header", sql.NVarChar, ("HttpMethod" in logevent ? logevent["HttpMethod"] : ''))
    .input("Path", sql.NVarChar, ("Path" in logevent ? logevent["Path"] : ''))
    .input("PacketSize", sql.Int, ("PacketSize" in logevent ? logevent["PacketSize"] : 0))
    .input("StartTime", sql.DateTime, logevent["StartTime"])
    .input("EndTime", sql.DateTime, logevent["EndTime"])
    .execute("InsertClubspeedApiLogs");

  pool.close();

  return result;
}


//handler(myevent)
import sql from "mssql";

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

  // // Build API response
  // const response1 = {
  //   statusCode: 100,
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
  
  var recordSet = JSON.stringify({})

  // Return correct status codes if query failed
  if (result['recordset'] === undefined) {
    statusCode = 404;
  } else {
    recordSet = JSON.stringify(result['recordset'])
  }
  //JSON.parse(JSON.stringify(result))
  // Build API response
  const response = {
    statusCode: statusCode,
    body: JSON.parse(recordSet),
  };

  return response;
};


export const GetBookingEventInformation = async(eventParams) => {
  var pool = await sql.connect(config);
  //yyyy-mm-dd or mm-dd-yyyy
  if ("EventDate" in eventParams && String(eventParams["EventDate"]).length > 1) {
    var dateParts = eventParams["EventDate"].split("-");
    var year = '';
    var month = '';
    var day = '';
    var formattedDate = '';
    
    if (String(dateParts[2]).length >= 3) {
      year = dateParts[2];
      day = dateParts[1];
      month = dateParts[0];
    } else {
      year = dateParts[0];
      month = dateParts[1];
      day = dateParts[2];
    }

    formattedDate = year + "-" + month + "-" + day;
    
    eventParams["EventDate"] = formattedDate;
  }

  const result = await pool
    .request()
    .input("ClientId", sql.NVarChar, ("ClientId" in eventParams ? eventParams["ClientId"] : ''))
    .input("APIKey", sql.NVarChar, ("x-api-key" in eventParams["headers"] ? eventParams["headers"]["x-api-key"] : ''))
    .input("ConfirmationCode", sql.NVarChar, ("ConfirmationCode" in eventParams ? eventParams["ConfirmationCode"] : ''))
    .input("phone", sql.NVarChar, ("Phone" in eventParams ? eventParams["Phone"] : ''))
    .input("FirstName", sql.NVarChar, ("FirstName" in eventParams ? formatCustomerName(eventParams["FirstName"]) : ''))
    .input("LastName", sql.NVarChar, ("LastName" in eventParams ? formatCustomerName(eventParams["LastName"]) : ''))
    .input("Email", sql.NVarChar, ("Email" in eventParams ? eventParams["Email"] : ''))
    .input("EventDate", sql.NVarChar, ("EventDate" in eventParams ? eventParams["EventDate"] : ''))
    .execute("GetBookingEventInformation");

  // console.log(result);

  pool.close();

  return result;
  
}

export const formatCustomerName = (name) => {
  var formattedName = "";
  formattedName = name;
  formattedName.replace(/'/g, "''");
  
  return formattedName;
}


export const UpdateClubspeedAPILogs = async(logevent) => {
  var pool = await sql.connect(config);
  const result = await pool
    .request()
    .input("ClientId", sql.NVarChar, ("ClientId" in logevent ? logevent["ClientId"] : ''))
    .input("Header", sql.NVarChar, ("HttpMethod" in logevent ? logevent["HttpMethod"] : ''))
    .input("Path", sql.NVarChar, (("Path" in logevent && "headers" in logevent) ? logevent["headers"]["Host"] + logevent["Path"]: ''))
    .input("PacketSize", sql.Int, ("PacketSize" in logevent ? logevent["PacketSize"] : 0))
    .input("StartTime", sql.DateTime, logevent["StartTime"])
    .input("EndTime", sql.DateTime, logevent["EndTime"])
    .execute("InsertClubspeedApiLogs");

  pool.close();

  return result;
}


//handler(myevent)
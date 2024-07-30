var mysql = require('mysql2');

var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "1234",
    port:3306,
    database: "bicycle_track"
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");

//טבלת משתמשים
  var sql = `
  CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(255), 
    email VARCHAR(255), 
    password VARCHAR(255), 
    fitness_level VARCHAR(255), 
    max_slope VARCHAR(255)
  )
`;
con.query(sql, function (err) {
  if (err) throw err;
  console.log("Users Table created");
});


});